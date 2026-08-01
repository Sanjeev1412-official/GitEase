"use client";

import React, { useState } from "react";
import { ReleaseInfo, createNewRelease } from "@/app/actions/dashboard";
import {
  Tag,
  Plus,
  ArrowUpRight,
  Calendar,
  Loader2,
} from "lucide-react";

interface ReleaseManagerProps {
  owner: string;
  repo: string;
  releases: ReleaseInfo[];
  onReleaseCreated?: () => void;
}

export function ReleaseManager({
  owner,
  repo,
  releases: initialReleases,
  onReleaseCreated,
}: ReleaseManagerProps) {
  const [releases, setReleases] = useState<ReleaseInfo[]>(initialReleases);
  const [showModal, setShowModal] = useState(false);

  const [tagName, setTagName] = useState("");
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [draft, setDraft] = useState(false);
  const [prerelease, setPrerelease] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) {
      setError("Tag name is required (e.g. v1.0.0)");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await createNewRelease(owner, repo, {
        tagName,
        name,
        body,
        draft,
        prerelease,
      });

      if (res.success) {
        setShowModal(false);
        setTagName("");
        setName("");
        setBody("");
        setDraft(false);
        setPrerelease(false);
        if (onReleaseCreated) onReleaseCreated();
      } else {
        setError(res.error || "Failed to create release.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
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
              <Tag className="w-5 h-5 text-[var(--accent-red)]" />
            </div>
            <span>Releases & Tags</span>
          </h3>
          <p className="text-sm font-medium text-gray-500 mt-2">
            Publish software versions and release notes for your users.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[var(--accent-red)] hover:bg-red-600 text-white text-sm font-semibold transition-all shadow-md shadow-red-500/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Draft New Release</span>
        </button>
      </div>

      {/* Releases List */}
      <div className="space-y-4">
        {releases.map((rel) => (
          <div
            key={rel.id}
            className="p-6 bg-white border border-gray-100 rounded-3xl space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="px-3.5 py-1.5 rounded-full bg-gray-900 text-white text-xs font-bold tracking-wide">
                  {rel.tagName}
                </span>
                <h4 className="text-base font-bold text-gray-900">
                  {rel.name || rel.tagName}
                </h4>
                {rel.prerelease && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/50 shadow-inner">
                    Pre-release
                  </span>
                )}
                {rel.draft && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 shadow-inner">
                    Draft
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
                {rel.publishedAt && (
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {new Date(rel.publishedAt).toLocaleDateString()}
                  </span>
                )}
                <a
                  href={rel.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-gray-500 hover:text-[var(--accent-red)] font-semibold transition-colors bg-gray-50 hover:bg-red-50 px-3 py-1.5 rounded-full border border-gray-200 hover:border-red-200"
                >
                  <span>View</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {rel.body && (
              <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50/50 p-5 rounded-2xl border border-gray-100 font-sans leading-relaxed shadow-inner">
                {rel.body}
              </p>
            )}
          </div>
        ))}

        {releases.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 bg-white border border-dashed border-gray-200 rounded-3xl space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            <Tag className="w-12 h-12 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">No releases published yet.</p>
          </div>
        )}
      </div>

      {/* Create Release Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 w-full max-w-xl space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                Create New GitHub Release
              </h3>
              <button
                onClick={() => setShowModal(false)}
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

            <form onSubmit={handleCreateRelease} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Tag Name <span className="text-[var(--accent-red)]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. v1.0.0"
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    required
                    className="w-full px-5 py-3 rounded-2xl bg-gray-50 border-none text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-red)]/20 shadow-inner transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Release Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Initial Stable Release"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-5 py-3 rounded-2xl bg-gray-50 border-none text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-red)]/20 shadow-inner transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Release Notes / Description
                </label>
                <textarea
                  placeholder="Describe what changed in this version..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  className="w-full p-5 rounded-2xl bg-gray-50 border-none text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-red)]/20 shadow-inner transition-all resize-y"
                />
              </div>

              <div className="flex items-center gap-6 text-sm font-medium text-gray-700 pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={draft}
                      onChange={(e) => setDraft(e.target.checked)}
                      className="w-5 h-5 rounded-md border-gray-300 text-[var(--accent-red)] focus:ring-[var(--accent-red)] transition-all cursor-pointer"
                    />
                  </div>
                  <span className="group-hover:text-gray-900 transition-colors">Save as Draft</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={prerelease}
                      onChange={(e) => setPrerelease(e.target.checked)}
                      className="w-5 h-5 rounded-md border-gray-300 text-[var(--accent-red)] focus:ring-[var(--accent-red)] transition-all cursor-pointer"
                    />
                  </div>
                  <span className="group-hover:text-gray-900 transition-colors">Pre-release</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                  <span>Publish Release</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
