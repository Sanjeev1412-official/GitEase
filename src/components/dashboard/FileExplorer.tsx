"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  getRepoContents,
  getRepoCloneUrls,
  getFileContent,
  updateFileContent,
  deleteFile,
  deleteFolder,
  RepoContentItem,
} from "@/app/actions/dashboard";
import {
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  Terminal,
  Link,
  KeyRound,
  AlertCircle,
  Home,
  Pencil,
  Trash2,
  Save,
  X,
  TriangleAlert,
} from "lucide-react";

interface FileExplorerProps {
  owner: string;
  repo: string;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" title="Copy">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ─── Confirm Delete Modal ─────────────────────────────────────────────────────
function ConfirmDeleteModal({
  name,
  isFolder,
  commitMessage,
  onCommitMessageChange,
  isDeleting,
  error,
  onConfirm,
  onCancel,
}: {
  name: string;
  isFolder: boolean;
  commitMessage: string;
  onCommitMessageChange: (v: string) => void;
  isDeleting: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 max-w-md w-full mx-4 space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
            <TriangleAlert className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Delete {isFolder ? "Folder" : "File"}?</h3>
            <p className="text-sm text-gray-500 mt-1">
              <span className="font-semibold text-gray-700">{name}</span> will be permanently removed from the repository.
              {isFolder && " All files inside this folder will be deleted."}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 rounded-2xl border border-red-100 text-red-700 text-sm">{error}</div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-600 pl-1">Commit Message</label>
          <input
            type="text"
            value={commitMessage}
            onChange={(e) => onCommitMessageChange(e.target.value)}
            className="w-full px-4 py-2.5 rounded-full bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-300/40 border border-gray-100"
          />
        </div>

        <div className="flex items-center gap-3 justify-end pt-1">
          <button onClick={onCancel} className="px-5 py-2.5 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-all disabled:opacity-50"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── File Editor Modal ────────────────────────────────────────────────────────
function FileEditorModal({
  filePath,
  owner,
  repo,
  onClose,
  onSaved,
}: {
  filePath: string;
  owner: string;
  repo: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [content, setContent] = useState("");
  const [sha, setSha] = useState("");
  const [commitMessage, setCommitMessage] = useState(`Update ${filePath.split("/").pop()} via GitEase`);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const gutterRef = React.useRef<HTMLDivElement>(null);

  // Trigger slide-in on next tick
  useEffect(() => { const t = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(t); }, []);

  const handleClose = () => {
    setMounted(false);
    setTimeout(onClose, 400); // wait for slide-out to finish
  };

  useEffect(() => {
    getFileContent(owner, repo, filePath).then((res) => {
      if (res.success && res.content !== undefined && res.sha) {
        setContent(res.content);
        setSha(res.sha);
      } else {
        setError(res.error || "Failed to load file content.");
      }
      setIsLoading(false);
    });
  }, [owner, repo, filePath]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    const res = await updateFileContent(owner, repo, filePath, content, sha, commitMessage);
    if (res.success) {
      setSaveSuccess(true);
      onSaved();
      setTimeout(() => { setSaveSuccess(false); handleClose(); }, 1500);
    } else {
      setError(res.error || "Failed to save file.");
      setIsSaving(false);
    }
  };

  // Sync gutter scroll with textarea scroll
  const handleTextareaScroll = () => {
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const lines = content.split("\n");
  const lineCount = lines.length;
  const fileName = filePath.split("/").pop() || filePath;

  return (
    /* TRUE full-screen — covers everything including the sidebar */
    <div
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden"
      style={{
        background: "rgba(0,0,0,0.5)",
        backdropFilter: mounted ? "blur(6px)" : "blur(0px)",
        transition: "backdrop-filter 0.4s ease",
      }}
    >
      {/* Slide-up panel */}
      <div
        className="flex flex-col absolute inset-0"
        style={{
          background: "#0d1117",
          transform: mounted ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.45s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
      {/* ── Title Bar (macOS-style) ── */}
      <div
        className="flex items-center gap-0 px-4 shrink-0 border-b"
        style={{ height: "44px", background: "#161b22", borderColor: "#30363d" }}
      >
        {/* Window controls */}
        <div className="flex items-center gap-2 mr-6">
          <button
            onClick={handleClose}
            className="w-3 h-3 rounded-full flex items-center justify-center group"
            style={{ background: "#ff5f57" }}
            title="Close"
          >
            <X className="w-2 h-2 text-red-900 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <div className="w-3 h-3 rounded-full" style={{ background: "#febc2e" }} />
          <div className="w-3 h-3 rounded-full" style={{ background: "#28c840" }} />
        </div>

        {/* Tabs bar */}
        <div className="flex items-end h-full overflow-hidden">
          <div
            className="flex items-center gap-2 px-4 h-full border-r border-l text-xs font-medium"
            style={{ background: "#0d1117", borderColor: "#30363d", color: "#e6edf3", borderBottom: "2px solid #f78166" }}
          >
            <FileText className="w-3.5 h-3.5" style={{ color: "#79c0ff" }} />
            <span>{fileName}</span>
            <button onClick={handleClose} className="ml-1 p-0.5 rounded hover:bg-white/10 transition-colors" style={{ color: "#8b949e" }}>
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Right — path breadcrumb */}
        <div className="flex-1 flex justify-center">
          <span className="text-xs" style={{ color: "#6e7681" }}>{filePath}</span>
        </div>

        {/* Right — line count */}
        <span className="text-xs font-mono" style={{ color: "#6e7681" }}>{lineCount} lines</span>
      </div>

      {/* ── Editor Body ── */}
      <div className="flex-1 flex overflow-hidden">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#f78166" }} />
            <p className="text-sm font-medium" style={{ color: "#8b949e" }}>Loading {fileName}…</p>
          </div>
        ) : (
          <>
            {/* Gutter (line numbers) */}
            <div
              ref={gutterRef}
              className="select-none shrink-0 text-right overflow-hidden font-mono text-xs leading-6 pt-3 pb-3"
              style={{
                width: "60px",
                background: "#0d1117",
                color: "#3d444d",
                paddingRight: "12px",
                paddingLeft: "8px",
                borderRight: "1px solid #21262d",
              }}
              aria-hidden
            >
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i} style={{ lineHeight: "1.5rem" }}>{i + 1}</div>
              ))}
            </div>

            {/* Code textarea */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onScroll={handleTextareaScroll}
              onWheel={(e) => e.stopPropagation()}
              autoFocus
              spellCheck={false}
              className="flex-1 resize-none font-mono text-sm focus:outline-none pt-3 pb-3 pl-4 pr-6"
              style={{
                background: "#0d1117",
                color: "#e6edf3",
                lineHeight: "1.5rem",
                tabSize: 2,
                caretColor: "#f78166",
              }}
            />
          </>
        )}
      </div>

      {/* ── Status Bar ── */}
      <div
        className="flex items-center justify-between px-4 shrink-0 text-xs font-mono"
        style={{ height: "24px", background: "#f78166", color: "#fff" }}
      >
        <div className="flex items-center gap-4">
          <span>GitEase Editor</span>
          <span>{owner}/{repo}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Ln {lineCount}</span>
          <span>UTF-8</span>
        </div>
      </div>

      {/* ── Commit Bar ── */}
      <div
        className="shrink-0 px-6 py-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        style={{ background: "#161b22", borderTop: "1px solid #30363d" }}
      >
        {error && (
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium w-full sm:w-auto"
            style={{ background: "#3d1f1f", color: "#f85149", border: "1px solid #6e3030" }}
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}
        {saveSuccess && (
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium w-full sm:w-auto"
            style={{ background: "#1a2f1a", color: "#3fb950", border: "1px solid #2d5a2d" }}
          >
            <Check className="w-3.5 h-3.5 shrink-0" />
            Committed successfully!
          </div>
        )}
        <input
          type="text"
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Commit message…"
          className="flex-1 px-5 py-3 rounded-xl text-sm font-mono focus:outline-none transition-all"
          style={{
            background: "#0d1117",
            color: "#e6edf3",
            border: "1px solid #30363d",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#f78166")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#30363d")}
        />
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleClose}
            className="px-5 py-3 rounded-xl text-sm font-medium transition-colors"
            style={{ color: "#8b949e", border: "1px solid #30363d" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#21262d"; e.currentTarget.style.color = "#e6edf3"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#8b949e"; }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading || saveSuccess}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: "#f78166", color: "#fff" }}
            onMouseEnter={(e) => { if (!isSaving && !saveSuccess) e.currentTarget.style.background = "#e55e4a"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#f78166"; }}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {isSaving ? "Committing…" : saveSuccess ? "Committed!" : "Commit Changes"}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}


// ─── Main FileExplorer ────────────────────────────────────────────────────────
export function FileExplorer({ owner, repo }: FileExplorerProps) {
  const [currentPath, setCurrentPath] = useState("");
  const [items, setItems] = useState<RepoContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cloneUrls, setCloneUrls] = useState<{ httpsUrl?: string; sshUrl?: string; githubCliUrl?: string } | null>(null);
  const [cloneLoading, setCloneLoading] = useState(true);
  const [activeCloneTab, setActiveCloneTab] = useState<"https" | "ssh" | "cli">("https");

  // Edit state
  const [editingFile, setEditingFile] = useState<string | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<RepoContentItem | null>(null);
  const [deleteCommitMsg, setDeleteCommitMsg] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadContents = useCallback(async (path: string) => {
    setIsLoading(true);
    setError(null);
    const res = await getRepoContents(owner, repo, path);
    if (res.success && res.items) {
      setItems(res.items);
    } else {
      setError(res.error || "Failed to load contents.");
    }
    setIsLoading(false);
  }, [owner, repo]);

  useEffect(() => { loadContents(currentPath); }, [currentPath, loadContents]);
  useEffect(() => {
    getRepoCloneUrls(owner, repo).then((res) => {
      if (res.success) setCloneUrls({ httpsUrl: res.httpsUrl, sshUrl: res.sshUrl, githubCliUrl: res.githubCliUrl });
      setCloneLoading(false);
    });
  }, [owner, repo]);

  const navigateTo = (path: string) => setCurrentPath(path);
  const navigateUp = () => {
    const parts = currentPath.split("/");
    parts.pop();
    setCurrentPath(parts.join("/"));
  };

  const breadcrumbs = currentPath
    ? [{ label: repo, path: "" }, ...currentPath.split("/").map((seg, i, arr) => ({ label: seg, path: arr.slice(0, i + 1).join("/") }))]
    : [{ label: repo, path: "" }];

  const cloneValue = activeCloneTab === "https" ? cloneUrls?.httpsUrl : activeCloneTab === "ssh" ? cloneUrls?.sshUrl : cloneUrls?.githubCliUrl;

  const openDeleteModal = (item: RepoContentItem) => {
    setDeleteTarget(item);
    setDeleteCommitMsg(`Delete ${item.name} via GitEase`);
    setDeleteError(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    let res;
    if (deleteTarget.type === "dir") {
      res = await deleteFolder(owner, repo, deleteTarget.path, deleteCommitMsg);
    } else {
      res = await deleteFile(owner, repo, deleteTarget.path, deleteTarget.sha, deleteCommitMsg);
    }
    setIsDeleting(false);
    if (res.success) {
      setDeleteTarget(null);
      loadContents(currentPath);
    } else {
      setDeleteError(res.error || "Delete failed.");
    }
  };

  return (
    <>
      {/* Edit Modal */}
      {editingFile && (
        <FileEditorModal
          filePath={editingFile}
          owner={owner}
          repo={repo}
          onClose={() => setEditingFile(null)}
          onSaved={() => loadContents(currentPath)}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <ConfirmDeleteModal
          name={deleteTarget.name}
          isFolder={deleteTarget.type === "dir"}
          commitMessage={deleteCommitMsg}
          onCommitMessageChange={setDeleteCommitMsg}
          isDeleting={isDeleting}
          error={deleteError}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="space-y-6">
        {/* Clone Card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 space-y-4" onWheel={(e) => e.stopPropagation()}>
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Link className="w-4 h-4 text-[var(--accent-red)]" />
            Clone Repository
          </h3>
          {cloneLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
          ) : cloneUrls ? (
            <div className="space-y-3">
              <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100 w-max text-xs font-semibold">
                {([
                  { key: "https" as const, label: "HTTPS", icon: <Link className="w-3 h-3" /> },
                  { key: "ssh" as const, label: "SSH", icon: <KeyRound className="w-3 h-3" /> },
                  { key: "cli" as const, label: "GitHub CLI", icon: <Terminal className="w-3 h-3" /> },
                ]).map((tab) => (
                  <button key={tab.key} onClick={() => setActiveCloneTab(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${activeCloneTab === tab.key ? "bg-white text-gray-900 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-700"}`}>
                    {tab.icon}{tab.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100">
                <code className="flex-1 text-xs text-gray-700 font-mono truncate">{cloneValue}</code>
                {cloneValue && <CopyButton value={cloneValue} />}
                <a href={`https://github.com/${owner}/${repo}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" title="Open on GitHub">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ) : <p className="text-sm text-red-500">Failed to load clone URLs.</p>}
        </div>

        {/* File Explorer Card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden" onWheel={(e) => e.stopPropagation()}>
          {/* Header + Breadcrumbs */}
          <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500 overflow-x-auto custom-scrollbar">
              {breadcrumbs.map((crumb, i) => (
                <React.Fragment key={crumb.path}>
                  {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
                  <button onClick={() => navigateTo(crumb.path)}
                    className={`flex items-center gap-1 shrink-0 hover:text-gray-900 transition-colors ${i === breadcrumbs.length - 1 ? "text-gray-900 font-semibold" : ""}`}>
                    {i === 0 && <Home className="w-3.5 h-3.5" />}
                    <span>{crumb.label}</span>
                  </button>
                </React.Fragment>
              ))}
            </div>
            {currentPath && (
              <button onClick={navigateUp} className="shrink-0 text-xs font-medium text-gray-500 hover:text-gray-900 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full transition-colors">
                ↑ Up
              </button>
            )}
          </div>

          {/* Contents */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-[var(--accent-red)] animate-spin" />
              <p className="text-sm text-gray-500">Loading files...</p>
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 m-6 p-4 bg-red-50 rounded-2xl border border-red-100">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <FolderOpen className="w-10 h-10 text-gray-300" />
              <p className="text-sm text-gray-400">This directory is empty.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {items.map((item) => (
                <div
                  key={item.sha + item.path}
                  className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50/80 transition-colors cursor-pointer group"
                  onClick={() => {
                    if (item.type === "dir") navigateTo(item.path);
                    else if (item.htmlUrl) window.open(item.htmlUrl, "_blank");
                  }}
                >
                  {/* Icon */}
                  <div className={`shrink-0 ${item.type === "dir" ? "text-amber-500" : "text-gray-400"}`}>
                    {item.type === "dir" ? <Folder className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  </div>

                  {/* Name */}
                  <span className={`flex-1 text-sm truncate ${item.type === "dir" ? "font-semibold text-gray-800" : "text-gray-700"} group-hover:text-gray-900 transition-colors`}>
                    {item.name}
                  </span>

                  {/* Size */}
                  <span className="text-xs text-gray-400 shrink-0 w-16 text-right">
                    {item.type === "file" ? formatSize(item.size) : ""}
                  </span>

                  {/* Action buttons (visible on hover) */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                    {/* Edit (files only) */}
                    {item.type === "file" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingFile(item.path); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit file"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {/* External link */}
                    {item.htmlUrl && (
                      <a href={item.htmlUrl} target="_blank" rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        title="Open on GitHub">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {/* Delete */}
                    <button
                      onClick={(e) => { e.stopPropagation(); openDeleteModal(item); }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title={`Delete ${item.type === "dir" ? "folder" : "file"}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
