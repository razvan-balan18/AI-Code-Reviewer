import React from "react";

export default function SummaryPanel({ summary }: { summary: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        LLM Summary
      </h3>
      <div className="prose prose-slate dark:prose-invert max-w-none">
        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
          {summary || "No summary provided."}
        </p>
      </div>
    </div>
  );
}
