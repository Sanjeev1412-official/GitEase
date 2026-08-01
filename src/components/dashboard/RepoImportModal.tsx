"use client";

import React, { useState } from "react";
import { RepoSummary, verifyAndGetSingleRepo } from "@/app/actions/dashboard";
import { Loader2, Plus, ShieldCheck } from "lucide-react";

function GithubIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

interface RepoImportModalProps {
  onClose: () => void;
  onImportRepo: (repo: RepoSummary) => void;
}

export function RepoImportModal({ onClose, onImportRepo }: RepoImportModalProps) {
  const [repoInput, setRepoInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoInput.trim()) {
      setError("Please enter a repository name or URL.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await verifyAndGetSingleRepo(repoInput.trim());
      if (res.success && res.repo) {
        onImportRepo(res.repo);
      } else {
        setError(res.error || "Repository not found or inaccessible.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-zinc-200 rounded-3xl p-6 w-full max-w-md space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
          <div className="flex items-center gap-2">
            <GithubIcon className="w-5 h-5 text-black" />
            <h3 className="text-base font-extrabold text-[#09090b] font-mono uppercase">
              ADD REPOSITORY WITH CONSENT
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-black text-xs font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>

        {/* Security Assurance Badge */}
        <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs font-mono text-zinc-700">
          <ShieldCheck className="w-4 h-4 text-black shrink-0 mt-0.5" />
          <p className="leading-relaxed uppercase">
            <strong>PRIVACY FIRST:</strong> GITEASE DOES NOT SCAN UNAPPROVED REPOSITORIES. ONLY EXPLICITLY SPECIFIED REPOS ARE CONNECTED.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold font-mono text-zinc-700 uppercase">
              REPOSITORY NAME OR GITHUB URL
            </label>
            <input
              type="text"
              placeholder="e.g. repo-name or username/repo-name"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-300 text-xs text-black placeholder-zinc-400 focus:outline-none focus:border-black font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-mono font-bold uppercase"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#09090b] hover:bg-zinc-800 text-white text-xs font-mono font-bold uppercase shadow-sm disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>ADD & VERIFY</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
