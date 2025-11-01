export async function review(mode: "full" | "diff", repoPath: string) {
  // Create an AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 660000); // 11 minutes (to give buffer for 10 min Ollama timeout)
  
  try {
    const res = await fetch(`/review/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoPath }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `Request failed with status ${res.status}`);
    }
    return data;
  } catch (e: any) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') {
      throw new Error("Request timeout - the review is taking longer than 6 minutes. This can happen with large codebases. Please try again or use a smaller codebase.");
    }
    throw e;
  }
}

export async function getResults(runId: string) {
  const res = await fetch(`/results/${runId}`);
  return res.json();
}

export async function getHistory() {
  const res = await fetch("/history");
  if (!res.ok) {
    throw new Error("Failed to fetch history");
  }
  return res.json();
}