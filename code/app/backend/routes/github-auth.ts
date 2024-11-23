import express, { Request, Response } from "express";
import axios from "axios";
import { config } from "dotenv";

// Load environment variables
config();

const router = express.Router();

// Start the GitHub OAuth Flow
router.get("/github/login", (req: Request, res: Response) => {
    const redirectUri = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${process.env.BACKEND_URL}/auth/github/callback&scope=repo`;
    res.redirect(redirectUri);
});

// GitHub OAuth Callback
router.get("/github/callback", async (req: Request, res: Response) => {
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

        // Store the access token in the session securely
        req.session.accessToken = accessToken;

        // Redirect back to the main page
        res.redirect(`${process.env.FRONTEND_URL}/?authenticated=true`);
    } catch (error) {
        console.error("Error during GitHub OAuth:", error);
        res.status(500).send("Authentication failed.");
    }
});

// Endpoint to get repositories
router.get("/github/repos", (req: Request, res: Response) => {
    (async () => {
        const accessToken = req.session.accessToken;

        if (!accessToken) {
            return res.status(401).json({ error: "User not authenticated" });
        }

        try {
            const response = await axios.get("https://api.github.com/user/repos", {
                headers: {
                    Authorization: `token ${accessToken}`,
                },
            });
            res.json(response.data);
        } catch (error) {
            console.error("Failed to fetch repositories:", error);
            res.status(500).json({ error: "Failed to fetch repositories" });
        }
    })();
});

export default router;
