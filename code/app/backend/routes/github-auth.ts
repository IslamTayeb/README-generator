import express, { Request, Response, NextFunction } from "express";
import axios from "axios";
import { config } from "dotenv";

config();

const router = express.Router();

// Start the GitHub OAuth Flow
router.get("/github/login", (req: Request, res: Response) => {
  const redirectUri = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.BACKEND_URL + '/auth/github/callback')}&scope=repo`;
  res.redirect(redirectUri);
});

// GitHub OAuth Callback
router.get("/github/callback", async (req: Request, res: Response, next: NextFunction) => {
  const code = req.query.code as string;

  try {
    // Exchange the authorization code for an access token
    const response = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code,
      },
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    const accessToken = response.data.access_token;

    if (!accessToken) {
      throw new Error("Failed to obtain access token");
    }

    if (req.session) {
      req.session.accessToken = accessToken;
    }

    res.redirect(`${process.env.FRONTEND_URL}/?authenticated=true`);
  } catch (error) {
    console.error("Error during GitHub OAuth:", error);
    next(error); // Pass the error to Express error handler
  }
});

// Endpoint to verify if user is authenticated
router.get("/github/verify", (req: Request, res: Response) => {
  if (req.session && req.session.accessToken) {
    res.json({ authenticated: true });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

// Endpoint to get repositories
router.get("/github/repos", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.session || !req.session.accessToken) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    const accessToken = req.session.accessToken;

    const response = await axios.get("https://api.github.com/user/repos", {
      headers: {
        Authorization: `token ${accessToken}`,
      },
    });

    res.json(response.data);
  } catch (error) {
    next(error); // Pass the error to Express error handler
  }
});

export default router;
