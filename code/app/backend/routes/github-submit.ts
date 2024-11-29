import express, { Request, Response } from 'express';
import axios from 'axios';
import { Base64 } from 'js-base64';

const router = express.Router();

interface GitHubFileResponse {
  sha: string;
  content: string;
}

const getRepoInfo = (repoUrl: string) => {
  console.log('Parsing repo URL:', repoUrl);
  const matches = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!matches) {
    console.error('Invalid GitHub URL format:', repoUrl);
    throw new Error('Invalid GitHub URL');
  }
  const result = { owner: matches[1], repo: matches[2] };
  console.log('Extracted repo info:', result);
  return result;
};

const getReadmeSha = async (owner: string, repo: string, accessToken: string): Promise<string | null> => {
  console.log(`Fetching README SHA for ${owner}/${repo}`);
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/README.md`;
    console.log('Making GitHub API request to:', url);
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    console.log('GitHub API response:', response.data);
    return response.data.sha;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.log('GitHub API Error Response:', error.response?.data);
      if (error.response?.status === 404) {
        console.log('README not found, will create new one');
        return null;
      }
    }
    console.error('Error fetching README SHA:', error);
    throw error;
  }
};

// Define interface for request body
interface SubmitRequestBody {
  repoUrl: string;
  content: string;
}

router.post('/submit', async (req: Request<{}, {}, SubmitRequestBody>, res: Response): Promise<void> => {
  console.log('Received submit request');
  console.log('Request body:', {
    repoUrl: req.body.repoUrl,
    contentLength: req.body.content?.length || 0
  });

  try {
    const { repoUrl, content } = req.body;
    const accessToken = req.session?.accessToken;

    if (!accessToken) {
      console.log('No access token found');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!repoUrl || !content) {
      console.log('Missing parameters:', { hasRepoUrl: !!repoUrl, hasContent: !!content });
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    const { owner, repo } = getRepoInfo(repoUrl);
    console.log(`Updating README for ${owner}/${repo}`);

    const currentSha = await getReadmeSha(owner, repo, accessToken);
    console.log('Current README SHA:', currentSha);

    const updateData = {
      message: 'Update README.md via README Generator',
      content: Base64.encode(content),
      ...(currentSha && { sha: currentSha })
    };

    console.log('Sending update request to GitHub');
    const response = await axios.put(
      `https://api.github.com/repos/${owner}/${repo}/contents/README.md`,
      updateData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    console.log('GitHub API Response:', response.data);
    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('Error updating README:', error);
    if (axios.isAxiosError(error)) {
      console.error('GitHub API Error Response:', {
        status: error.response?.status,
        data: error.response?.data
      });
      res.status(error.response?.status || 500).json({
        error: error.response?.data?.message || 'Failed to update README'
      });
    } else {
      res.status(500).json({ error: 'Failed to update README' });
    }
  }
});

export default router;
