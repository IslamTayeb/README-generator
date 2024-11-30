import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

router.post('/generate-section', async (req, res) => {
    try {
        const { title, description, repoUrl, currentMarkdown } = req.body;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Given the following context about a software project:

Repository URL: ${repoUrl}
Current README content:
${currentMarkdown}

Generate a new section for the README with the title "${title}".
${description ? `The section should address: ${description}` : ''}

Requirements:
1. Start the section with "## ${title}"
2. Make the content specific to this project based on the existing README
3. Keep the content concise but informative
4. Use proper markdown formatting
5. Don't repeat information that's already in other sections

Generate only the new section content with no additional text.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const sectionContent = response.text();

        res.json({ section: sectionContent });
    } catch (error) {
        console.error('Error generating section:', error);
        res.status(500).json({ error: 'Failed to generate section' });
    }
});

router.post('/generate-template-section', async (req, res) => {
    try {
        const { template, repoUrl, currentMarkdown } = req.body;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Given the following context about a software project:

Repository URL: ${repoUrl}
Current README content:
${currentMarkdown}

Generate a "${template}" section for the README.

Requirements:
1. Start the section with "## ${template}"
2. Make the content specific to this project based on the existing README
3. Keep the content concise but informative
4. Use proper markdown formatting
5. Don't repeat information that's already in other sections
6. Follow common best practices for this type of section

Generate only the new section content with no additional text.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const sectionContent = response.text();

        res.json({ section: sectionContent });
    } catch (error) {
        console.error('Error generating template section:', error);
        res.status(500).json({ error: 'Failed to generate template section' });
    }
});

export default router;
