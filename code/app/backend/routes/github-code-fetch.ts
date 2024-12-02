import express, { Request, Response } from 'express';
import axios from 'axios';
import { config } from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

// Function to convert Jupyter Notebook (.ipynb) files to markdown
const convertIpynbToMarkdown = (content: string | object, truncateOutputs: boolean = false): string => {
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
        // Handle markdown cells
        if (cell.cell_type === 'markdown') {
          markdown += cell.source.join('') + '\n\n';
        }
        // Handle code cells
        else if (cell.cell_type === 'code') {
          // Add the code
          markdown += '```python\n' + cell.source.join('') + '\n```\n\n';

          // Handle outputs if they exist
          if (cell.outputs && cell.outputs.length > 0) {
            markdown += 'Output:\n```\n';

            for (const output of cell.outputs) {
              if (output.output_type === 'stream' && output.text) {
                const text = output.text.join('');
                if (truncateOutputs) {
                  // Get first 2 lines of output
                  const lines = text.split('\n').slice(0, 2);
                  markdown += lines.join('\n');
                  if (text.split('\n').length > 2) {
                    markdown += '\n... [output truncated]\n';
                  }
                } else {
                  markdown += text;
                }
              }
              else if (output.output_type === 'execute_result' && output.data && output.data['text/plain']) {
                const text = Array.isArray(output.data['text/plain'])
                  ? output.data['text/plain'].join('')
                  : output.data['text/plain'];

                if (truncateOutputs) {
                  const lines = text.split('\n').slice(0, 2);
                  markdown += lines.join('\n');
                  if (text.split('\n').length > 2) {
                    markdown += '\n... [output truncated]\n';
                  }
                } else {
                  markdown += text;
                }
              }
            }
            markdown += '\n```\n\n';
          }
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

// Modified fetchFileContent function to include truncation option
const fetchFileContent = async (
  owner: string,
  repo: string,
  fileSha: string,
  accessToken: string,
  truncateNotebookOutputs: boolean = true
): Promise<string> => {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/blobs/${fileSha}`;
  console.log(`Fetching content for file from URL: ${url}`);

  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3.raw',
    },
    responseType: 'arraybuffer',
  });

  const content = typeof response.data === 'string'
    ? response.data
    : Buffer.from(response.data).toString('utf-8');

  return content;
};

// Function to determine if a file should be included
const shouldIncludeFile = (filePath: string, size: number): boolean => {
  const ignoredExtensions = [
    '.csv', '.json', '.tsv', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.mp4', '.avi', '.mkv', '.mov', '.webm', '.wmv', '.mp3', '.wav', '.flac', '.log', '.DS_Store', '.zip', '.gz', '.tar', '.7z', '.rar', '.mjs', '.ts', '.ico', '.txt', '.pdf'
  ];
  const ignoredDirectories = [
    'node_modules/', 'dist/', 'venv/', 'env/', '.git/', '.vscode/', '.gitignore', '.env', '.gitattributes', '.python-version', '.venv', 'yarn.lock', 'package-lock.json', 'hooks', '.next', 'resume'
  ];
  const maxFileSize = 1000000;

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

const createFullPrompt = (filesContent: string, projectContext?: string): string => {
  let contextPrompt = '';
  if (projectContext) {
    contextPrompt = `
Additional Project Context:
${projectContext}

`;
  }

  return `You are an AI assistant that creates detailed and technical README.md files for software projects.
${contextPrompt}Here is the full codebase to analyze:

${filesContent}

Based on the code above, generate a comprehensive README.md that includes:
1. Project Overview
2. Main Features and Functionality
3. Setup and Installation Instructions
4. Usage Guide
5. Dependencies
6. How to Contribute

${projectContext ? 'Make sure to incorporate the provided project context into the documentation where relevant.' : ''}
Format the response in proper Markdown with clear sections, code blocks where appropriate, and detailed explanations.`;
};

// Change 2: Update the /generate-readme endpoint parameters
router.post('/generate-readme', async (req: Request, res: Response): Promise<void> => {
  try {
    const { repoUrl, selectedFiles, projectContext, truncateNotebookOutputs = true } = req.body;
    // Set headers for streaming
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked');

    const accessToken = req.session?.accessToken;
    if (!accessToken) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const [owner, repo] = decodeURIComponent(repoUrl).replace('https://github.com/', '').split('/');

    // Send initial status
    res.write(JSON.stringify({ status: 'fetching', message: 'Fetching codebase content...' }) + '\n');

    let filesContent = '';
    for (const filePath of selectedFiles) {
      try {
        const fileNode = (await fetchRepoTree(owner, repo, accessToken))
          .find(node => node.path === filePath);

        if (fileNode) {
          let content = await fetchFileContent(owner, repo, fileNode.sha, accessToken);
          if (filePath.endsWith('.ipynb')) {
            content = convertIpynbToMarkdown(content, truncateNotebookOutputs);
          }
          filesContent += `=== File: ${filePath} ===\n${content}\n\n`;
        }
      } catch (err) {
        console.warn(`Failed to fetch content for file ${filePath}:`, err);
      }
    }

    // Send analyzing status
    res.write(JSON.stringify({ status: 'analyzing', message: 'Analyzing codebase...' }) + '\n');

    const fullPrompt = createFullPrompt(filesContent, projectContext);
    const tokenEstimate = countTokens(fullPrompt);

    // Send token count
    res.write(JSON.stringify({
      status: 'tokens',
      message: `Token count: ${tokenEstimate.toLocaleString()} tokens`,
      tokenCount: tokenEstimate  // Add this line to send the raw number
    }) + '\n');

    if (tokenEstimate > 500000) {
      res.write(JSON.stringify({
        status: 'error',
        message: 'Token limit exceeded. Please select fewer files.'
      }) + '\n');
      res.end();
      return;
    }

    // Send generating status
    res.write(JSON.stringify({ status: 'generating', message: 'Generating README...' }) + '\n');

    const readmeContent = await retryGemini(fullPrompt);

    if (!readmeContent) {
      res.write(JSON.stringify({
        status: 'error',
        message: 'Failed to generate README content.'
      }) + '\n');
      res.end();
      return;
    }

    // Send final response
    res.write(JSON.stringify({
      status: 'complete',
      readme: readmeContent
    }) + '\n');
    res.end();

  } catch (error) {
    console.error('Error generating README:', error);
    res.write(JSON.stringify({
      status: 'error',
      message: 'Failed to generate README'
    }) + '\n');
    res.end();
  }
});

export default router;
