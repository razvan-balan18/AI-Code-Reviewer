import { spawnSync } from "node:child_process";
import { config } from "./config.js";

export function buildSystemPrompt() {
  return `You are a senior code reviewer. Analyze provided code and linter findings.

CRITICAL: You must respond with ONLY valid JSON. Do NOT include markdown code blocks, do NOT include explanations before or after the JSON, do NOT include any text outside the JSON object.

Required JSON structure:
{
  "issues": [
    {
      "file": "filename",
      "line_start": 1,
      "line_end": 1,
      "severity": "high|medium|low",
      "category": "bug|security|performance|maintainability|style",
      "title": "Issue title",
      "explanation": "Detailed explanation",
      "suggested_fix": "Fix suggestion",
      "confidence": 0.8
    }
  ],
  "summary": "Review summary"
}

Review rules:
- Focus on changed code if diff provided.
- Be specific and actionable.
- Do not repeat linter text verbatim; enrich it with reasoning and fixes.
- Limit to 10 issues per prompt.
- Identify security vulnerabilities (eval, hardcoded passwords, SQL injection risks).
- Identify code quality issues (unused variables, code smells).

REMEMBER: Start your response with { and end with }. No markdown, no code blocks, no explanations. ONLY JSON.`;
}

export function extractJsonFromOutput(output: string): string {
  if (!output || output.trim().length === 0) {
    return "{}";
  }
  
  let jsonStr = output.trim();
  
  // Strategy 1: Remove markdown code blocks if present
  const jsonBlockMatch = jsonStr.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    jsonStr = jsonBlockMatch[1].trim();
  }
  
  // Strategy 2: Find JSON object boundaries by matching braces
  const firstBrace = jsonStr.indexOf('{');
  const lastBrace = jsonStr.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
  } else if (firstBrace === -1 || lastBrace === -1) {
    // No valid JSON found
    return "{}";
  }
  
  // Strategy 3: Try to fix common issues
  jsonStr = jsonStr.trim();
  
  // Remove trailing commas before closing braces/brackets
  jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
  
  // Fix unescaped quotes in strings (basic attempt)
  // This is tricky, so we'll be careful
  
  // If still no braces, return empty object
  if (!jsonStr.includes('{') || !jsonStr.includes('}')) {
    return "{}";
  }
  
  return jsonStr;
}

export function tryParseJsonWithFallback(jsonStr: string): { success: boolean; data: any; error?: string } {
  // Try direct parsing first
  try {
    const parsed = JSON.parse(jsonStr);
    return { success: true, data: parsed };
  } catch (e: any) {
    const firstError = e.message;
    
    // Try to fix common JSON issues
    try {
      // Fix trailing commas
      let fixed = jsonStr.replace(/,(\s*[}\]])/g, '$1');
      const parsed = JSON.parse(fixed);
      return { success: true, data: parsed };
    } catch (e2: any) {
      // Try removing everything before first { and after last }
      try {
        const firstBrace = jsonStr.indexOf('{');
        const lastBrace = jsonStr.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          const extracted = jsonStr.substring(firstBrace, lastBrace + 1);
          const parsed = JSON.parse(extracted);
          return { success: true, data: parsed };
        }
      } catch (e3: any) {
        // All parsing attempts failed
        return { success: false, data: null, error: firstError };
      }
    }
    
    return { success: false, data: null, error: firstError };
  }
}

export function callOllama(prompt: string): string {
  const fullPrompt = `${buildSystemPrompt()}\n\n${prompt}`;
  const trimmed = fullPrompt.slice(0, config.maxPromptChars);
  
  console.log(`Starting Ollama call with model: ${config.ollamaModel}, timeout: ${config.ollamaTimeout}ms`);
  console.log(`Prompt length: ${trimmed.length} chars`);
  
  try {
    const proc = spawnSync("ollama", ["run", config.ollamaModel], {
      input: trimmed,
      encoding: "utf-8",
      timeout: config.ollamaTimeout,
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    
    if (proc.error) {
      console.error("Ollama spawn error:", proc.error);
      if (proc.error.code === 'ETIMEDOUT') {
        throw new Error(`Ollama request timed out after ${config.ollamaTimeout}ms. The model may be too slow or the prompt too long. Try a smaller model or reduce the code being reviewed.`);
      }
      if (proc.error.code === 'ENOENT') {
        throw new Error(`Ollama not found. Please ensure Ollama is installed and available in your PATH.`);
      }
      throw new Error(`Failed to run Ollama: ${proc.error.message}`);
    }
    
    if (proc.status !== 0) {
      const errorMsg = proc.stderr?.toString() || "Unknown error";
      console.error("Ollama execution error:", errorMsg);
      if (errorMsg.includes("model") && errorMsg.includes("not found")) {
        throw new Error(`Model "${config.ollamaModel}" not found. Please pull it with: ollama pull ${config.ollamaModel}`);
      }
      throw new Error(`Ollama execution failed: ${errorMsg}`);
    }
    
    const output = proc.stdout?.toString() || "{}";
    console.log("Ollama raw output (first 1000 chars):", output.substring(0, 1000));
    console.log("Ollama raw output length:", output.length);
    
    // Return raw output - extraction will happen in the calling code
    // This allows better error logging
    return output;
  } catch (e: any) {
    console.error("Ollama call error:", e);
    throw new Error(`Ollama call failed: ${e.message || "Unknown error"}`);
  }
}
