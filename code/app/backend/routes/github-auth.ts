import express, { Request, Response, NextFunction } from "express";
import axios from "axios";
import { config } from "dotenv";

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
        res.status(500).send("Authentication failed.");
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
router.get(
    "/github/repos",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.session || !req.session.accessToken) {
                res.status(401).json({ error: "User not authenticated" });
                return; // Ensure to return so the function ends here
            }

            const accessToken = req.session.accessToken;

            const response = await axios.get("https://api.github.com/user/repos", {
                headers: {
                    Authorization: `token ${accessToken}`,
                },
            });

            res.json(response.data);
            return; // Explicit return to ensure no further code is executed
        } catch (error) {
            console.error("Failed to fetch repositories:", error);
            next(error); // Use next() to handle errors properly
        }
    }
);

export default router;
