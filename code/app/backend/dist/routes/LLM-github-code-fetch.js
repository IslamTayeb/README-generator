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
// This utilizes Gemini to select the most important files from a GitHub repository to include in a README.md file. Might come in useful later, for now I want to minimize LLM usage though.
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = require("dotenv");
const generative_ai_1 = require("@google/generative-ai");
(0, dotenv_1.config)();
const router = express_1.default.Router();
// Initialize Gemini
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
// Function to get the repository tree recursively
const fetchRepoTree = (owner, repo, accessToken) => __awaiter(void 0, void 0, void 0, function* () {
    const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`;
    const response = yield axios_1.default.get(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    console.log('Tree fetched successfully');
    console.trace('fetchRepoTree called');
    return response.data.tree;
});
// Function to fetch specific file content
const fetchFileContent = (owner, repo, fileSha, accessToken) => __awaiter(void 0, void 0, void 0, function* () {
    const url = `https://api.github.com/repos/${owner}/${repo}/git/blobs/${fileSha}`;
    const response = yield axios_1.default.get(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3.raw',
        },
    });
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
// Function to analyze files using Gemini
function analyzeFilesWithGemini(files_1) {
    return __awaiter(this, arguments, void 0, function* (files, retries = 3, delay = 3000) {
        console.log('File tree being analyzed by Gemini:', files);
        const filesList = files
            .map(file => `${file.path} (${file.size} bytes)`)
            .join('\n');
        const prompt = `You are helping to generate a README.md file for a software project.
Given the following list of files, select the most important ones that should be referenced
or included in the README.

File Selection Rules:
1. Exclude files with these extensions:
   - Document formats: .pdf, .csv, .json, .tsv, .xls, .xlsx
   - Image formats
   - Video formats
   - Audio formats
   - System files: .DS_Store
   - Log files: .log

2. Exclude files in these directories:
   - node_modules/
   - dist/

3. Additional exclusions:
   - Test files (unless they provide critical usage examples)
   - Build artifacts
   - Dependencies
   - Temporary files
   - Binary files
   - Large data files

   Most other code files that make up the functional code base should be included. This probably includes .ipynb, .py, .tsx, .jsx, .ts, .js, .html, .md, and other source code files from other languages.

File list:
${filesList}

Respond with only the file paths, one per line, of files that should be included.`;
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                console.log(`Attempt ${attempt + 1}: Sending prompt to Gemini`);
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const result = yield model.generateContent(prompt);
                const response = yield result.response;
                const text = response.text();
                if (text) {
                    console.log('Received response from Gemini:', text);
                }
                return text
                    .split('\n')
                    .map((line) => line.trim())
                    .filter((line) => line.length > 0);
            }
            catch (error) {
                console.error(`Error analyzing files with Gemini (attempt ${attempt + 1}/${retries}):`, error);
                if (attempt < retries - 1) {
                    console.log(`Retrying after ${delay}ms...`);
                    yield new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        console.error('Failed to get response from Gemini after retries.');
        return [];
    });
}
// Modified fetch-code route to incorporate Gemini
router.get('/fetch-code', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        let repoUrl = req.query.repoUrl;
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
        // Fetch repository tree
        const repoTree = yield fetchRepoTree(owner, repo, accessToken);
        console.log('Fetched repository tree:', repoTree);
        // First pass: collect eligible files
        const eligibleFiles = repoTree.filter((node) => node.type === 'blob');
        console.log('Eligible files:', eligibleFiles.map(file => file.path));
        // Use Gemini to analyze and select files
        const selectedFilePaths = yield analyzeFilesWithGemini(eligibleFiles);
        console.log('Selected file paths by Gemini:', selectedFilePaths);
        // Fetch content for selected files
        const files = [];
        for (const filePath of selectedFilePaths) {
            const fileNode = eligibleFiles.find((f) => f.path === filePath);
            if (fileNode) {
                try {
                    console.log(`Fetching content for file: ${fileNode.path}`);
                    let content = yield fetchFileContent(owner, repo, fileNode.sha, accessToken);
                    // Handle Jupyter notebooks
                    if (filePath.endsWith('.ipynb')) {
                        content = convertIpynbToMarkdown(content);
                    }
                    files.push({
                        filePath: filePath,
                        content,
                    });
                }
                catch (err) {
                    console.warn(`Failed to fetch content for file ${filePath}:`, err);
                }
            }
            else {
                console.warn(`File path ${filePath} selected by Gemini does not exist in eligible files.`);
            }
        }
        res.json({
            treeAnalyzed: eligibleFiles.map(file => file.path),
            selectedFiles: files
        });
    }
    catch (error) {
        console.error('Error fetching repository content:', error);
        res.status(500).json({ error: 'Failed to fetch repository contents' });
    }
}));
exports.default = router;
