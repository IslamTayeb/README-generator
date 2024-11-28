import express, { Request, Response } from 'express';
import axios from 'axios';
import { config } from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import pdf from 'pdf-parse';
import fs from 'fs/promises';
import path from 'path';
import { countTokens } from '@anthropic-ai/tokenizer';

config();

const router = express.Router();

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

interface FileNode {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size: number;
  url: string;
}

interface SelectedFile {
  filePath: string;
  content: string;
}

// Function to get the repository tree recursively
const fetchRepoTree = async (owner: string, repo: string, accessToken: string): Promise<FileNode[]> => {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`;
  console.log(`Fetching repository tree from URL: ${url}`);
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data.tree;
};

// Function to fetch specific file content
const fetchFileContent = async (owner: string, repo: string, fileSha: string, accessToken: string): Promise<string> => {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/blobs/${fileSha}`;
  console.log(`Fetching content for file from URL: ${url}`);
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3.raw',
    },
    responseType: 'arraybuffer', // Important for handling PDFs
  });

  // Check if response is PDF
  const isPdf = response.headers['content-type']?.includes('application/pdf');
  if (isPdf) {
    return extractPdfContent(response.data);
  }

  // Handle non-PDF content
  return typeof response.data === 'string'
    ? response.data
    : Buffer.from(response.data).toString('utf-8');
};

// Function to convert Jupyter Notebook (.ipynb) files to markdown
const convertIpynbToMarkdown = (content: string | object): string => {
  try {
    let notebook;
    if (typeof content === 'string') {
      notebook = JSON.parse(content);
    } else {
      notebook = content;
    }

    let markdown = '# Jupyter Notebook Conversion\n';
    if (notebook.cells) {
      for (const cell of notebook.cells) {
        if (cell.cell_type === 'markdown') {
          markdown += cell.source.join('') + '\n\n';
        } else if (cell.cell_type === 'code') {
          markdown += '```python\n' + cell.source.join('') + '\n```\n\n';
        }
      }
    } else {
      markdown += 'Notebook format not recognized.\n';
    }
    return markdown;
  } catch (err) {
    console.error('Failed to convert .ipynb file:', err);
    return '# Error in converting notebook\n';
  }
};

const extractPdfContent = async (buffer: Buffer): Promise<string> => {
  try {
    const data = await pdf(buffer);
    return data.text;
  } catch (err) {
    console.error('Failed to parse PDF:', err);
    return '# Error in parsing PDF\n';
  }
};

// Function to determine if a file should be included
const shouldIncludeFile = (filePath: string, size: number): boolean => {
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
router.get('/fetch-tree', async (req: Request, res: Response): Promise<void> => {
  try {
    let repoUrl = req.query.repoUrl as string;
    if (!repoUrl) {
      res.status(400).json({ error: 'Missing repository URL' });
      return;
    }

    repoUrl = decodeURIComponent(repoUrl);
    const accessToken = req.session?.accessToken;

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
    const repoTree = await fetchRepoTree(owner, repo, accessToken);

    // Get pre-selected files
    const preSelectedFiles = repoTree
      .filter((node: FileNode) => {
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

  } catch (error) {
    console.error('Error fetching repository tree:', error);
    res.status(500).json({ error: 'Failed to fetch repository tree' });
  }
});

const savePromptToFile = async (prompt: string) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `prompt-${timestamp}.txt`;
  const promptsDir = path.join(process.cwd(), 'prompts');

  try {
    // Create the prompts directory if it does not exist
    await fs.mkdir(promptsDir, { recursive: true });

    await fs.writeFile(path.join(promptsDir, filename), prompt, 'utf-8');
    console.log(`Prompt saved to ${filename}`);
  } catch (err) {
    console.error('Failed to save prompt:', err);
  }
};

const retryGemini = async (prompt: string, retries: number = 5, interval: number = 30000): Promise<string | null> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Attempt ${attempt} to generate README...`);
      const result = await model.generateContent(prompt);
      const readmeContent = await result.response.text();
      if (readmeContent) {
        return readmeContent;
      }
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
    }

    // Wait before retrying
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }

  // Return null if all attempts fail
  return null;
};

const createFullPrompt = (filesContent: string): string => {
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
router.post('/generate-readme', async (req: Request, res: Response): Promise<void> => {
  try {
    const { repoUrl, selectedFiles } = req.body;
    if (!repoUrl || !selectedFiles) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    const accessToken = req.session?.accessToken;
    if (!accessToken) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const [owner, repo] = decodeURIComponent(repoUrl).replace('https://github.com/', '').split('/');

    let filesContent = '';
    for (const filePath of selectedFiles) {
      try {
        const fileNode = (await fetchRepoTree(owner, repo, accessToken))
          .find(node => node.path === filePath);

        if (fileNode) {
          let content = await fetchFileContent(owner, repo, fileNode.sha, accessToken);

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
      } catch (err) {
        console.warn(`Failed to fetch content for file ${filePath}:`, err);
      }
    }

    // Create the full prompt
    const fullPrompt = createFullPrompt(filesContent);

    // Calculate token count and log it
    const tokenEstimate = countTokens(fullPrompt);
    console.log(`Token count: ${tokenEstimate}`);

    // Save the prompt to a file
    await savePromptToFile(fullPrompt);

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
    const readmeContent = await retryGemini(fullPrompt);

    if (!readmeContent) {
      res.status(500).json({ error: 'Failed to generate README content after multiple attempts.' });
      return;
    }

    res.json({ readme: readmeContent });

  } catch (error) {
    console.error('Error generating README:', error);
    res.status(500).json({ error: 'Failed to generate README' });
  }
});

export default router;
