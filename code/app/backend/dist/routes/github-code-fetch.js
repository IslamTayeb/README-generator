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
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const tokenizer_1 = require("@anthropic-ai/tokenizer");
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
    return response.data.tree;
});
// Function to fetch specific file content
const fetchFileContent = (owner, repo, fileSha, accessToken) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const url = `https://api.github.com/repos/${owner}/${repo}/git/blobs/${fileSha}`;
    console.log(`Fetching content for file from URL: ${url}`);
    const response = yield axios_1.default.get(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3.raw',
        },
        responseType: 'arraybuffer', // Important for handling PDFs
    });
    // Check if response is PDF
    const isPdf = (_a = response.headers['content-type']) === null || _a === void 0 ? void 0 : _a.includes('application/pdf');
    if (isPdf) {
        return extractPdfContent(response.data);
    }
    // Handle non-PDF content
    return typeof response.data === 'string'
        ? response.data
        : Buffer.from(response.data).toString('utf-8');
});
// Function to convert Jupyter Notebook (.ipynb) files to markdown
const convertIpynbToMarkdown = (content) => {
    try {
        let notebook;
        if (typeof content === 'string') {
            notebook = JSON.parse(content);
        }
        else {
            notebook = content;
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
const extractPdfContent = (buffer) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, pdf_parse_1.default)(buffer);
        return data.text;
    }
    catch (err) {
        console.error('Failed to parse PDF:', err);
        return '# Error in parsing PDF\n';
    }
});
// Function to determine if a file should be included
const shouldIncludeFile = (filePath, size) => {
    const ignoredExtensions = [
        '.csv', '.json', '.tsv', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.mp4', '.avi', '.mkv', '.mov', '.webm', '.wmv', '.mp3', '.wav', '.flac', '.log', '.DS_Store', '.zip', '.gz', '.tar', '.7z'
    ];
    const ignoredDirectories = [
        'node_modules/', 'dist/', 'venv/', 'env/', '.git/', '.vscode/', '.gitignore', '.env', '.gitattributes', '.python-version', '.venv', 'yarn.lock', 'package-lock.json'
    ];
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
    return true;
};
// Route handler for /fetch-tree
router.get('/fetch-tree', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        // Get pre-selected files
        const preSelectedFiles = repoTree
            .filter((node) => {
            const shouldInclude = shouldIncludeFile(node.path, node.size);
            console.log(`File ${node.path}: should include = ${shouldInclude}`);
            return node.type === "blob" && shouldInclude;
        })
            .map(file => file.path);
        console.log('Pre-selected files:', preSelectedFiles);
        res.json({
            files: repoTree,
            preSelectedFiles
        });
    }
    catch (error) {
        console.error('Error fetching repository tree:', error);
        res.status(500).json({ error: 'Failed to fetch repository tree' });
    }
}));
const savePromptToFile = (prompt) => __awaiter(void 0, void 0, void 0, function* () {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `prompt-${timestamp}.txt`;
    const promptsDir = path_1.default.join(process.cwd(), 'prompts');
    try {
        // Create the prompts directory if it does not exist
        yield promises_1.default.mkdir(promptsDir, { recursive: true });
        yield promises_1.default.writeFile(path_1.default.join(promptsDir, filename), prompt, 'utf-8');
        console.log(`Prompt saved to ${filename}`);
    }
    catch (err) {
        console.error('Failed to save prompt:', err);
    }
});
const retryGemini = (prompt_1, ...args_1) => __awaiter(void 0, [prompt_1, ...args_1], void 0, function* (prompt, retries = 5, interval = 30000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`Attempt ${attempt} to generate README...`);
            const result = yield model.generateContent(prompt);
            const readmeContent = yield result.response.text();
            if (readmeContent) {
                return readmeContent;
            }
        }
        catch (error) {
            console.error(`Attempt ${attempt} failed:`, error);
        }
        // Wait before retrying
        if (attempt < retries) {
            yield new Promise((resolve) => setTimeout(resolve, interval));
        }
    }
    // Return null if all attempts fail
    return null;
});
const createFullPrompt = (filesContent) => {
    return `You are an AI assistant that creates detailed and technical README.md files for software projects.
Here is the full codebase to analyze:

${filesContent}

Based on the code above, generate a comprehensive README.md that includes:
1. Project Overview
2. Main Features and Functionality
3. Setup and Installation Instructions
4. Usage Guide
5. Dependencies
6. How to Contribute

Format the response in proper Markdown with clear sections, code blocks where appropriate, and detailed explanations.`;
};
// Endpoint to generate README from selected files
router.post('/generate-readme', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { repoUrl, selectedFiles } = req.body;
        if (!repoUrl || !selectedFiles) {
            res.status(400).json({ error: 'Missing required parameters' });
            return;
        }
        const accessToken = (_a = req.session) === null || _a === void 0 ? void 0 : _a.accessToken;
        if (!accessToken) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const [owner, repo] = decodeURIComponent(repoUrl).replace('https://github.com/', '').split('/');
        let filesContent = '';
        for (const filePath of selectedFiles) {
            try {
                const fileNode = (yield fetchRepoTree(owner, repo, accessToken))
                    .find(node => node.path === filePath);
                if (fileNode) {
                    let content = yield fetchFileContent(owner, repo, fileNode.sha, accessToken);
                    if (filePath.endsWith('.ipynb')) {
                        content = convertIpynbToMarkdown(content);
                    }
                    filesContent += `
=== File: ${filePath} ===
Type: ${fileNode.type}
Size: ${fileNode.size} bytes
SHA: ${fileNode.sha}

${content}

`;
                }
            }
            catch (err) {
                console.warn(`Failed to fetch content for file ${filePath}:`, err);
            }
        }
        // Create the full prompt
        const fullPrompt = createFullPrompt(filesContent);
        // Calculate token count and log it
        const tokenEstimate = (0, tokenizer_1.countTokens)(fullPrompt);
        console.log(`Token count: ${tokenEstimate}`);
        // Save the prompt to a file
        yield savePromptToFile(fullPrompt);
        // Check token limit
        if (tokenEstimate > 900000) {
            res.status(413).json({
                error: 'Token limit exceeded',
                message: 'Please select fewer files. The current selection exceeds the 500,000 token limit.',
                tokenCount: tokenEstimate
            });
            return;
        }
        // Attempt to generate README up to 5 times if it fails
        const readmeContent = yield retryGemini(fullPrompt);
        if (!readmeContent) {
            res.status(500).json({ error: 'Failed to generate README content after multiple attempts.' });
            return;
        }
        res.json({ readme: readmeContent });
    }
    catch (error) {
        console.error('Error generating README:', error);
        res.status(500).json({ error: 'Failed to generate README' });
    }
}));
exports.default = router;
