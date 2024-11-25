import express, { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { config } from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

config();

const router = express.Router();

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

interface FileNode {
  path: string;
  type: string;
  sha: string;
  size: number;
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
  console.log('Tree fetched successfully:', response.data.tree.length, 'files found');
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
  });
  console.log(`Content fetched for SHA ${fileSha}:`, response.data.length, 'characters');
  return response.data;
};

// Function to convert Jupyter Notebook (.ipynb) files to markdown
const convertIpynbToMarkdown = (content: string | object): string => {
  try {
    let notebook;

    // Handle content as an object or string
    if (typeof content === 'string') {
      notebook = JSON.parse(content);
    } else {
      notebook = content; // Assuming it's already parsed
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

// Function to determine if a file should be included
const shouldIncludeFile = (filePath: string, size: number): boolean => {
  // Exclusion criteria
  const ignoredExtensions = [
    '.pdf', '.csv', '.json', '.tsv', '.xls', '.xlsx', // document formats
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', // image formats
    '.mp4', '.avi', '.mkv', '.mov', '.webm', '.wmv', // video formats
    '.mp3', '.wav', '.flac', // audio formats
    '.log', '.DS_Store', // system files
  ];
  const ignoredDirectories = ['node_modules/', 'dist/'];
  const maxFileSize = 10000000; // 10MB limit

  // Exclude based on extension
  if (ignoredExtensions.some(ext => filePath.endsWith(ext))) {
    console.log(`File excluded based on extension: ${filePath}`);
    return false;
  }

  // Exclude based on directory
  if (ignoredDirectories.some(dir => filePath.includes(dir))) {
    console.log(`File excluded based on directory: ${filePath}`);
    return false;
  }

  // Exclude large files
  if (size > maxFileSize) {
    console.log(`File excluded based on size (>10MB): ${filePath}`);
    return false;
  }

  // Exclude data sets (files that look like datasets)
  if (filePath.includes('data') || filePath.includes('dataset')) {
    console.log(`File excluded based on data/dataset naming: ${filePath}`);
    return false;
  }

  // If none of the exclusion criteria match, include the file
  return true;
};

// Optimized function to chunk content if it's too large
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

  console.log(`Content chunked into ${chunks.length} parts.`);
  return chunks;
};

// Route to fetch code from repository
router.get('/fetch-code', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    console.log('Request received for /fetch-code with repoUrl:', req.query.repoUrl);

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
    console.log('Fetched repository tree:', repoTree.length, 'nodes found.');

    // Filter eligible files based on criteria
    const eligibleFiles = repoTree.filter((node: FileNode) =>
      node.type === 'blob' && shouldIncludeFile(node.path, node.size)
    );

    console.log('Filtered eligible files:', eligibleFiles.length, 'files selected.');

    // Fetch content for selected files
    const files: SelectedFile[] = [];
    for (const fileNode of eligibleFiles) {
      try {
        console.log(`Fetching content for file: ${fileNode.path}`);
        let content = await fetchFileContent(owner, repo, fileNode.sha, accessToken);

        // Handle Jupyter notebooks
        if (fileNode.path.endsWith('.ipynb')) {
          content = convertIpynbToMarkdown(content);
        }

        files.push({
          filePath: fileNode.path,
          content,
        });
      } catch (err) {
        console.warn(`Failed to fetch content for file ${fileNode.path}:`, err);
      }
    }

    console.log('All selected files fetched successfully.');

    // Send the response
    res.json({
      treeAnalyzed: eligibleFiles.map(file => file.path),
      selectedFiles: files
    });
  } catch (error) {
    console.error('Error fetching repository content:', error);
    res.status(500).json({ error: 'Failed to fetch repository contents' });
  }
});

// Route to generate README.md using Gemini
router.post('/generate-readme', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Request received for /generate-readme with selectedFiles.');

    const { selectedFiles } = req.body;

    if (!selectedFiles || !Array.isArray(selectedFiles) || selectedFiles.length === 0) {
      res.status(400).json({ error: 'Invalid input, selectedFiles is required.' });
      return;
    }

    // Prepare input for Gemini
    let filesContent = '';
    for (const file of selectedFiles) {
      filesContent += `### File: ${file.filePath}\n${file.content}\n\n`;
    }

    // Split content into chunks if necessary
    const chunks = chunkContent(filesContent);
    let fullContext = '';

    // Process each chunk with Gemini to build context
    for (const chunk of chunks) {
      console.log('Processing chunk with Gemini.');
      const analysisPrompt = `Analyze this portion of the codebase and extract key information about functionality, dependencies, and features:\n\n${chunk}`;
      const analysisResult = await model.generateContent(analysisPrompt);
      const analysisText = await analysisResult.response.text();
      console.log('Chunk processed successfully.');
      fullContext += analysisText + '\n\n';
    }

    // Generate final README with accumulated context
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

    const result = await model.generateContent(readmePrompt);
    const readmeContent = await result.response.text();
    console.log('README generated successfully.');

    if (!readmeContent) {
      res.status(500).json({ error: 'Failed to generate README content.' });
      return;
    }

    res.json({ readme: readmeContent });

  } catch (error) {
    console.error('Error generating README:', error);
    res.status(500).json({
      error: 'Failed to generate README.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
