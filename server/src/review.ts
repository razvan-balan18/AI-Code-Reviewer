import { normalizeFindings, LinterFinding } from "./linters.js";
import { getStagedDiff, parseUnifiedDiff, readFileContent } from "./git.js";
import { callOllama } from "./llm.js";
import { config } from "./config.js";

function findingsForFile(findings: LinterFinding[], file: string, start?: number, end?: number): LinterFinding[] {
  return findings.filter(f => {
    if (f.file.endsWith(file) || f.file === file) {
      if (start !== undefined && end !== undefined) {
        return f.line >= start && f.line <= end;
      }
      return true;
    }
    return false;
  });
}

export function buildFullReviewPrompt(repoPath: string, files: string[], findings: LinterFinding[]): string {
  const maxFiles = config.maxFilesInReview || 5;
  const maxCodeChars = config.maxCodeCharsPerFile || 4000;
  
  const segments = files.slice(0, maxFiles).map((f) => {
    const code = readFileContent(repoPath, f);
    const fFindings = findingsForFile(findings, f);
    return `File: ${f}
Code:
\`\`\`
${code.slice(0, maxCodeChars)}
\`\`\`
Static analysis findings:
${JSON.stringify(fFindings).slice(0, 2000)}
---`;
  }).join("\n");
  return `Project context: Mixed JS/TS and Python.
Goal: Provide concise, actionable review across files. Return JSON with issues and summary.
${segments}`;
}

export function buildDiffReviewPrompt(repoPath: string, diff: string, findings: LinterFinding[]): string {
  const hunks = parseUnifiedDiff(diff);
  const maxHunks = 10; // Reduced from 20
  const segments = hunks.slice(0, maxHunks).map(h => {
    const code = readFileContent(repoPath, h.file);
    const fFindings = findingsForFile(findings, h.file, h.start, h.end);
    const context = code.split("\n").slice(Math.max(0, h.start - 10), h.end + 10).join("\n"); // Reduced context
    return `File: ${h.file}
Changed lines: ${h.start}-${h.end}
Unified diff hunk:
\`\`\`diff
${h.patch.slice(0, 2000)}
\`\`\`
Context:
\`\`\`
${context.slice(0, 3000)}
\`\`\`
Static analysis findings in range:
${JSON.stringify(fFindings).slice(0, 1500)}
---`;
  }).join("\n");
  return `Project context: Mixed JS/TS and Python.
Goal: Focus review on changed lines only. Return JSON with issues and summary.
${segments || "No staged changes found."}`;
}