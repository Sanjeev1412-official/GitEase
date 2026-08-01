"use client";

import React from "react";
import { CommitInfo } from "@/app/actions/dashboard";
import { GitCommit, ArrowUpRight, Calendar, User } from "lucide-react";

interface CommitTimelineProps {
  commits: CommitInfo[];
}

export function CommitTimeline({ commits }: CommitTimelineProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-3">
          <div className="p-2 bg-gray-50 rounded-xl border border-gray-100 shadow-sm">
            <GitCommit className="w-5 h-5 text-[var(--accent-red)]" />
          </div>
          <span>Recent Commits ({commits.length})</span>
        </h3>
      </div>

      <div className="border border-gray-100 rounded-3xl bg-white overflow-hidden divide-y divide-gray-100 max-h-[500px] overflow-y-auto custom-scrollbar shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        {commits.map((c) => (
          <div
            key={c.sha}
            className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 hover:bg-gray-50 transition-colors group"
          >
            <div className="flex items-start gap-4 truncate w-full sm:w-auto">
              <div className="w-10 h-10 rounded-full border border-gray-100 bg-white flex items-center justify-center text-gray-400 shrink-0 mt-0.5 shadow-sm group-hover:text-[var(--accent-red)] group-hover:border-red-100 transition-colors">
                <GitCommit className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 truncate">
                <p className="text-sm font-semibold text-gray-900 truncate leading-snug">
                  {c.message}
                </p>
                <div className="flex items-center gap-3 text-xs font-medium text-gray-500">
                  <span className="flex items-center gap-2 text-gray-700">
                    {c.authorAvatar ? (
                      <img src={c.authorAvatar} alt={c.authorName} className="w-5 h-5 rounded-full border border-gray-200" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                        <User className="w-3 h-3 text-gray-400" />
                      </div>
                    )}
                    <span>{c.authorName}</span>
                  </span>
                  <span>•</span>
                  <span>{new Date(c.date).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 shrink-0 mt-3 sm:mt-0 pl-14 sm:pl-0 pr-0 sm:pr-0">
              <span className="font-mono text-xs text-gray-600 font-semibold bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">
                {c.sha.substring(0, 7)}
              </span>
              <a
                href={c.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-gray-400 hover:text-gray-900 transition-colors shadow-sm"
                title="View Commit on GitHub"
              >
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        ))}

        {commits.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <GitCommit className="w-12 h-12 text-gray-300" />
            <p className="text-gray-500 font-medium">
              No commit history available.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
