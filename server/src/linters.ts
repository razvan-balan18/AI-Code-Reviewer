import { execSync } from "node:child_process";
import path from "path";

export type LinterFinding = {
  tool: string;
  file: string;
  line: number;
  severity: "high" | "medium" | "low";
  rule: string;
  message: string;
};

function severityFromEslint(ruleSeverity: number): "high" | "medium" | "low" {
  if (ruleSeverity === 2) return "high";
  if (ruleSeverity === 1) return "medium";
  return "low";
}

export function runRuff(repoPath: string): LinterFinding[] {
  try {
    // Try ruff check with JSON output format
    const out = execSync("ruff check --output-format json .", { 
      cwd: repoPath, 
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"] // Suppress stderr
    });
    const json = JSON.parse(out);
    // Handle both array and object response formats
    const violations = Array.isArray(json) ? json : json.violations || [];
    return violations.map((item: any) => ({
      tool: "ruff",
      file: item.filename || item.path || "",
      line: item.location?.row || item.location?.line || 1,
      severity: item.code?.startsWith("S") || item.rule_id?.startsWith("S") ? "high" : "medium",
      rule: item.code || item.rule_id || "ruff",
      message: item.message || ""
    }));
  } catch (e: any) {
    // If ruff fails, silently return empty array
    return [];
  }
}

export function runEslint(repoPath: string): LinterFinding[] {
  try {
    // Use --no-config-lookup to avoid config file errors, or suppress stderr
    const out = execSync("npx eslint -f json .", { 
      cwd: repoPath, 
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"] // Suppress stderr to avoid config file warnings
    });
    const json = JSON.parse(out);
    const findings: LinterFinding[] = [];
    // Handle both array format and object format responses
    const files = Array.isArray(json) ? json : [];
    for (const file of files) {
      for (const msg of file.messages || []) {
        // Normalize file path separators for Windows/Unix compatibility
        let filePath = file.filePath || "";
        if (filePath.startsWith(repoPath)) {
          filePath = filePath.replace(repoPath + path.sep, "").replace(repoPath + "/", "");
        }
        findings.push({
          tool: "eslint",
          file: filePath,
          line: msg.line || 1,
          severity: severityFromEslint(msg.severity || 1),
          rule: msg.ruleId || "eslint",
          message: msg.message || ""
        });
      }
    }
    return findings;
  } catch (e: any) {
    // If eslint fails (no config, not found, etc.), silently return empty array
    return [];
  }
}

export function normalizeFindings(repoPath: string): LinterFinding[] {
  const ruff = runRuff(repoPath);
  const eslint = runEslint(repoPath);
  return [...ruff, ...eslint];
}