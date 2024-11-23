import express, { Request, Response } from "express";
import axios from "axios";
import querystring from "querystring";
import { config } from "dotenv";

config(); // Load environment variables

const router = express.Router();

const CLIENT_ID = process.env.GITHUB_CLIENT_ID as string;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET as string;
const REDIRECT_URI = process.env.REDIRECT_URI as string;

// Redirect to GitHub login
router.get("/github/login", (req: Request, res: Response) => {
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=repo`;
  res.redirect(githubAuthUrl);
});

// Handle OAuth callback from GitHub
router.get("/github/callback", async (req: Request, res: Response) => {
  const code = req.query.code as string;

  try {
    const response = await axios.post(
      "https://github.com/login/oauth/access_token",
      querystring.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code,
        redirect_uri: REDIRECT_URI,
      }),
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    const accessToken = response.data.access_token;
    // Redirect back to the frontend with the token as a query parameter
    res.redirect(`${process.env.FRONTEND_URL}?token=${accessToken}`);
  } catch (error) {
    console.error("Error during GitHub OAuth:", error);
    res.status(500).send("Authentication failed.");
  }
});

export default router;
