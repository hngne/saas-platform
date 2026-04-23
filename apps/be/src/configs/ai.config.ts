import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "./env";

/**
 * Gemini AI Client — Singleton, đọc config từ env.
 * TUYỆT ĐỐI KHÔNG hardcode API key.
 */
let genAI: GoogleGenerativeAI | null = null;
if (env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
}

export const getGeminiModel = (systemInstruction?: string) => {
  if (!genAI) {
    throw new Error("Gemini API Key is missing. Chatbot feature disabled.");
  }
  const config: any = { model: env.GEMINI_MODEL };
  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }
  return genAI.getGenerativeModel(config);
};

export const aiConfig = {
  model: env.GEMINI_MODEL,
  maxHistoryMessages: 20, // Giữ tối đa 20 tin nhắn gần nhất để gửi context
  maxTokens: 2048,
};
