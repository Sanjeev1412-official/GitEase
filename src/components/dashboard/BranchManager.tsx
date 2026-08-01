"use client";

import React, { useState } from "react";
import { BranchInfo, createNewBranch } from "@/app/actions/dashboard";
import {
  GitBranch,
  Plus,
  Shield,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface BranchManagerProps {
  owner: string;
  repo: string;
  branches: BranchInfo[];
  onBranchCreated?: () => void;
}

export function BranchManager({
  owner,
  repo,
  branches: initialBranches,
  onBranchCreated,
}: BranchManagerProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [fromBranch, setFromBranch] = useState(initialBranches[0]?.name || "main");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) {
      setError("Branch name is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await createNewBranch(owner, repo, newBranchName.trim(), fromBranch);
      if (res.success) {
        setShowCreateModal(false);
        setNewBranchName("");
        if (onBranchCreated) onBranchCreated();
      } else {
        setError(res.error || "Failed to create branch.");
      }
    } catch (err: any) {
      setError(err?.message || "An error occurred while creating branch.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-gray-50 rounded-xl border border-gray-100 shadow-sm">
              <GitBranch className="w-5 h-5 text-[var(--accent-red)]" />
            </div>
            <span>Branches ({initialBranches.length})</span>
          </h3>
          <p className="text-sm font-medium text-gray-500 mt-2">
            Create and manage isolated code branches without terminal commands.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[var(--accent-red)] hover:bg-red-600 text-white text-sm font-semibold transition-all shadow-md shadow-red-500/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Branch</span>
        </button>
      </div>

      {/* Branches List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {initialBranches.map((b) => (
          <div
            key={b.name}
            className="p-5 bg-white border border-gray-100 rounded-3xl flex items-center justify-between gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group"
          >
            <div className="flex items-center gap-3 truncate">
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0 group-hover:bg-red-50 transition-colors">
                <GitBranch className="w-4 h-4 text-gray-400 group-hover:text-[var(--accent-red)] transition-colors" />
              </div>
              <span className="text-sm font-bold text-gray-900 truncate">
                {b.name}
              </span>
              {b.isProtected && (
                <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/50 shadow-inner">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Protected</span>
                </span>
              )}
            </div>

            <span className="font-mono text-xs font-medium text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-lg shadow-sm">
              {b.sha.substring(0, 7)}
            </span>
          </div>
        ))}
      </div>

      {/* Create Branch Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[60] bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 w-full max-w-md space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                Create New Branch
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-900 transition-colors p-2 rounded-full hover:bg-gray-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-800 text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateBranch} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  New Branch Name <span className="text-[var(--accent-red)]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. feature/user-auth or dev"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  required
                  className="w-full px-5 py-3 rounded-2xl bg-gray-50 border-none text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-red)]/20 shadow-inner transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Branch Off From
                </label>
                <select
                  value={fromBranch}
                  onChange={(e) => setFromBranch(e.target.value)}
                  className="w-full px-5 py-3 rounded-2xl bg-gray-50 border-none text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--accent-red)]/20 shadow-inner transition-all appearance-none"
                >
                  {initialBranches.map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
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
                  <span>Create Branch</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
