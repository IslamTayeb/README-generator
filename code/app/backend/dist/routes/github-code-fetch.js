"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = require("dotenv");
const generative_ai_1 = require("@google/generative-ai");
(0, dotenv_1.config)();
const router = express_1.default.Router();
// Initialize Gemini API
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
// Function to get the repository tree recursively
const fetchRepoTree = (owner, repo, accessToken) => __awaiter(void 0, void 0, void 0, function* () {
    const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`;
    console.log(`Fetching repository tree from URL: ${url}`);
    const response = yield axios_1.default.get(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    console.log(response.data.tree);
    return response.data.tree;
});
// Function to fetch specific file content
const fetchFileContent = (owner, repo, fileSha, accessToken) => __awaiter(void 0, void 0, void 0, function* () {
    const url = `https://api.github.com/repos/${owner}/${repo}/git/blobs/${fileSha}`;
    console.log(`Fetching content for file from URL: ${url}`);
    const response = yield axios_1.default.get(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3.raw',
        },
    });
    console.log(`Content fetched for SHA ${fileSha}:`, response.data.length, 'characters');
    return response.data;
});
// Function to convert Jupyter Notebook (.ipynb) files to markdown
const convertIpynbToMarkdown = (content) => {
    try {
        let notebook;
        // Handle content as an object or string
        if (typeof content === 'string') {
            notebook = JSON.parse(content);
        }
        else {
            notebook = content; // Assuming it's already parsed
        }
        let markdown = '# Jupyter Notebook Conversion\n';
        if (notebook.cells) {
            for (const cell of notebook.cells) {
                if (cell.cell_type === 'markdown') {
                    markdown += cell.source.join('') + '\n\n';
                }
                else if (cell.cell_type === 'code') {
                    markdown += '```python\n' + cell.source.join('') + '\n```\n\n';
                }
            }
        }
        else {
            markdown += 'Notebook format not recognized.\n';
        }
        return markdown;
    }
    catch (err) {
        console.error('Failed to convert .ipynb file:', err);
        return '# Error in converting notebook\n';
    }
};
// Function to determine if a file should be included
const shouldIncludeFile = (filePath, size) => {
    const ignoredExtensions = [
        '.pdf', '.csv', '.json', '.tsv', '.xls', '.xlsx',
        '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
        '.mp4', '.avi', '.mkv', '.mov', '.webm', '.wmv',
        '.mp3', '.wav', '.flac',
        '.log', '.DS_Store',
    ];
    const ignoredDirectories = ['node_modules/', 'dist/'];
    const maxFileSize = 10000000;
    if (ignoredExtensions.some(ext => filePath.endsWith(ext))) {
        console.log(`File excluded based on extension: ${filePath}`);
        return false;
    }
    if (ignoredDirectories.some(dir => filePath.includes(dir))) {
        console.log(`File excluded based on directory: ${filePath}`);
        return false;
    }
    if (size > maxFileSize) {
        console.log(`File excluded based on size (>10MB): ${filePath}`);
        return false;
    }
    if (filePath.includes('data') || filePath.includes('dataset')) {
        console.log(`File excluded based on data/dataset naming: ${filePath}`);
        return false;
    }
    return true;
};
// Optimized function to chunk content if it's too large
const chunkContent = (content, maxChunkSize = 15000) => {
    const chunks = [];
    let currentChunk = '';
    const lines = content.split('\n');
    for (const line of lines) {
        if ((currentChunk + line).length > maxChunkSize) {
            chunks.push(currentChunk);
            currentChunk = line;
        }
        else {
            currentChunk += (currentChunk ? '\n' : '') + line;
        }
    }
    if (currentChunk) {
        chunks.push(currentChunk);
    }
    console.log(`Content chunked into ${chunks.length} parts.`);
    return chunks;
};
// Combined route to fetch code from repository and generate README
router.post('/fetch-and-generate-readme', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        console.log('Request received for /fetch-and-generate-readme with repoUrl:', req.body.repoUrl);
        let repoUrl = req.body.repoUrl;
        if (!repoUrl) {
            res.status(400).json({ error: 'Missing repository URL' });
            return;
        }
        repoUrl = decodeURIComponent(repoUrl);
        const accessToken = (_a = req.session) === null || _a === void 0 ? void 0 : _a.accessToken;
        if (!accessToken) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const [owner, repo] = repoUrl.replace('https://github.com/', '').split('/');
        if (!owner || !repo) {
            res.status(400).json({ error: 'Invalid repository URL format' });
            return;
        }
        // Step 1: Fetch repository tree
        const repoTree = yield fetchRepoTree(owner, repo, accessToken);
        console.log('Fetched repository tree:', repoTree.length, 'nodes found.');
        // Step 2: Filter eligible files based on criteria
        const eligibleFiles = repoTree.filter((node) => node.type === 'blob' && shouldIncludeFile(node.path, node.size));
        console.log('Filtered eligible files:', eligibleFiles.length, 'files selected.');
        // Step 3: Fetch content for selected files
        let filesContent = '';
        for (const fileNode of eligibleFiles) {
            try {
                console.log(`Fetching content for file: ${fileNode.path}`);
                let content = yield fetchFileContent(owner, repo, fileNode.sha, accessToken);
                if (fileNode.path.endsWith('.ipynb')) {
                    content = convertIpynbToMarkdown(content);
                }
                filesContent += `### File: ${fileNode.path}\n${content}\n\n`;
            }
            catch (err) {
                console.warn(`Failed to fetch content for file ${fileNode.path}:`, err);
            }
        }
        console.log('All selected files fetched successfully.');
        // Step 4: Split content into chunks if necessary
        const chunks = chunkContent(filesContent);
        let fullContext = '';
        // Step 5: Process each chunk with Gemini to build context
        for (const chunk of chunks) {
            console.log('Processing chunk with Gemini.');
            const analysisPrompt = `Analyze this portion of the codebase and extract key information about functionality, dependencies, and features:\n\n${chunk}`;
            const analysisResult = yield model.generateContent(analysisPrompt);
            const analysisText = yield analysisResult.response.text();
            console.log('Chunk processed successfully.');
            fullContext += analysisText + '\n\n';
        }
        // Step 6: Generate final README with accumulated context
        console.log('Generating final README.md using Gemini.');
        const readmePrompt = `You are an AI assistant that creates detailed and technical README.md files for software projects.
Based on this analysis of the project:

${fullContext}

Generate a comprehensive README.md that includes:
1. Project Overview
2. Main Features and Functionality
3. Setup and Installation Instructions
4. Usage Guide
5. Dependencies
6. How to Contribute

Format the response in proper Markdown with clear sections, code blocks where appropriate, and detailed explanations.`;
        const result = yield model.generateContent(readmePrompt);
        const readmeContent = yield result.response.text();
        console.log('README generated successfully.');
        if (!readmeContent) {
            res.status(500).json({ error: 'Failed to generate README content.' });
            return;
        }
        res.json({ readme: readmeContent });
    }
    catch (error) {
        console.error('Error fetching repository content or generating README:', error);
        res.status(500).json({
            error: 'Failed to generate README.',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
exports.default = router;
