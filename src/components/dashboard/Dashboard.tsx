"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { RepoSummary, fetchTrackedRepos } from "@/app/actions/dashboard";
import { RepoDetailView } from "./RepoDetailView";
import { Footer } from "../Footer";
import { RepoImportModal } from "./RepoImportModal";
import {
  FolderGit2,
  Plus,
  Search,
  Loader2,
  Lock,
  Globe,
  Star,
  ArrowUpRight,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";

interface DashboardProps {
  onPushUpdateRepo?: (repoName: string) => void;
}

export function Dashboard({ onPushUpdateRepo }: DashboardProps) {
  const { data: session } = useSession();
  const userKey = session?.user?.email || session?.user?.name || "default";
  const storageKey = `gitease_tracked_repos_${userKey}`;

  const [trackedItems, setTrackedItems] = useState<Array<{ owner?: string; repoName: string }>>([]);
  const [repos, setRepos] = useState<RepoSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<RepoSummary | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Scrolljacking State for Dashboard
  const [currentSection, setCurrentSection] = useState(0);
  const isScrolling = useRef(false);

  const handleWheel = (e: React.WheelEvent) => {
    if (isScrolling.current) return;
    if (Math.abs(e.deltaY) < 10) return;

    if (e.deltaY > 0 && currentSection < 2) {
      isScrolling.current = true;
      setCurrentSection(prev => prev + 1);
      setTimeout(() => (isScrolling.current = false), 800);
    } else if (e.deltaY < 0 && currentSection > 0) {
      isScrolling.current = true;
      setCurrentSection(prev => prev - 1);
      setTimeout(() => (isScrolling.current = false), 800);
    }
  };

  // Load tracked items from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setTrackedItems(parsed);
        }
      }
    } catch (e) {
      console.error("Error reading tracked repos from localStorage:", e);
    }
  }, [storageKey]);

  // Fetch details only for tracked items
  const loadTrackedRepos = async () => {
    if (trackedItems.length === 0) {
      setRepos([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchTrackedRepos(trackedItems);
      if (res.success && res.repos) {
        setRepos(res.repos);
      } else {
        setError(res.error || "Failed to load tracked repositories.");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTrackedRepos();
  }, [trackedItems]);

  const handleImportRepo = (newRepo: RepoSummary) => {
    if (!trackedItems.some((item) => item.repoName.toLowerCase() === newRepo.name.toLowerCase())) {
      const updated = [{ owner: newRepo.owner, repoName: newRepo.name }, ...trackedItems];
      setTrackedItems(updated);
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
    }
    setShowImportModal(false);
  };

  const handleRemoveTrackedRepo = (e: React.MouseEvent, repoName: string) => {
    e.stopPropagation();
    const updated = trackedItems.filter((i) => i.repoName.toLowerCase() !== repoName.toLowerCase());
    setTrackedItems(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const filteredRepos = repos.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(search.toLowerCase())) ||
      (r.language && r.language.toLowerCase().includes(search.toLowerCase()))
  );

  if (selectedRepo) {
    return (
      <RepoDetailView
        repoSummary={selectedRepo}
        onClose={() => setSelectedRepo(null)}
        onRepoUpdated={loadTrackedRepos}
      />
    );
  }

  return (
    <div className="flex-1 relative w-full h-[60vh] min-h-[500px]" onWheel={handleWheel}>
      {/* Section Indicators */}
      <div className="fixed right-4 sm:right-18 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-50">
        {[0, 1, 2].map((idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSection(idx)}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${currentSection === idx ? "bg-[var(--accent-red)] scale-150" : "bg-gray-300 hover:bg-gray-400"}`}
          />
        ))}
      </div>

      {/* Section 0: Header & Grid */}
      <div className={`absolute inset-0 flex flex-col pt-4 pb-6 transition-all duration-800 ease-in-out ${currentSection === 0 ? "opacity-100 translate-y-0 pointer-events-auto z-10 delay-500" : "opacity-0 -translate-y-12 pointer-events-none z-0 delay-0"}`}>
        <div className="flex flex-col h-full space-y-6 max-w-6xl mx-auto w-full">
          {/* Dashboard Editorial Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 border-b border-gray-100 pb-6 shrink-0">
            <div className="space-y-2">
              <span className="text-sm font-semibold text-gray-500">
                Control Hub — {repos.length} Tracked
              </span>
              <h1 className="text-4xl sm:text-5xl font-semibold text-gray-900 tracking-tight">
                Repository Hub
              </h1>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              {/* Search Bar */}
              {repos.length > 0 && (
                <div className="relative w-full sm:w-64 shrink-0">
                  <Search className="w-4 h-4 text-gray-400 absolute left-4 top-3.5" />
                  <input
                    type="text"
                    placeholder="Filter repositories..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-full bg-gray-50 border-none text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-red)]/20 transition-all shadow-inner"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-full bg-[var(--accent-red)] hover:bg-red-600 text-white font-medium text-sm transition-all shadow-md shadow-red-500/20 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Repo</span>
              </button>
            </div>
          </div>

          {/* Repositories Grid matching editorial card style */}
          <div 
            className="flex-1 overflow-y-auto custom-scrollbar pr-4 -mr-4"
            onWheel={(e) => e.stopPropagation()}
          >
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="w-10 h-10 text-[var(--accent-red)] animate-spin" />
                <p className="text-sm font-semibold text-gray-600">
                  Loading tracked repositories...
                </p>
              </div>
            ) : error ? (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-800 text-sm">
                {error}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRepos.map((repo) => (
                  <div
                    key={repo.id}
                    onClick={() => setSelectedRepo(repo)}
                    className="group relative p-6 rounded-[2rem] bg-gray-50/50 border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all cursor-pointer shadow-sm space-y-6 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          {repo.isPrivate ? (
                            <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                          ) : (
                            <Globe className="w-4 h-4 text-gray-500 shrink-0" />
                          )}
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-[var(--accent-red)] transition-colors truncate">
                            {repo.name}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {onPushUpdateRepo && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onPushUpdateRepo(repo.name);
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium transition-colors"
                              title="Upload update files to this repository"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>Update</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => handleRemoveTrackedRepo(e, repo.name)}
                            className="p-2 rounded-full bg-white border border-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shadow-sm"
                            title="Remove from Dashboard"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <div className="w-9 h-9 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-gray-900 group-hover:text-white group-hover:border-gray-900 transition-all shadow-sm">
                            <ArrowUpRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed h-10">
                        {repo.description || "No description provided."}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-medium text-gray-500">
                      <div className="flex items-center gap-3">
                        {repo.language && (
                           <span className="text-gray-700 bg-white border border-gray-100 px-2 py-1 rounded-md shadow-sm">
                            {repo.language}
                          </span>
                        )}
                        <span className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-md">
                          <Star className="w-3.5 h-3.5" />
                          {repo.stars}
                        </span>
                      </div>

                      <span>{new Date(repo.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && trackedItems.length === 0 && (
              <div className="text-center py-20 bg-gray-50/50 border border-dashed border-gray-200 rounded-[2.5rem] space-y-4">
                <FolderGit2 className="w-12 h-12 text-gray-400 mx-auto" />
                <p className="text-lg font-bold text-gray-900">
                  No tracked repositories
                </p>
                <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
                  Repositories you push will automatically appear here. Click "Add Repo" to track an existing repository.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 1: Security & Stats */}
      <div className={`absolute inset-0 flex flex-col justify-center transition-all duration-800 ease-in-out ${currentSection === 1 ? "opacity-100 translate-y-0 pointer-events-auto z-10 delay-500" : "opacity-0 translate-y-12 pointer-events-none z-0 delay-0"}`}>
        <div className="space-y-8 max-w-4xl mx-auto w-full px-4">
          <div className="text-center space-y-3 pb-4">
            <h2 className="text-3xl font-semibold text-gray-900 tracking-tight">Account & Security</h2>
            <p className="text-gray-500">Your configuration and platform guarantees.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-[var(--accent-red)] mb-6">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Privacy Guaranteed</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Gitease never scans unapproved repositories. Only explicitly tracked repos are displayed on this dashboard. Your code remains securely on GitHub.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4 hover:shadow-lg transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-900 mb-6">
                  <FolderGit2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Tracked Repositories</h3>
              </div>
              <div>
                <div className="flex items-end gap-2 mt-4">
                  <span className="text-5xl font-semibold text-gray-900 tracking-tighter">{repos.length}</span>
                  <span className="text-gray-500 text-sm mb-1 font-medium">active</span>
                </div>
                <p className="text-gray-500 text-sm pt-4 mt-4 border-t border-gray-50">
                  Manage your repositories seamlessly from a single unified control plane.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Footer */}
      <div className={`absolute inset-0 flex flex-col transition-all duration-800 ease-in-out ${currentSection === 2 ? "opacity-100 translate-y-0 pointer-events-auto z-10 delay-500" : "opacity-0 -translate-y-12 pointer-events-none z-0 delay-0"}`}>
        <Footer />
      </div>

      {/* Import Repo Modal */}
      {showImportModal && (
        <RepoImportModal
          onClose={() => setShowImportModal(false)}
          onImportRepo={handleImportRepo}
        />
      )}
    </div>
  );
}
