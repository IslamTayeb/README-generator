import express, { Request, Response, NextFunction } from "express";
import session from "express-session";
import cors from "cors";
import { config } from "dotenv";
import githubAuthRouter from "./routes/github-auth";
import githubCodeFetchRouter from './routes/github-code-fetch';
import bodyParser from "body-parser";


config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration to allow frontend to make authenticated requests
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

// Session middleware setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default_secret_key",
    resave: true,
    saveUninitialized: true,
    cookie: {
      secure: false,
      httpOnly: true,
      sameSite: "lax",
    },
  })
);

// JSON parsing middleware
app.use(express.json());

// Use GitHub auth router for auth-related routes
app.use("/auth", githubAuthRouter);
app.use('/api/github', githubCodeFetchRouter);
app.use(bodyParser.json({limit: "200mb"}));
app.use(bodyParser.urlencoded({limit: "200mb", extended: true }));
app.use(bodyParser.text({ limit: '200mb' }));


app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});
