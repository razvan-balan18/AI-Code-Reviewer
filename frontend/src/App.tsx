import React, { useState } from "react";
import RepoForm from "./components/RepoForm";
import Results from "./components/Results";

export default function App() {
  const [runId, setRunId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            AI Code Reviewer
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Privacy-first code reviews using local LLM + linters. Supports full and incremental (staged diff) review.
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          <RepoForm onRunId={setRunId} />
          {runId && <Results runId={runId} />}
        </div>
      </div>
    </div>
  );
}
