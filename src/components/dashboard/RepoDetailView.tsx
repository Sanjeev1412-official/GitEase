"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  RepoSummary,
  RepoFullDetails,
  getRepoFullDetails,
  updateRepoSettings,
} from "@/app/actions/dashboard";
import { ReadmeEditor } from "./ReadmeEditor";
import { ReleaseManager } from "./ReleaseManager";
import { WorkflowManager } from "./WorkflowManager";
import { IssueManager } from "./IssueManager";
import { CommitTimeline } from "./CommitTimeline";
import { BranchManager } from "./BranchManager";
import { FileExplorer } from "./FileExplorer";
import {
  Settings,
  FileText,
  Tag,
  Cpu,
  Globe,
  Lock,
  Star,
  GitFork,
  ArrowUpRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
  X,
  CircleDot,
  GitCommit,
  GitBranch,
  FolderOpen,
} from "lucide-react";

interface RepoDetailViewProps {
  repoSummary: RepoSummary;
  onClose: () => void;
  onRepoUpdated?: () => void;
}

export function RepoDetailView({
  repoSummary,
  onClose,
  onRepoUpdated,
}: RepoDetailViewProps) {
  const [activeTab, setActiveTab] = useState<
    "settings" | "readme" | "issues" | "commits" | "branches" | "releases" | "workflows" | "files"
  >("settings");
  const [details, setDetails] = useState<RepoFullDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settings tab form states
  const [description, setDescription] = useState("");
  const [homepage, setHomepage] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [topicsText, setTopicsText] = useState("");

  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getRepoFullDetails(repoSummary.owner, repoSummary.name);
      if (res.success && res.details) {
        setDetails(res.details);
        setDescription(res.details.repo.description || "");
        setIsPrivate(res.details.repo.isPrivate);
        setTopicsText((res.details.repo.topics || []).join(", "));
      } else {
        setError(res.error || "Failed to load repository details.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [repoSummary.owner, repoSummary.name]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsStatus(null);

    const topicsArray = topicsText
      .split(",")
      .map((t) => t.trim().toLowerCase().replace(/[^a-z0-9-]/g, ""))
      .filter((t) => t.length > 0);

    try {
      const res = await updateRepoSettings(repoSummary.owner, repoSummary.name, {
        description: description.trim(),
        homepage: homepage.trim(),
        isPrivate,
        topics: topicsArray,
      });

      if (res.success) {
        setSettingsStatus({
          type: "success",
          text: "Repository settings updated successfully!",
        });
        if (onRepoUpdated) onRepoUpdated();
      } else {
        setSettingsStatus({
          type: "error",
          text: res.error || "Failed to update settings.",
        });
      }
    } catch (err: any) {
      setSettingsStatus({
        type: "error",
        text: err?.message || "Error updating settings.",
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const isScrolling = useRef(false);

  const handleWheel = (e: React.WheelEvent) => {
    if (typeof window !== "undefined" && window.innerWidth < 768) return;
    if (isScrolling.current) return;
    if (Math.abs(e.deltaY) < 10) return;

    const tabIds = ["settings", "readme", "files", "issues", "commits", "branches", "releases", "workflows"] as const;
    const currentIndex = tabIds.indexOf(activeTab as any);

    if (e.deltaY > 0 && currentIndex < tabIds.length - 1) {
      isScrolling.current = true;
      setActiveTab(tabIds[currentIndex + 1]);
      setTimeout(() => (isScrolling.current = false), 800);
    } else if (e.deltaY < 0 && currentIndex > 0) {
      isScrolling.current = true;
      setActiveTab(tabIds[currentIndex - 1]);
      setTimeout(() => (isScrolling.current = false), 800);
    }
  };

  const handleRightPaneWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtTop = target.scrollTop === 0;
    const isAtBottom = Math.abs(target.scrollHeight - target.clientHeight - target.scrollTop) < 2;

    if (e.deltaY > 0 && !isAtBottom) {
      e.stopPropagation();
    } else if (e.deltaY < 0 && !isAtTop) {
      e.stopPropagation();
    }
  };

  return (
    <div className="flex-1 flex flex-col sm:flex-row w-full bg-white sm:rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 sm:overflow-hidden animate-in fade-in duration-500 sm:min-h-0" onWheel={handleWheel}>

      {/* Left Sidebar */}
      <div className="w-full sm:w-80 sm:min-w-[280px] bg-gray-50/50 border-b sm:border-b-0 sm:border-r border-gray-100 p-4 sm:p-5 flex flex-col space-y-4 overflow-hidden shrink-0">
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 font-medium text-sm transition-colors shadow-sm shrink-0"
          >
            <X className="w-4 h-4" />
            <span>Close</span>
          </button>
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-gray-900 shadow-sm border border-gray-100 shrink-0">
            {repoSummary.isPrivate ? (
              <Lock className="w-5 h-5 text-amber-500" />
            ) : (
              <Globe className="w-5 h-5" />
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight break-all leading-tight">
            {repoSummary.owner} <span className="text-gray-400 font-medium">/</span><br />
            {repoSummary.name}
          </h2>
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
            {repoSummary.description || "No description provided."}
          </p>
          <a
            href={repoSummary.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent-red)] hover:text-red-700 transition-colors"
          >
            View on GitHub <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-gray-500">
          <div className="flex items-center gap-1.5 bg-white border border-gray-100 px-3 py-1.5 rounded-xl shadow-sm">
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <span>{repoSummary.stars} Stars</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-gray-100 px-3 py-1.5 rounded-xl shadow-sm">
            <GitFork className="w-3.5 h-3.5 text-gray-400" />
            <span>{repoSummary.forks} Forks</span>
          </div>
          {repoSummary.language && (
            <span className="bg-white border border-gray-100 px-3 py-1.5 rounded-xl shadow-sm text-gray-700">
              {repoSummary.language}
            </span>
          )}
        </div>

        {/* Navigation Pills (Grid/Horizontal View) */}
        <div className="flex flex-row sm:grid sm:grid-cols-2 gap-2 pt-2 border-t border-gray-100 sm:flex-1 content-start overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
          {[
            { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4 mb-1" /> },
            { id: "readme", label: "Readme", icon: <FileText className="w-4 h-4 mb-1" /> },
            { id: "files", label: "Files", icon: <FolderOpen className="w-4 h-4 mb-1" /> },
            { id: "issues", label: `Issues (${details?.issues.length || 0})`, icon: <AlertCircle className="w-4 h-4 mb-1" /> },
            { id: "commits", label: "Commits", icon: <GitCommit className="w-4 h-4 mb-1" /> },
            { id: "branches", label: "Branches", icon: <GitBranch className="w-4 h-4 mb-1" /> },
            { id: "releases", label: "Releases", icon: <Tag className="w-4 h-4 mb-1" /> },
            { id: "workflows", label: "Actions", icon: <Cpu className="w-4 h-4 mb-1" /> },
          ].map((tab, idx) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl text-xs font-medium transition-all shadow-sm shrink-0 min-w-[80px] sm:min-w-0 ${activeTab === tab.id
                  ? "bg-[var(--accent-red)] text-white hover:bg-red-600"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Body Container */}
      <div className="flex-1 relative bg-gray-50/30 sm:overflow-hidden">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 space-y-4">
            <Loader2 className="w-10 h-10 text-[var(--accent-red)] animate-spin" />
            <p className="text-sm font-semibold text-gray-600">
              Loading repository data from GitHub...
            </p>
          </div>
        ) : error ? (
          <div className="absolute inset-0 p-8">
            <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-800 text-sm">
              {error}
            </div>
          </div>
        ) : details ? (
          <>
            {/* TAB 1: SETTINGS */}
            <div
              className={`relative sm:absolute sm:inset-0 sm:overflow-y-auto p-4 sm:p-8 custom-scrollbar transition-all duration-800 ease-in-out ${activeTab === "settings" ? "flex flex-col opacity-100 translate-y-0 pointer-events-auto z-10 sm:delay-300" : "hidden sm:block opacity-0 -translate-y-12 pointer-events-none z-0 delay-0"}`}
              onWheel={handleRightPaneWheel}
            >
              <div className="w-full max-w-4xl mx-auto space-y-8 pb-10 overflow-hidden sm:overflow-visible">
                <form onSubmit={handleSaveSettings} className="space-y-8">
                  {settingsStatus && (
                    <div
                      className={`p-4 rounded-2xl text-sm font-medium ${settingsStatus.type === "success"
                          ? "bg-emerald-50 border border-emerald-100 text-emerald-800"
                          : "bg-red-50 border border-red-100 text-red-800"
                        }`}
                    >
                      {settingsStatus.text}
                    </div>
                  )}

                  <div className="space-y-6 bg-white p-8 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                      General Settings
                    </h3>

                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Brief summary of your repository..."
                        rows={3}
                        className="w-full p-4 rounded-2xl bg-gray-50 border-none text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-red)]/20 transition-all shadow-inner"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-700">
                        Website / Homepage URL
                      </label>
                      <input
                        type="url"
                        value={homepage}
                        onChange={(e) => setHomepage(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full px-5 py-3.5 rounded-full bg-gray-50 border-none text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-red)]/20 transition-all shadow-inner"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-700">
                        Topics / Tags (Comma separated)
                      </label>
                      <input
                        type="text"
                        value={topicsText}
                        onChange={(e) => setTopicsText(e.target.value)}
                        placeholder="react, tailwind, portfolio"
                        className="w-full px-5 py-3.5 rounded-full bg-gray-50 border-none text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-red)]/20 transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="space-y-6 bg-white p-8 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                      Visibility
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setIsPrivate(false)}
                        className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-sm font-semibold transition-all ${!isPrivate
                            ? "bg-gray-900 text-white shadow-md shadow-gray-900/20"
                            : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                      >
                        <Globe className="w-4 h-4" />
                        <span>Public</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPrivate(true)}
                        className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-sm font-semibold transition-all ${isPrivate
                            ? "bg-gray-900 text-white shadow-md shadow-gray-900/20"
                            : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                      >
                        <Lock className={`w-4 h-4 ${isPrivate ? "text-white" : "text-amber-500"}`} />
                        <span>Private</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingSettings}
                      className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-gray-900 hover:bg-black text-white font-medium text-sm transition-all disabled:opacity-50 shadow-sm"
                    >
                      {isSavingSettings ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>Save Changes</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* TAB 2: README EDITOR */}
            <div
              className={`relative sm:absolute sm:inset-0 sm:overflow-y-auto p-4 sm:p-8 custom-scrollbar transition-all duration-800 ease-in-out ${activeTab === "readme" ? "flex flex-col opacity-100 translate-y-0 pointer-events-auto z-10 sm:delay-300" : "hidden sm:block opacity-0 -translate-y-12 pointer-events-none z-0 delay-0"}`}
              onWheel={handleRightPaneWheel}
            >
              <div className="w-full max-w-4xl mx-auto space-y-8 pb-10 overflow-hidden sm:overflow-visible">
                <ReadmeEditor
                  owner={repoSummary.owner}
                  repo={repoSummary.name}
                  initialContent={details.readme.content}
                  initialSha={details.readme.sha}
                  onSaved={loadDetails}
                />
              </div>
            </div>

            {/* TAB 3: ISSUES */}
            <div
              className={`relative sm:absolute sm:inset-0 sm:overflow-y-auto p-4 sm:p-8 custom-scrollbar transition-all duration-800 ease-in-out ${activeTab === "issues" ? "flex flex-col opacity-100 translate-y-0 pointer-events-auto z-10 sm:delay-300" : "hidden sm:block opacity-0 -translate-y-12 pointer-events-none z-0 delay-0"}`}
              onWheel={handleRightPaneWheel}
            >
              <div className="w-full max-w-4xl mx-auto space-y-8 pb-10 overflow-hidden sm:overflow-visible">
                <IssueManager
                  owner={repoSummary.owner}
                  repo={repoSummary.name}
                  issues={details.issues}
                  onIssueUpdated={loadDetails}
                />
              </div>
            </div>

            {/* TAB 4: COMMITS */}
            <div
              className={`relative sm:absolute sm:inset-0 sm:overflow-y-auto p-4 sm:p-8 custom-scrollbar transition-all duration-800 ease-in-out ${activeTab === "commits" ? "flex flex-col opacity-100 translate-y-0 pointer-events-auto z-10 sm:delay-300" : "hidden sm:block opacity-0 -translate-y-12 pointer-events-none z-0 delay-0"}`}
              onWheel={handleRightPaneWheel}
            >
              <div className="w-full max-w-4xl mx-auto space-y-8 pb-10 overflow-hidden sm:overflow-visible">
                <CommitTimeline commits={details.commits} />
              </div>
            </div>

            {/* TAB 5: BRANCHES */}
            <div
              className={`relative sm:absolute sm:inset-0 sm:overflow-y-auto p-4 sm:p-8 custom-scrollbar transition-all duration-800 ease-in-out ${activeTab === "branches" ? "flex flex-col opacity-100 translate-y-0 pointer-events-auto z-10 sm:delay-300" : "hidden sm:block opacity-0 -translate-y-12 pointer-events-none z-0 delay-0"}`}
              onWheel={handleRightPaneWheel}
            >
              <div className="w-full max-w-4xl mx-auto space-y-8 pb-10 overflow-hidden sm:overflow-visible">
                <BranchManager
                  owner={repoSummary.owner}
                  repo={repoSummary.name}
                  branches={details.branches}
                  onBranchCreated={loadDetails}
                />
              </div>
            </div>

            {/* TAB 6: RELEASES */}
            <div
              className={`relative sm:absolute sm:inset-0 sm:overflow-y-auto p-4 sm:p-8 custom-scrollbar transition-all duration-800 ease-in-out ${activeTab === "releases" ? "flex flex-col opacity-100 translate-y-0 pointer-events-auto z-10 sm:delay-300" : "hidden sm:block opacity-0 -translate-y-12 pointer-events-none z-0 delay-0"}`}
              onWheel={handleRightPaneWheel}
            >
              <div className="w-full max-w-4xl mx-auto space-y-8 pb-10 overflow-hidden sm:overflow-visible">
                <ReleaseManager
                  owner={repoSummary.owner}
                  repo={repoSummary.name}
                  releases={details.releases}
                  onReleaseCreated={loadDetails}
                />
              </div>
            </div>

            {/* TAB 7: ACTIONS */}
            <div
              className={`relative sm:absolute sm:inset-0 sm:overflow-y-auto p-4 sm:p-8 custom-scrollbar transition-all duration-800 ease-in-out ${activeTab === "workflows" ? "flex flex-col opacity-100 translate-y-0 pointer-events-auto z-10 sm:delay-300" : "hidden sm:block opacity-0 -translate-y-12 pointer-events-none z-0 delay-0"}`}
              onWheel={handleRightPaneWheel}
            >
              <div className="w-full max-w-4xl mx-auto space-y-8 pb-10 overflow-hidden sm:overflow-visible">
                <WorkflowManager
                  owner={repoSummary.owner}
                  repo={repoSummary.name}
                  workflows={details.workflows}
                  workflowRuns={details.workflowRuns}
                  onTriggered={loadDetails}
                />
              </div>
            </div>

            {/* TAB 8: FILES */}
            <div
              className={`relative sm:absolute sm:inset-0 sm:overflow-y-auto p-4 sm:p-8 custom-scrollbar transition-all duration-800 ease-in-out ${activeTab === "files" ? "flex flex-col opacity-100 translate-y-0 pointer-events-auto z-10 sm:delay-300" : "hidden sm:block opacity-0 -translate-y-12 pointer-events-none z-0 delay-0"}`}
              onWheel={handleRightPaneWheel}
            >
              <div className="w-full max-w-4xl mx-auto space-y-8 pb-10 overflow-hidden sm:overflow-visible">
                <FileExplorer
                  owner={repoSummary.owner}
                  repo={repoSummary.name}
                />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
