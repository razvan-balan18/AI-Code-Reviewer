import express from "express";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { config } from "./config.js";
import { ReviewRun } from "./models/ReviewRun.js";
import { normalizeFindings } from "./linters.js";
import { callOllama, extractJsonFromOutput, tryParseJsonWithFallback } from "./llm.js";
import { buildFullReviewPrompt, buildDiffReviewPrompt } from "./review.js";
import { getStagedDiff } from "./git.js";
import { v4 as uuidv4 } from "uuid";

// Normalize category to match schema enum
function normalizeCategory(category: string): "bug" | "security" | "performance" | "maintainability" | "style" {
  const cat = (category || "").toLowerCase().trim();
  // Map common variations to valid enum values
  const categoryMap: Record<string, "bug" | "security" | "performance" | "maintainability" | "style"> = {
    "code quality": "maintainability",
    "codequality": "maintainability",
    "quality": "maintainability",
    "best practices": "maintainability",
    "bestpractices": "maintainability",
    "coding standards": "style",
    "codingstandards": "style",
    "convention": "style",
    "vulnerability": "security",
    "injection": "security",
    "sql injection": "security",
    "xss": "security",
    "error": "bug",
    "exception": "bug",
    "crash": "bug",
    "optimization": "performance",
    "speed": "performance",
    "memory": "performance",
  };
  
  if (categoryMap[cat]) {
    return categoryMap[cat];
  }
  
  // Default mappings for known valid values
  if (["bug", "security", "performance", "maintainability", "style"].includes(cat)) {
    return cat as "bug" | "security" | "performance" | "maintainability" | "style";
  }
  
  // Default to maintainability if unknown
  return "maintainability";
}

// Normalize severity to match schema enum
function normalizeSeverity(severity: string): "high" | "medium" | "low" {
  const sev = (severity || "medium").toLowerCase().trim();
  if (["high", "medium", "low"].includes(sev)) {
    return sev as "high" | "medium" | "low";
  }
  return "medium";
}

// Normalize summary - convert object to string if needed
function normalizeSummary(summary: any): string {
  if (typeof summary === "string") {
    return summary;
  }
  if (typeof summary === "object" && summary !== null) {
    // If it's an object with stats, create a readable summary
    if (summary.total_issues !== undefined) {
      const parts: string[] = [];
      if (summary.total_issues > 0) {
        parts.push(`Found ${summary.total_issues} issue(s)`);
        if (summary.high_issues) parts.push(`${summary.high_issues} high`);
        if (summary.medium_issues) parts.push(`${summary.medium_issues} medium`);
        if (summary.low_issues) parts.push(`${summary.low_issues} low`);
      } else {
        parts.push("No issues found");
      }
      return parts.join(", ") + ".";
    }
    // Fallback: stringify the object
    return JSON.stringify(summary);
  }
  return "Review completed";
}

// Normalize parsed LLM output to match schema
function normalizeParsedOutput(parsed: any): { issues: any[]; summary: string } {
  const normalized = {
    issues: (parsed.issues || []).map((issue: any) => ({
      file: issue.file || "",
      line_start: issue.line_start || issue.line || 1,
      line_end: issue.line_end || issue.line || issue.line_start || 1,
      severity: normalizeSeverity(issue.severity),
      category: normalizeCategory(issue.category),
      title: issue.title || "Issue",
      explanation: issue.explanation || "",
      suggested_fix: issue.suggested_fix || issue.suggestion || "",
      confidence: typeof issue.confidence === "number" ? Math.max(0, Math.min(1, issue.confidence)) : 0.7,
      snippet: issue.snippet || "",
      tool: "llm"
    })),
    summary: normalizeSummary(parsed.summary)
  };
  
  return normalized;
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));

mongoose.connect(config.mongoUri).then(() => {
  console.log("Mongo connected");
}).catch(err => {
  console.error("Mongo error", err);
});

