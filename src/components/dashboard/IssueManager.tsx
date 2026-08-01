"use client";

import React, { useState } from "react";
import { IssueInfo, createNewIssue, toggleIssueState } from "@/app/actions/dashboard";
import {
  CircleDot,
  CheckCircle2,
  Plus,
  MessageSquare,
  ArrowUpRight,
  Loader2,
  AlertCircle,
  User,
  X,
} from "lucide-react";

interface IssueManagerProps {
  owner: string;
  repo: string;
  issues: IssueInfo[];
  onIssueUpdated?: () => void;
}

export function IssueManager({
  owner,
  repo,
  issues: initialIssues,
  onIssueUpdated,
}: IssueManagerProps) {
  const [filterState, setFilterState] = useState<"all" | "open" | "closed">("open");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [labelsText, setLabelsText] = useState("bug, enhancement");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingNumber, setTogglingNumber] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Issue title is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const labels = labelsText
      .split(",")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    try {
      const res = await createNewIssue(owner, repo, {
        title: title.trim(),
        body: body.trim(),
        labels,
      });

      if (res.success) {
        setShowCreateModal(false);
        setTitle("");
        setBody("");
        if (onIssueUpdated) onIssueUpdated();
      } else {
        setError(res.error || "Failed to create issue.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleState = async (issueNumber: number, currentState: "open" | "closed") => {
    setTogglingNumber(issueNumber);
    try {
      const res = await toggleIssueState(owner, repo, issueNumber, currentState);
      if (res.success && onIssueUpdated) {
        onIssueUpdated();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingNumber(null);
    }
  };

  const filteredIssues = initialIssues.filter((i) => {
    if (filterState === "open") return i.state === "open";
    if (filterState === "closed") return i.state === "closed";
    return true;
  });

  const openCount = initialIssues.filter((i) => i.state === "open").length;
  const closedCount = initialIssues.filter((i) => i.state === "closed").length;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-white border border-gray-100 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-full border border-gray-100 text-sm font-semibold shadow-inner overflow-x-auto custom-scrollbar">
          <button
            type="button"
            onClick={() => setFilterState("open")}
            className={`px-5 py-2 rounded-full transition-all whitespace-nowrap ${
              filterState === "open"
                ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Open ({openCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterState("closed")}
            className={`px-5 py-2 rounded-full transition-all whitespace-nowrap ${
              filterState === "closed"
                ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Closed ({closedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterState("all")}
            className={`px-5 py-2 rounded-full transition-all whitespace-nowrap ${
              filterState === "all"
                ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            All ({initialIssues.length})
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[var(--accent-red)] hover:bg-red-600 text-white text-sm font-semibold transition-all shadow-md shadow-red-500/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Issue</span>
        </button>
      </div>

      {/* Issues List */}
      <div className="border border-gray-100 rounded-3xl bg-white overflow-hidden divide-y divide-gray-100 max-h-[500px] overflow-y-auto custom-scrollbar shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        {filteredIssues.map((iss) => (
          <div
            key={iss.number}
            className="p-6 flex items-start justify-between gap-6 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start gap-4 space-y-1 truncate">
              {iss.state === "open" ? (
                <CircleDot className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
              )}
              <div className="space-y-2 truncate">
                <div className="flex flex-wrap items-center gap-2.5">
                  <a
                    href={iss.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-base text-gray-900 hover:text-[var(--accent-red)] transition-colors truncate"
                  >
                    {iss.title}
                  </a>
                  <span className="text-sm text-gray-400 font-medium">#{iss.number}</span>
                  {iss.labels.map((lbl, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium"
                    >
                      {lbl}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
                  <span>Opened by {iss.author}</span>
                  <span>• {new Date(iss.createdAt).toLocaleDateString()}</span>
                  {iss.commentsCount > 0 && (
                    <span className="flex items-center gap-1.5 text-gray-600">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {iss.commentsCount}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => handleToggleState(iss.number, iss.state)}
                disabled={togglingNumber === iss.number}
                className="px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {togglingNumber === iss.number ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : iss.state === "open" ? (
                  "Close Issue"
                ) : (
                  "Reopen Issue"
                )}
              </button>
              <a
                href={iss.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-50 text-gray-400 hover:text-gray-900 hover:bg-gray-200 transition-colors shadow-sm border border-gray-100"
                title="View on GitHub"
              >
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        ))}

        {filteredIssues.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <AlertCircle className="w-12 h-12 text-gray-300" />
            <p className="text-gray-500 font-medium">
              No {filterState !== "all" ? filterState : ""} issues found.
            </p>
          </div>
        )}
      </div>

      {/* New Issue Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[60] bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 w-full max-w-xl space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                Create New Issue
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-900 transition-colors p-2 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-800 text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateIssue} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Issue Title <span className="text-[var(--accent-red)]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bug: Navigation bar overlapping on mobile"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-5 py-3 rounded-2xl bg-gray-50 border-none text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-red)]/20 shadow-inner transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Description / Body
                </label>
                <textarea
                  placeholder="Provide steps to reproduce or details about this task..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  className="w-full p-5 rounded-2xl bg-gray-50 border-none text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-red)]/20 shadow-inner transition-all resize-y"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Labels (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="bug, enhancement, documentation"
                  value={labelsText}
                  onChange={(e) => setLabelsText(e.target.value)}
                  className="w-full px-5 py-3 rounded-2xl bg-gray-50 border-none text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-red)]/20 shadow-inner transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2.5 rounded-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-sm font-semibold transition-colors shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-8 py-2.5 rounded-full bg-[var(--accent-red)] hover:bg-red-600 text-white text-sm font-semibold shadow-md shadow-red-500/20 disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>Submit Issue</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
