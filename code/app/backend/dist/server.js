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
const github_auth_1 = __importDefault(require("./routes/github-auth"));
const dotenv_1 = require("dotenv");
const express_session_1 = __importDefault(require("express-session"));
const axios_1 = __importDefault(require("axios"));
(0, dotenv_1.config)();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Session middleware setup
app.use((0, express_session_1.default)({
    secret: 'your_secret_key_here',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false, // Set to true if using HTTPS
        httpOnly: true // Helps protect the cookie from client-side scripts
    }
}));
app.use(express_1.default.json());
// GitHub OAuth callback endpoint
app.get("/auth/github/callback", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const code = req.query.code;
    try {
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
        // Store the token in the session securely
        req.session.accessToken = accessToken;
        // Redirect to dashboard without the token in the URL
        res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
    }
    catch (error) {
        console.error("Error during GitHub OAuth:", error);
        res.status(500).send("Authentication failed.");
    }
}));
app.use("/auth", github_auth_1.default);
// Start the server
app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
});
