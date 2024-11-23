"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = require("dotenv");
// Load environment variables
(0, dotenv_1.config)();
const router = express_1.default.Router();
// Start the GitHub OAuth Flow
router.get("/github/login", (req, res) => {
    const redirectUri = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${process.env.BACKEND_URL}/auth/github/callback&scope=repo`;
    res.redirect(redirectUri);
});
// GitHub OAuth Callback
router.get("/github/callback", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const code = req.query.code;
    try {
        // Exchange the authorization code for an access token
        const response = yield axios_1.default.post("https://github.com/login/oauth/access_token", {
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code: code,
        }, {
            headers: {
                Accept: "application/json",
            },
        });
        const accessToken = response.data.access_token;
        if (!accessToken) {
            throw new Error("Failed to obtain access token");
        }
        // Store the access token in the session securely
        req.session.accessToken = accessToken;
        // Redirect back to the main page
        res.redirect(`${process.env.FRONTEND_URL}/?authenticated=true`);
    }
    catch (error) {
        console.error("Error during GitHub OAuth:", error);
        res.status(500).send("Authentication failed.");
    }
}));
// Endpoint to get repositories
router.get("/github/repos", (req, res) => {
    (() => __awaiter(void 0, void 0, void 0, function* () {
        const accessToken = req.session.accessToken;
        if (!accessToken) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        try {
            const response = yield axios_1.default.get("https://api.github.com/user/repos", {
                headers: {
                    Authorization: `token ${accessToken}`,
                },
            });
            res.json(response.data);
        }
        catch (error) {
            console.error("Failed to fetch repositories:", error);
            res.status(500).json({ error: "Failed to fetch repositories" });
        }
    }))();
});
exports.default = router;
