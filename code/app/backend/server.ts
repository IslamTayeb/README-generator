import express, { Request, Response, NextFunction } from "express";
import session from "express-session";
import cors from "cors";
import { config } from "dotenv";
import githubAuthRouter from "./routes/github-auth"; // Import the GitHub authentication router

config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration to allow frontend to make authenticated requests
app.use(
  cors({
    origin: process.env.FRONTEND_URL, // Set this to your frontend URL
    credentials: true, // Allow cookies to be sent
  })
);

// Session middleware setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default_secret_key",
    resave: true,
    saveUninitialized: true,
    cookie: {
      secure: false, // Should be true in production (when using HTTPS)
      httpOnly: true,
      sameSite: "lax", // Helps with CSRF issues (adjust as needed)
    },
  })
);

// JSON parsing middleware
app.use(express.json());

// Use GitHub auth router for auth-related routes
app.use("/auth", githubAuthRouter);

app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});