app.post("/review/full", async (req, res) => {
  // Set longer timeout for this endpoint
  req.setTimeout(660000); // 11 minutes
  res.setTimeout(660000);
  
  try {
    const { repoPath } = req.body;
    if (!repoPath) return res.status(400).json({ error: "repoPath required" });

    // Validate that the path exists and is a directory
    try {
      const stats = fs.statSync(repoPath);
      if (!stats.isDirectory()) {
        return res.status(400).json({ error: "repoPath must be a directory" });
      }
    } catch (e: any) {
      if (e.code === "ENOENT") {
        return res.status(400).json({ error: "Repository path does not exist" });
      }
      return res.status(400).json({ error: `Cannot access repository path: ${e.message}` });
    }

    const findings = normalizeFindings(repoPath);

    // List files (basic approach: include common code files)
    function listFiles(dir: string): string[] {
      const all: string[] = [];
      try {
        const items = fs.readdirSync(dir);
        for (const it of items) {
          try {
            const full = path.join(dir, it);
            const stat = fs.statSync(full);
            if (stat.isDirectory() && !it.startsWith(".") && it !== "node_modules" && it !== ".git") {
              all.push(...listFiles(full));
            } else if (stat.isFile() && /\.(ts|tsx|js|jsx|py)$/.test(it)) {
              all.push(path.relative(dir, full));
            }
          } catch (e) {
            // Skip files/directories that can't be accessed (permissions, broken symlinks, etc.)
            continue;
          }
        }
      } catch (e) {
        // If directory can't be read, return empty array
        console.warn(`Cannot read directory ${dir}:`, e);
      }
      return all;
    }
    const files = listFiles(repoPath).slice(0, config.maxFilesInReview || 5);

    const prompt = buildFullReviewPrompt(repoPath, files, findings);
    let parsed: any = { issues: [], summary: "Review completed" };
    let rawOutput = "";
    let ollamaError: any = null;
    try {
      rawOutput = callOllama(prompt);
      console.log("=== OLLAMA RAW OUTPUT ===");
      console.log("Length:", rawOutput.length);
      console.log("First 2000 chars:", rawOutput.substring(0, 2000));
      console.log("Last 500 chars:", rawOutput.substring(Math.max(0, rawOutput.length - 500)));
      
      const extracted = extractJsonFromOutput(rawOutput);
      console.log("=== EXTRACTED JSON ===");
      console.log("Length:", extracted.length);
      console.log("First 1000 chars:", extracted.substring(0, 1000));
      
      const parseResult = tryParseJsonWithFallback(extracted);
      if (parseResult.success) {
        parsed = parseResult.data;
        // Normalize the parsed output to match schema
        const normalized = normalizeParsedOutput(parsed);
        parsed = normalized;
        console.log(`✓ Successfully parsed ${parsed.issues.length} issues from LLM`);
      } else {
        console.error("=== JSON PARSING FAILED ===");
        console.error("Error:", parseResult.error);
        console.error("Extracted JSON that failed:", extracted);
        // Try one more time with the raw output
        const rawParseResult = tryParseJsonWithFallback(rawOutput);
        if (rawParseResult.success) {
          console.log("✓ Successfully parsed from raw output");
          parsed = rawParseResult.data;
          // Normalize the parsed output to match schema
          const normalized = normalizeParsedOutput(parsed);
          parsed = normalized;
        } else {
          throw new Error(parseResult.error || "JSON parsing failed");
        }
      }
    } catch (parseError: any) {
      console.error("=== FINAL PARSING ERROR ===");
      console.error("Error message:", parseError.message);
      console.error("Raw output length:", rawOutput.length);
      console.error("Raw output (first 3000 chars):", rawOutput.substring(0, 3000));
      
      // Check if this is an Ollama timeout error
      if (parseError.message && parseError.message.includes("timed out")) {
        ollamaError = parseError;
        throw parseError; // Re-throw to return error response
      }
      
      // Try to create a basic summary from the raw output even if JSON parsing failed
      const summary = rawOutput.length > 0 
        ? `LLM returned text but JSON parsing failed. Output preview: ${rawOutput.substring(0, 300)}${rawOutput.length > 300 ? "..." : ""}`
        : "LLM output parsing failed. The model may have returned invalid JSON.";
      parsed = { issues: [], summary: summary };
    }

    const runId = uuidv4();
    // Ensure all issues have tool field set
    const normalizedIssues = (parsed.issues || []).map((i: any) => ({
      ...i,
      tool: i.tool || "llm"
    }));
    
    const doc = await ReviewRun.create({
      runId,
      repoPath,
      mode: "full",
      summary: parsed.summary || "Review completed",
      issues: normalizedIssues
    });

    // Merge linter issues (labelled tool=ruff/eslint)
    const mergedIssues = [
      ...doc.issues,
      ...findings.map(f => ({
        file: f.file,
        line_start: f.line,
        line_end: f.line,
        severity: f.severity,
        category: "maintainability",
        title: `${f.tool}:${f.rule}`,
        explanation: f.message,
        suggested_fix: "",
        confidence: 0.7,
        snippet: "",
        tool: f.tool
      }))
    ];

    await ReviewRun.updateOne({ runId }, { issues: mergedIssues });

    res.json({ runId });
  } catch (e: any) {
    console.error("Full review error:", e);
    
    // If Ollama timed out, return a helpful error message
    if (e?.message && (e.message.includes("timed out") || e.message.includes("ETIMEDOUT"))) {
      return res.status(504).json({ 
        error: `Review timed out after ${config.ollamaTimeout / 1000 / 60} minutes. The model (${config.ollamaModel}) may be too slow for this codebase. Try using a smaller/faster model or reducing the amount of code being reviewed.`,
        timeout: true
      });
    }
    
    const errorMessage = e?.message || "Review failed";
    res.status(500).json({ error: errorMessage });
  }
});

