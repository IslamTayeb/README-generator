import express, { Request, Response } from 'express';
import axios from 'axios';
import { config } from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import pdf from 'pdf-parse';
import fs from 'fs/promises';
import path from 'path';

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

const savePromptToFile = async (prompt: string, identifier: string) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `prompt-${identifier}-${timestamp}.txt`;
    const promptsDir = path.join(process.cwd(), 'prompts');

    // Create prompts directory if it doesn't exist
    await fs.mkdir(promptsDir, { recursive: true });

    await fs.writeFile(
      path.join(promptsDir, filename),
      prompt,
      'utf-8'
    );
    console.log(`Prompt saved to ${filename}`);
  } catch (err) {
    console.error('Failed to save prompt:', err);
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

// Function to chunk content
const chunkContent = (content: string, maxChunkSize: number = 15000): string[] => {
  const chunks: string[] = [];
  let currentChunk = '';
  const lines = content.split('\n');

  for (const line of lines) {
    if ((currentChunk + line).length > maxChunkSize) {
      chunks.push(currentChunk);
      currentChunk = line;
    } else {
      currentChunk += (currentChunk ? '\n' : '') + line;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
};

router.get('/fetch-tree', async (req: Request, res: Response) => {
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

    // Process files for tree view
    const processedFiles = repoTree.map(item => ({
      path: item.path,
      mode: item.mode,
      type: item.type,
      sha: item.sha,
      size: item.size,
      url: item.url
    }));

    res.json({
      files: processedFiles,
      preSelectedFiles
    });

  } catch (error) {
    console.error('Error fetching repository tree:', error);
    res.status(500).json({ error: 'Failed to fetch repository tree' });
  }
});

// Endpoint to generate README from selected files
router.post('/generate-readme', async (req: Request, res: Response) => {
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

    // Fetch content for selected files
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

          filesContent += `### File: ${filePath}\n${content}\n\n`;
        }
      } catch (err) {
        console.warn(`Failed to fetch content for file ${filePath}:`, err);
      }
    }

    // Process content chunks
    const chunks = chunkContent(filesContent);
    let fullContext = '';

    // Process each chunk and save intermediate prompts
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const analysisPrompt = `Analyze this portion of the codebase and extract key information about functionality, dependencies, and features:\n\n${chunk}`;

      // Save analysis prompt
      await savePromptToFile(analysisPrompt, `chunk-${i}`);

      const analysisResult = await model.generateContent(analysisPrompt);
      fullContext += await analysisResult.response.text() + '\n\n';
    }

    const result = await model.generateContent(`You are an AI assistant that creates detailed and technical README.md files for software projects.
Based on this analysis of the project:

${fullContext}

Generate a comprehensive README.md that includes:
1. Project Overview
2. Main Features and Functionality
3. Setup and Installation Instructions
4. Usage Guide
5. Dependencies
6. How to Contribute

Format the response in proper Markdown with clear sections, code blocks where appropriate, and detailed explanations.`);

    const readmeContent = await result.response.text();
    if (!readmeContent) {
      res.status(500).json({ error: 'Failed to generate README content.' });
      return;
    }

    res.json({ readme: readmeContent });

  } catch (error) {
    console.error('Error generating README:', error);
    res.status(500).json({ error: 'Failed to generate README' });
  }
});

export default router;
