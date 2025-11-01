import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ai_code_reviewer",
  ollamaModel: process.env.OLLAMA_MODEL || "codellama:7b-instruct", // Faster default model
  maxPromptChars: parseInt(process.env.MAX_PROMPT_CHARS || "12000", 10), // Reduced for speed
  ollamaTimeout: parseInt(process.env.OLLAMA_TIMEOUT || "300000", 10), // 5 minutes default (faster model)
  maxFilesInReview: parseInt(process.env.MAX_FILES_IN_REVIEW || "5", 10), // Reduced from 10
  maxCodeCharsPerFile: parseInt(process.env.MAX_CODE_CHARS_PER_FILE || "4000", 10) // Reduced from 8000
};