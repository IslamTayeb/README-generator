import express, { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { config } from 'dotenv';

config();

const router = express.Router();

// Extend the session interface to include accessToken
declare module 'express-session' {
  interface SessionData {
    accessToken: string;
  }
}

// Function to get the repository tree recursively
const fetchRepoTree = async (owner: string, repo: string, accessToken: string) => {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`;
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  console.log('Tree fetched successfully');
  console.trace('fetchRepoTree called')
  return response.data.tree;
};

// Function to fetch specific file content
const fetchFileContent = async (owner: string, repo: string, fileSha: string, accessToken: string) => {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/blobs/${fileSha}`;
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3.raw',
    },
  });
  return response.data;
};

// Helper function to determine if a file should be included
const shouldIncludeFile = (filePath: string, size: number) => {
  const ignoredExtensions = [
    '.pdf', '.csv', '.json', '.tsv',
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', // image formats
    '.mp4', '.avi', '.mkv', '.mov', '.webm', '.wmv', // video formats
    '.mp3', '.wav', '.flac', // audio formats
    '.txt', '.log', '.yml', '.yaml', '.toml', '.xml', // text formats
    '.DS_Store'
  ];
  const maxFileSize = 1000000; // 1MB limit for individual files

  // Exclude files with certain extensions and files exceeding the size limit
  return !ignoredExtensions.some((ext) => filePath.endsWith(ext)) && size < maxFileSize;
};

// Function to convert Jupyter Notebook (.ipynb) files to markdown
const convertIpynbToMarkdown = (content: string | object) => {
  try {
    let notebook;

    // Handle content as an object or string
    if (typeof content === 'string') {
      notebook = JSON.parse(content);
    } else {
      notebook = content; // Assuming it's already parsed
    }

    let markdown = `# Jupyter Notebook Conversion\n`;

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

// Define the route for fetching repository contents
router.get('/fetch-code', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    // Step 1: Fetch the entire repository tree
    const repoTree = await fetchRepoTree(owner, repo, accessToken);
    let files: Array<{ filePath: string; content: string }> = [];

    // Step 2: Track directories to skip and collect "good" files
    const directoriesToSkip: Set<string> = new Set();
    let goodFiles: Array<{ path: string; sha: string }> = [];

    const directoryFileCount: Record<string, number> = {};

    for (const node of repoTree) {
      if (node.type === 'tree') {
        // Count the number of files/directories in each folder
        const directoryPath = node.path;
        if (!directoryFileCount[directoryPath]) {
          directoryFileCount[directoryPath] = 0;
        }
        directoryFileCount[directoryPath]++;

        // Mark directory and its subdirectories to skip if over 100 files
        if (directoryFileCount[directoryPath] > 100) {
          directoriesToSkip.add(directoryPath);
        }
      }

      if (node.type === 'blob') {
        // Check if current file is part of a directory marked for skipping
        const directory = node.path.substring(0, node.path.lastIndexOf('/')) || '/';

        if (![...directoriesToSkip].some(skipDir => directory.startsWith(skipDir)) && shouldIncludeFile(node.path, node.size)) {
          goodFiles.push({ path: node.path, sha: node.sha });
        }
      }
    }

    // Step 3: Fetch contents of "good" files
    for (const goodFile of goodFiles) {
      try {
        let content = await fetchFileContent(owner, repo, goodFile.sha, accessToken);

        // Handle Jupyter notebook files (.ipynb)
        if (goodFile.path.endsWith('.ipynb')) {
          content = convertIpynbToMarkdown(content);
        }

        files.push({
          filePath: goodFile.path,
          content,
        });
      } catch (err) {
        console.warn(`Failed to fetch content for file ${goodFile.path}`, err);
      }
    }

    res.json(files);
  } catch (error) {
    console.error('Error fetching repository content:', error);
    res.status(500).json({ error: 'Failed to fetch repository contents' });
  }
});

export default router;
