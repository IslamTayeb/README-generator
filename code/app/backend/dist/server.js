"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_session_1 = __importDefault(require("express-session"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = require("dotenv");
const github_auth_1 = __importDefault(require("./routes/github-auth")); // Import the GitHub authentication router
(0, dotenv_1.config)();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// CORS configuration to allow frontend to make authenticated requests
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL, // Set this to your frontend URL
    credentials: true, // Allow cookies to be sent
}));
// Session middleware setup
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || "default_secret_key",
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: false, // Should be true in production (when using HTTPS)
        httpOnly: true,
        sameSite: "lax", // Helps with CSRF issues (adjust as needed)
    },
}));
// JSON parsing middleware
app.use(express_1.default.json());
// Use GitHub auth router for auth-related routes
app.use("/auth", github_auth_1.default);
app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
});