app.post("/review/diff", async (req, res) => {
  // Set longer timeout for this endpoint
  req.setTimeout(660000); // 11 minutes
  res.setTimeout(660000);
  
  try {
    const { repoPath } = req.body;
    if (!repoPath) return res.status(400).json({ error: "repoPath required" });

    // Validate that the path exists and is a directory
    try {
      const stats = fs.statSync(repoPath);
      if (!stats.isDirectory()) {
        return res.status(400).json({ error: "repoPath must be a directory" });
      }
    } catch (e: any) {
      if (e.code === "ENOENT") {
        return res.status(400).json({ error: "Repository path does not exist" });
      }
      return res.status(400).json({ error: `Cannot access repository path: ${e.message}` });
    }

    const findings = normalizeFindings(repoPath);
    const diff = getStagedDiff(repoPath);
    const prompt = buildDiffReviewPrompt(repoPath, diff, findings);
    let parsed: any = { issues: [], summary: "Review completed (diff)" };
    let rawOutput = "";
    try {
      rawOutput = callOllama(prompt);
      console.log("=== OLLAMA RAW OUTPUT (DIFF) ===");
      console.log("Length:", rawOutput.length);
      console.log("First 2000 chars:", rawOutput.substring(0, 2000));
      
      const extracted = extractJsonFromOutput(rawOutput);
      console.log("=== EXTRACTED JSON (DIFF) ===");
      console.log("First 1000 chars:", extracted.substring(0, 1000));
      
      const parseResult = tryParseJsonWithFallback(extracted);
      if (parseResult.success) {
        parsed = parseResult.data;
        // Normalize the parsed output to match schema
        const normalized = normalizeParsedOutput(parsed);
        parsed = normalized;
        parsed.summary = parsed.summary || "Review completed (diff)";
        console.log(`✓ Successfully parsed ${parsed.issues.length} issues from LLM (diff)`);
      } else {
        console.error("=== JSON PARSING FAILED (DIFF) ===");
        console.error("Error:", parseResult.error);
        const rawParseResult = tryParseJsonWithFallback(rawOutput);
        if (rawParseResult.success) {
          parsed = rawParseResult.data;
          // Normalize the parsed output to match schema
          const normalized = normalizeParsedOutput(parsed);
          parsed = normalized;
          parsed.summary = parsed.summary || "Review completed (diff)";
        } else {
          throw new Error(parseResult.error || "JSON parsing failed");
        }
      }
    } catch (parseError: any) {
      console.error("=== FINAL PARSING ERROR (DIFF) ===");
      console.error("Error:", parseError.message);
      console.error("Raw output (first 3000 chars):", rawOutput.substring(0, 3000));
      
      // Check if this is an Ollama timeout error
      if (parseError.message && parseError.message.includes("timed out")) {
        throw parseError; // Re-throw to return error response
      }
      
      const summary = rawOutput.length > 0 
        ? `LLM returned text but JSON parsing failed. Output preview: ${rawOutput.substring(0, 300)}${rawOutput.length > 300 ? "..." : ""}`
        : "LLM output parsing failed. The model may have returned invalid JSON.";
      parsed = { issues: [], summary: summary };
    }

    const runId = uuidv4();
    // Ensure all issues have tool field set
    const normalizedIssues = (parsed.issues || []).map((i: any) => ({
      ...i,
      tool: i.tool || "llm"
    }));
    
    const doc = await ReviewRun.create({
      runId,
      repoPath,
      mode: "diff",
      summary: parsed.summary || "Review completed (diff)",
      issues: normalizedIssues
    });

    // Merge linter findings limited to staged files
    const mergedIssues = [
      ...doc.issues,
      ...findings.map(f => ({
        file: f.file,
        line_start: f.line,
        line_end: f.line,
        severity: f.severity,
        category: "maintainability",
        title: `${f.tool}:${f.rule}`,
        explanation: f.message,
        suggested_fix: "",
        confidence: 0.7,
        snippet: "",
        tool: f.tool
      }))
    ];

    await ReviewRun.updateOne({ runId }, { issues: mergedIssues });

    res.json({ runId });
  } catch (e: any) {
    console.error("Diff review error:", e);
    
    // If Ollama timed out, return a helpful error message
    if (e?.message && (e.message.includes("timed out") || e.message.includes("ETIMEDOUT"))) {
      return res.status(504).json({ 
        error: `Review timed out after ${config.ollamaTimeout / 1000 / 60} minutes. The model (${config.ollamaModel}) may be too slow for this codebase. Try using a smaller/faster model or reducing the amount of code being reviewed.`,
        timeout: true
      });
    }
    
    const errorMessage = e?.message || "Diff review failed";
    res.status(500).json({ error: errorMessage });
  }
});

app.get("/results/:runId", async (req, res) => {
  try {
    const doc = await ReviewRun.findOne({ runId: req.params.runId }).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: "Fetch failed" });
  }
});

app.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
});