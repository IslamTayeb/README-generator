# README.md Generator



## Configuration

This application requires several environment variables to be set in the backend's `.env` file.  These variables provide authentication credentials and URLs for the various services used.  Ensure you have obtained the necessary API keys and IDs before running the application.  The required variables are:

* `PORT`: The port number the backend server will listen on.
* `SESSION_SECRET`: A secret key used for session management.  Generate a strong, random secret.
* `GITHUB_CLIENT_ID`: Your GitHub OAuth application client ID.
* `GITHUB_CLIENT_SECRET`: Your GitHub OAuth application client secret.
* `GEMINI_API_KEY`: Your Google Gemini API key.
* `FRONTEND_URL`: The URL of your frontend application.
* `BACKEND_URL`: The URL of your backend application.


The frontend does not require any explicit configuration beyond installing dependencies as detailed in the "Frontend Setup" section.

<div align="center">
blob:http://localhost:3000/547e2dda-085a-468d-9cff-befdda20ef4c
</div>


## Project Overview

This project provides a web application that streamlines the process of creating comprehensive README.md files for software projects hosted on GitHub.  It leverages a large language model (LLM) to analyze a project's codebase and automatically generate various sections of a README, including project overview, features, installation, usage, dependencies, and contribution guidelines. The application is designed to be user-friendly, even for those unfamiliar with Markdown syntax.



## Main Features and Functionality

* **GitHub Authentication:** Securely connects to GitHub using OAuth 2.0 for accessing repository data.
* **Repository Selection:** Allows users to select a GitHub repository from their authenticated account.
* **Codebase Analysis:** Analyzes the selected repository's codebase, identifying relevant files and extracting information for README generation.  Supports Jupyter Notebook (.ipynb) files, converting them to Markdown.  Large files are excluded to avoid exceeding LLM token limits.
* **README Generation:** Employs a powerful LLM (currently Gemini) to generate a well-structured and informative README.md file based on the code analysis.  Includes options for custom project context.
* **Markdown Editor:** Provides a rich Markdown editor (Monaco Editor) for users to refine the generated README content.
* **Real-time Preview:** Offers a live preview of the README as it's being edited.
* **Section Management:** Allows users to manage individual sections of the README, creating, editing and re-ordering sections as needed.
* **GitHub Submission:** Enables users to directly submit the generated/edited README.md file back to their GitHub repository.
* **Progress Indication:** Provides real-time feedback during the README generation process, including token count and progress messages.
* **Future Enhancements (See TODO):** Planned features include ExcaliDraw integration for diagrams, a multi-agent LLM system for code editing and separate chatting, advanced user accounts, and a Markdown tutorial.




## Setup and Installation Instructions

This project consists of a frontend and a backend.

### Backend Setup

1. **Clone the repository:**
   ```bash
   git clone <repository_url>
   ```

2. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Set environment variables:** Create a `.env` file in the `backend` directory and add the following:
   ```
   PORT=<port_number>
   SESSION_SECRET=<your_session_secret>
   GITHUB_CLIENT_ID=<your_github_client_id>
   GITHUB_CLIENT_SECRET=<your_github_client_secret>
   GEMINI_API_KEY=<your_gemini_api_key>
   FRONTEND_URL=<your_frontend_url>
   BACKEND_URL=<your_backend_url>
   ```
   Replace the placeholders with your actual values.

4. **Start the server:**
   ```bash
   npm start
   ```

### Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```



## Usage Guide

1.  **Authentication:** Upon opening the application, you'll be prompted to authenticate with GitHub.
2.  **Repository Selection:** Choose the GitHub repository you want to generate a README for.
3.  **README Generation:** The application will begin fetching the repository's contents and processing it with the LLM. You will see the generation progress displayed.
4.  **Edit and Refine:** Use the Markdown editor to modify and improve the generated README. The preview will update in real-time.
5.  **Section Management:** Use the sidebar to manage individual sections.
6.  **Submission:** Once you're satisfied, click the "Submit to GitHub" button to push the changes to your repository.



## Dependencies

* **Frontend:** React, Next.js, Tailwind CSS, Monaco Editor, Lucide React, Framer Motion, Lodash, Axios, js-base64.
* **Backend:** Express.js, `express-session`, cors, axios, `dotenv`, `@google/generative-ai`, `js-base64`, `fitz` (PyMuPDF), `fs/promises`, `path`, `@anthropic-ai/tokenizer`.



## How to Contribute

1.  Fork this repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes and test thoroughly.
4.  Commit your changes with clear and concise commit messages.
5.  Push your branch to your forked repository.
6.  Create a pull request to merge your changes into the main branch of this repository.




## TODO

The following features are planned for future development:

* **Add ExcaliDraw integration:** Integrate ExcaliDraw as a sub-window within the application allowing for diagram creation and export directly into the Markdown editor.
* **Dual LLM Agents:** Implement two LLM agents: one for direct code editing within the Monaco editor via chat, and another for general conversation without affecting the code.
* **Section Title Refresh:**  Add a button to automatically detect and update the section title based on the first `#` or `##` header in the Monaco editor.
* **Improved Prompts:** Refine the prompts given to the LLM to improve the quality and accuracy of the generated README.
* **Account Functionality:** Add user accounts to save progress and project settings.
* **Section Generator Scope:** Decide whether the section generator should consider the entire codebase or just the README file.  Implement window management to handle complexity.
* **Frontend Markdown Tutorial:** Create a frontend tutorial to help users understand and use Markdown effectively.
