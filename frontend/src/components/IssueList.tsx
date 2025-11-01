import React, { useMemo, useState } from "react";

type Issue = {
  file: string;
  line_start: number;
  line_end: number;
  severity: "high"|"medium"|"low";
  category: string;
  title: string;
  explanation: string;
  suggested_fix: string;
  confidence: number;
  snippet?: string;
  tool?: string;
};

function Badge({ label, colorClass }: { label: string, colorClass: string }) {
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
      {label}
    </span>
  );
}

export default function IssueList({ issues }: { issues: Issue[] }) {
  const [filter, setFilter] = useState<"all"|"high"|"medium"|"low">("all");

  const filtered = useMemo(() => {
    if (filter === "all") return issues;
    return issues.filter(i => i.severity === filter);
  }, [issues, filter]);

  const filterButtons = [
    { key: "all" as const, label: "All", count: issues.length, activeClass: "bg-slate-600 hover:bg-slate-700" },
    { key: "high" as const, label: "High", count: issues.filter(i => i.severity === "high").length, activeClass: "bg-red-600 hover:bg-red-700" },
    { key: "medium" as const, label: "Medium", count: issues.filter(i => i.severity === "medium").length, activeClass: "bg-amber-600 hover:bg-amber-700" },
    { key: "low" as const, label: "Low", count: issues.filter(i => i.severity === "low").length, activeClass: "bg-green-600 hover:bg-green-700" },
  ];

  const getSeverityBadgeClass = (severity: string) => {
    switch(severity) {
      case "high": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "medium": return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
      case "low": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      default: return "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300";
    }
  };

  const getCategoryColor = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes("security")) return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
    if (cat.includes("bug")) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    if (cat.includes("performance")) return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    if (cat.includes("maintainability")) return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
    return "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300";
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Issues ({filtered.length})
        </h3>
        <div className="flex flex-wrap gap-2">
          {filterButtons.map((btn) => (
            <button
              key={btn.key}
              onClick={() => setFilter(btn.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-all transform hover:scale-105 active:scale-95 ${
                filter === btn.key 
                  ? `${btn.activeClass} shadow-lg` 
                  : "bg-slate-400 hover:bg-slate-500"
              }`}
            >
              {btn.label} ({btn.count})
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-4 text-slate-500 dark:text-slate-400">No issues found with this filter.</p>
        </div>
      )}

      <div className="space-y-4">
        {filtered.map((i, idx) => (
          <div
            key={idx}
            className="border border-slate-200 dark:border-slate-700 rounded-lg p-5 hover:shadow-md transition-shadow bg-slate-50/50 dark:bg-slate-900/50"
          >
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge label={i.severity.toUpperCase()} colorClass={getSeverityBadgeClass(i.severity)} />
              <Badge label={i.category} colorClass={getCategoryColor(i.category)} />
              {i.tool && (
                <Badge label={i.tool} colorClass="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300" />
              )}
            </div>

            <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              {i.title}
            </h4>

            <p className="text-slate-700 dark:text-slate-300 mb-3 leading-relaxed">
              {i.explanation}
            </p>

            {i.suggested_fix && (
              <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">Suggested Fix:</p>
                    <pre className="text-sm text-blue-800 dark:text-blue-300 whitespace-pre-wrap font-mono bg-blue-100 dark:bg-blue-900/40 p-3 rounded border border-blue-200 dark:border-blue-800">
                      {i.suggested_fix}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-mono">{i.file}</span>
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Lines {i.line_start}-{i.line_end}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Confidence: {Math.round(i.confidence * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
