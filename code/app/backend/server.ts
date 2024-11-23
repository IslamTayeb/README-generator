import express from "express";
import githubAuthRoutes from "./routes/github-auth";
import { config } from "dotenv";
import session from "express-session";
import axios from "axios";

config();

const app = express();
const PORT = process.env.PORT || 3001;

// Session middleware setup
app.use(session({
  secret: 'your_secret_key_here',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false, // Set to true if using HTTPS
    httpOnly: true // Helps protect the cookie from client-side scripts
  }
}));

app.use(express.json());

// GitHub OAuth callback endpoint
app.get("/auth/github/callback", async (req, res) => {
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

    // Store the token in the session securely
    req.session.accessToken = accessToken;

    // Redirect to dashboard without the token in the URL
    res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
  } catch (error) {
    console.error("Error during GitHub OAuth:", error);
    res.status(500).send("Authentication failed.");
  }
});

app.use("/auth", githubAuthRoutes);

// Start the server
app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});
