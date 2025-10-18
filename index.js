const { GoogleGenAI } = require("@google/genai");
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
dotenv.config();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error("FATAL: GEMINI_API_KEY is not set in environment variables.");
    process.exit(1);
}
const genAI = new GoogleGenAI({ apiKey: API_KEY });
const app = express();
app.use(cors());
app.use(express.json()); 
function mapMessagesToContent(messages) {
    return messages.map(msg => ({
        // Map frontend's 'sender' role to SDK's 'role'
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
    }));
}

/**
 * Converts a simple array of message objects (e.g., [{role: 'user', text: '...'}])
 * into the structured Content array required by the Gemini SDK's startChat method.
 * @param {Array<{role: 'user' | 'model', text: string}>} simpleHistory
 * @returns {Array<{role: 'user' | 'model', parts: Array<{text: string}>}>}
 */
function mapHistoryToContent(simpleHistory) {
    return simpleHistory.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }],
    }));
}

app.post("/api/chat", async (req, res) => {
    // Expected from frontend: { history: [...], newMessage: "..." }
    const { history = [], newMessage } = req.body;

    if (!newMessage) {
        return res.status(400).json({ error: "Missing 'newMessage' in request body." });
    }

    try {
        // 1. Construct the full conversation content array
        // NOTE: The new message needs to be structured and added to the content array
        const allMessages = [
            ...history, 
            { sender: 'user', text: newMessage } // Add the new message at the end
        ];

        // 2. Convert to the SDK's required Content structure
        const contentArray = mapMessagesToContent(allMessages);
        
        // 3. Call generateContent with the full conversation history
        // FIX: The SDK uses 'models' to access the GenerativeModel, and we use 
        // generateContent on the client instance with the model name.
        const result = await genAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contentArray, // Pass the full history as contents
        });        
        res.json({ text: result.text });
    } catch (error) {
        console.error("Gemini API Error (500 thrown):", error.message || error); 
        res.status(500).json({ error: "API call failed. Check server logs for details." });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
