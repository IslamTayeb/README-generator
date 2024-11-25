"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_session_1 = __importDefault(require("express-session"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = require("dotenv");
const github_auth_1 = __importDefault(require("./routes/github-auth"));
const github_code_fetch_1 = __importDefault(require("./routes/github-code-fetch"));
const body_parser_1 = __importDefault(require("body-parser"));
(0, dotenv_1.config)();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// CORS configuration to allow frontend to make authenticated requests
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL,
    credentials: true,
}));
// Session middleware setup
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || "default_secret_key",
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: false,
        httpOnly: true,
        sameSite: "lax",
    },
}));
// JSON parsing middleware
app.use(express_1.default.json());
// Use GitHub auth router for auth-related routes
app.use("/auth", github_auth_1.default);
app.use('/api/github', github_code_fetch_1.default);
app.use(body_parser_1.default.json({ limit: "50mb" }));
app.use(body_parser_1.default.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }));
app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
});
