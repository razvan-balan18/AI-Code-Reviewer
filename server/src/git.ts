import { execSync } from "node:child_process";
import fs from "fs";
import path from "path";

export function getStagedDiff(repoPath: string): string {
  try {
    return execSync("git diff --staged -U0", { cwd: repoPath, encoding: "utf-8" });
  } catch (e) {
    return "";
  }
}

export type Hunk = {
  file: string;
  start: number;
  end: number;
  patch: string;
};

export function parseUnifiedDiff(diff: string): Hunk[] {
  const hunks: Hunk[] = [];
  const fileRegex = /^diff --git a\/(.+?) b\/(.+?)$/m;
  const hunkHeaderRegex = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/m;

  const lines = diff.split("\n");
  let currentFile = "";
  let buffer: string[] = [];
  let start = 0, length = 0;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];

    const fileMatch = l.match(/^diff --git a\/(.+?) b\/(.+?)$/);
    if (fileMatch) {
      currentFile = fileMatch[2];
      continue;
    }
    const headerMatch = l.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (headerMatch) {
      // flush previous buffer
      if (buffer.length && currentFile) {
        hunks.push({ file: currentFile, start, end: start + (length || 0), patch: buffer.join("\n") });
        buffer = [];
      }
      start = parseInt(headerMatch[1], 10);
      length = headerMatch[2] ? parseInt(headerMatch[2], 10) : 1;
      buffer.push(l);
      continue;
    }
    if (currentFile) buffer.push(l);
  }
  if (buffer.length && currentFile) {
    hunks.push({ file: currentFile, start, end: start + (length || 0), patch: buffer.join("\n") });
  }

  return hunks;
}

export function readFileContent(repoPath: string, filePath: string): string {
  const full = path.join(repoPath, filePath);
  try {
    return fs.readFileSync(full, "utf-8");
  } catch {
    return "";
  }
}