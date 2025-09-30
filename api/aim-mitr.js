// api/aim-mitr.js
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests allowed" });
  }

  try {
    // Gemini API setup
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // User message
    const { question } = req.body;

    if (!question || question.trim() === "") {
      return res.status(400).json({ error: "Question missing" });
    }

    // Prompt with educational context
    const prompt = `
You are AIM-Mitr 🎯 — a friendly study buddy for students of AIMERS. 
Keep answers clear, simple, motivating, and exam-focused. 
No abusive or off-topic replies. 
Use references from NCERT, Shaala, Byjus, Teachoo, Sarthak, Careers360, Khan Academy etc. 
Focus mainly on Maths & Science, but guide in other subjects too if needed.

Student asked: ${question}
`;

    // Get response from Gemini
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return res.status(200).json({ answer: text });
  } catch (err) {
    console.error("AIM-Mitr API Error:", err);
    return res.status(500).json({ error: "Something went wrong with AIM-Mitr." });
  }
}
