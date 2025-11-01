import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ai_code_reviewer",
  ollamaModel: process.env.OLLAMA_MODEL || "codellama",
  maxPromptChars: parseInt(process.env.MAX_PROMPT_CHARS || "15000", 10),
  ollamaTimeout: parseInt(process.env.OLLAMA_TIMEOUT || "600000", 10) // 10 minutes default
};