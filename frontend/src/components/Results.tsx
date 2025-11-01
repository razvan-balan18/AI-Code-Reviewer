import React, { useEffect, useState } from "react";
import { getResults } from "../api";
import IssueList from "./IssueList";
import SummaryPanel from "./SummaryPanel";

export default function Results({ runId }: { runId: string }) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getResults(runId);
        if (mounted) {
          setData(res);
          setLoading(false);
        }
      } catch (e) {
        if (mounted) {
          setLoading(false);
        }
      }
    })();
    return () => { mounted = false; };
  }, [runId]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-slate-600 dark:text-slate-300">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const files = Array.from(new Set((data.issues || []).map((i: any) => i.file))).filter(Boolean);
  const issueCounts = {
    high: (data.issues || []).filter((i: any) => i.severity === "high").length,
    medium: (data.issues || []).filter((i: any) => i.severity === "medium").length,
    low: (data.issues || []).filter((i: any) => i.severity === "low").length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Issues</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{data.issues?.length || 0}</p>
            </div>
            <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
              <svg className="w-6 h-6 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-red-200 dark:border-red-900 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 dark:text-red-400">High</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{issueCounts.high}</p>
            </div>
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-amber-200 dark:border-amber-900 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-600 dark:text-amber-400">Medium</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{issueCounts.medium}</p>
            </div>
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-green-200 dark:border-green-900 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 dark:text-green-400">Low</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{issueCounts.low}</p>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Run Info Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Run Information
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-slate-600 dark:text-slate-400 font-medium">Mode:</span>
              <span className="ml-2 px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                {data.mode}
              </span>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400 font-medium">Repository:</span>
              <p className="mt-1 text-slate-900 dark:text-slate-100 font-mono text-xs break-all">{data.repoPath}</p>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400 font-medium">Files Analyzed:</span>
              <p className="mt-1 text-slate-900 dark:text-slate-100">{files.length}</p>
            </div>
          </div>
        </div>

        {/* Summary Panel */}
        <div className="lg:col-span-2">
          <SummaryPanel summary={data.summary} />
        </div>
      </div>

      {/* Issues List */}
      <div>
        <IssueList issues={data.issues || []} />
      </div>
    </div>
  );
}
