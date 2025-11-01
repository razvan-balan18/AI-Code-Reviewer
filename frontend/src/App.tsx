import React, { useState } from "react";
import RepoForm from "./components/RepoForm";
import Results from "./components/Results";
import History from "./components/History";

export default function App() {
  const [runId, setRunId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const handleRunId = (id: string) => {
    setRunId(id);
    setShowHistory(false);
  };

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

        {/* Navigation */}
        <div className="flex gap-3 mb-6 justify-center">
          <button
            onClick={() => {
              setShowHistory(false);
              setRunId(null);
            }}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              !showHistory && !runId
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            New Review
          </button>
          <button
            onClick={() => {
              setShowHistory(true);
              setRunId(null);
            }}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              showHistory
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            History
          </button>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {showHistory ? (
            <History onSelectRun={handleRunId} />
          ) : runId ? (
            <>
              <div className="mb-4">
                <button
                  onClick={() => {
                    setRunId(null);
                    setShowHistory(true);
                  }}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to History
                </button>
              </div>
              <Results runId={runId} />
            </>
          ) : (
            <RepoForm onRunId={handleRunId} />
          )}
        </div>
      </div>
    </div>
  );
}
