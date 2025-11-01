import mongoose from "mongoose";

const IssueSchema = new mongoose.Schema({
  file: String,
  line_start: Number,
  line_end: Number,
  severity: { type: String, enum: ["high", "medium", "low"] },
  category: { type: String, enum: ["bug", "security", "performance", "maintainability", "style"] },
  title: String,
  explanation: String,
  suggested_fix: String,
  confidence: Number,
  snippet: String,
  tool: String
}, { _id: false });

const ReviewRunSchema = new mongoose.Schema({
  runId: { type: String, index: true, unique: true },
  repoPath: String,
  mode: { type: String, enum: ["full", "diff"] },
  createdAt: { type: Date, default: Date.now },
  summary: String,
  issues: [IssueSchema]
});

export const ReviewRun = mongoose.model("ReviewRun", ReviewRunSchema);