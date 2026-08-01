"use client";

import React, { useState, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import {
  prepareRepository,
  createGitBlobsBatch,
  finalizeGitCommit,
  PushProjectResult,
  TreeItem,
} from "@/app/actions/git";
import {
  ProcessedFile,
  processFileList,
  getFilesFromDataTransferItems,
} from "@/utils/file-utils";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { Footer } from "@/components/Footer";
import {
  FolderUp,
  FileArchive,
  UploadCloud,
  Lock,
  Globe,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  ExternalLink,
  Search,
  FileText,
  Code2,
  Image as ImageIcon,
  Sparkles,
  LogOut,
  ArrowUpRight,
  ShieldCheck,
  FolderArchive,
  Layers,
  LayoutDashboard,
  Upload,
  ArrowDownRight,
  ArrowDown,
  X,
} from "lucide-react";

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

export default function Home() {
  const { data: session, status } = useSession();
  const [activeView, setActiveView] = useState<"push" | "dashboard">("push");

  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [repoName, setRepoName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [commitMessage, setCommitMessage] = useState("Initial commit via GitEase");

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [pushStatusStep, setPushStatusStep] = useState("");

  const [result, setResult] = useState<PushProjectResult | null>(null);
  const [fileSearch, setFileSearch] = useState("");

  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  // Scrolljacking State for Push View
  const [currentSection, setCurrentSection] = useState(0);
  const isScrolling = useRef(false);

  // Scrolljacking State for Unauthenticated landing view
  const [unauthSection, setUnauthSection] = useState(0);
  const isScrollingUnauth = useRef(false);

  const handleWheel = (e: React.WheelEvent) => {
    if (typeof window !== "undefined" && window.innerWidth < 768) return;

    // Unauthenticated scrolljack
    if (!session && status !== "loading") {
      if (isScrollingUnauth.current) return;
      if (Math.abs(e.deltaY) < 10) return;
      if (e.deltaY > 0 && unauthSection < 1) {
        isScrollingUnauth.current = true;
        setUnauthSection(1);
        setTimeout(() => (isScrollingUnauth.current = false), 1000);
      } else if (e.deltaY < 0 && unauthSection > 0) {
        isScrollingUnauth.current = true;
        setUnauthSection(0);
        setTimeout(() => (isScrollingUnauth.current = false), 1000);
      }
      return;
    }

    if (activeView !== "push" || !session) return;
    if (isScrolling.current) return;
    if (Math.abs(e.deltaY) < 10) return;

    if (e.deltaY > 0 && currentSection < 3) {
      isScrolling.current = true;
      setCurrentSection(prev => prev + 1);
      setTimeout(() => (isScrolling.current = false), 1000);
    } else if (e.deltaY < 0 && currentSection > 0) {
      isScrolling.current = true;
      setCurrentSection(prev => prev - 1);
      setTimeout(() => (isScrolling.current = false), 1000);
    }
  };

  // Calculate stats
  const totalSizeBytes = files.reduce((acc, f) => acc + f.size, 0);
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handlePushUpdateForRepo = (targetRepoName: string) => {
    setRepoName(targetRepoName);
    setCommitMessage("Update project files via GitEase");
    setActiveView("push");
    setCurrentSection(1);
  };

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsProcessingFiles(true);
    setResult(null);
    try {
      const { files: processed, suggestedRepoName } = await processFileList(e.target.files);
      setFiles(processed);
      if (suggestedRepoName && !repoName) {
        setRepoName(suggestedRepoName);
      }
    } catch (err: any) {
      setResult({
        success: false,
        error: `Failed to process folder: ${err.message || err}`,
      });
    } finally {
      setIsProcessingFiles(false);
    }
  };

  const handleZipSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsProcessingFiles(true);
    setResult(null);
    try {
      const { files: processed, suggestedRepoName } = await processFileList(e.target.files);
      setFiles(processed);
      if (suggestedRepoName && !repoName) {
        setRepoName(suggestedRepoName);
      }
    } catch (err: any) {
      setResult({
        success: false,
        error: `Failed to extract ZIP archive: ${err.message || err}`,
      });
    } finally {
      setIsProcessingFiles(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setResult(null);

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsProcessingFiles(true);
      try {
        const { files: processed, suggestedRepoName } =
          await getFilesFromDataTransferItems(e.dataTransfer.items);
        setFiles(processed);
        if (suggestedRepoName && !repoName) {
          setRepoName(suggestedRepoName);
        }
      } catch (err: any) {
        setResult({
          success: false,
          error: `Drop error: ${err.message || err}`,
        });
      } finally {
        setIsProcessingFiles(false);
      }
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setIsProcessingFiles(true);
      try {
        const { files: processed, suggestedRepoName } = await processFileList(
          e.dataTransfer.files
        );
        setFiles(processed);
        if (suggestedRepoName && !repoName) {
          setRepoName(suggestedRepoName);
        }
      } catch (err: any) {
        setResult({
          success: false,
          error: `Drop error: ${err.message || err}`,
        });
      } finally {
        setIsProcessingFiles(false);
      }
    }
  };

  const handlePush = async () => {
    if (!repoName.trim()) {
      setResult({ success: false, error: "Please enter a repository name." });
      return;
    }
    if (files.length === 0) {
      setResult({ success: false, error: "Please select or drop files first." });
      return;
    }

    setIsPushing(true);
    setResult(null);

    try {
      // Step 1: Initialize Repository
      setPushStatusStep("Step 1/3: Preparing GitHub repository...");
      const prep = await prepareRepository(repoName.trim(), isPrivate);
      if (
        !prep.success ||
        !prep.owner ||
        !prep.repoName ||
        !prep.parentCommitSha ||
        !prep.defaultBranch
      ) {
        setResult({
          success: false,
          error: prep.error || "Failed to initialize repository.",
        });
        return;
      }

      const { owner, repoName: sanitizedRepo, parentCommitSha, defaultBranch } = prep;

      // Step 2: Upload Blobs in small batches (5 files per batch)
      const BATCH_SIZE = 5;
      const allTreeItems: TreeItem[] = [];

      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        const currentCount = Math.min(i + BATCH_SIZE, files.length);
        setPushStatusStep(
          `Step 2/3: Uploading file blobs (${currentCount}/${files.length})...`
        );

        const batchPayload = batch.map((f) => ({
          path: f.path,
          content: f.content,
          encoding: f.encoding,
        }));

        const blobRes = await createGitBlobsBatch(owner, sanitizedRepo, batchPayload);
        if (!blobRes.success || !blobRes.treeItems) {
          setResult({
            success: false,
            error: blobRes.error || `Failed uploading files batch (${i + 1} to ${currentCount})`,
          });
          return;
        }
        allTreeItems.push(...blobRes.treeItems);
      }

      // Step 3: Finalize Commit
      setPushStatusStep("Step 3/3: Committing tree and updating branch...");
      const finalRes = await finalizeGitCommit(
        owner,
        sanitizedRepo,
        defaultBranch,
        parentCommitSha,
        commitMessage,
        allTreeItems
      );

      if (finalRes.success) {
        // Automatically track newly pushed repo in user's localStorage
        const userKey = session?.user?.email || session?.user?.name || "default";
        const storageKey = `gitease_tracked_repos_${userKey}`;
        try {
          const saved = localStorage.getItem(storageKey);
          const currentList = saved ? JSON.parse(saved) : [];
          if (!currentList.some((item: any) => item.repoName.toLowerCase() === sanitizedRepo.toLowerCase())) {
            currentList.unshift({ owner, repoName: sanitizedRepo });
            localStorage.setItem(storageKey, JSON.stringify(currentList));
          }
        } catch (e) {
          console.error(e);
        }
      }

      setResult(finalRes);
    } catch (err: any) {
      setResult({
        success: false,
        error: err?.message || "An unexpected error occurred during push.",
      });
    } finally {
      setIsPushing(false);
      setPushStatusStep("");
    }
  };

  const clearFiles = () => {
    setFiles([]);
    setResult(null);
    if (folderInputRef.current) folderInputRef.current.value = "";
    if (zipInputRef.current) zipInputRef.current.value = "";
  };

  const removeFile = (filePath: string) => {
    setFiles((prev) => prev.filter((f) => f.path !== filePath));
  };

  const filteredFiles = files.filter((f) =>
    f.path.toLowerCase().includes(fileSearch.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col bg-[var(--card-bg)] rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden relative">
      {/* Soft Header */}
      <header className="w-full px-5 md:px-8 py-4 md:py-6 flex flex-wrap items-center justify-between z-40 relative gap-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white shadow-sm">
            <Code2 className="w-4 h-4" />
          </div>
          <span className="font-bold text-xl tracking-tight text-gray-900 font-sans">
            Gitease.
          </span>
        </div>

        {/* Navigation Outline Pills -> Soft text links */}
        {session && (
          <div className="flex items-center gap-3 order-3 md:order-2 w-full md:w-auto justify-center md:justify-start">
            <nav className="flex items-center gap-6 md:gap-8">
              <button
                onClick={() => setActiveView("push")}
                className={`text-sm font-medium transition-colors ${
                  activeView === "push"
                    ? "text-gray-900"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Push Project
              </button>
              <button
                onClick={() => setActiveView("dashboard")}
                className={`text-sm font-medium transition-colors ${
                  activeView === "dashboard"
                    ? "text-gray-900"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Dashboard
              </button>
            </nav>
          </div>
        )}

        <div className="flex items-center gap-3 order-2 md:order-3">
          {status === "loading" ? (
            <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
          ) : session?.user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200/60 shadow-sm hover:shadow transition-shadow">
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    className="w-6 h-6 rounded-full ring-2 ring-white"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-medium">
                    {session.user.name?.[0] || "U"}
                  </div>
                )}
                <span className="text-sm font-medium text-gray-700 hidden sm:block pr-1">
                  {session.user.name || session.user.email}
                </span>
              </div>
              <button
                onClick={() => signOut()}
                className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200/60 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:shadow shadow-sm transition-all"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn("github")}
              className="flex items-center gap-2 px-5 py-2 rounded-full bg-gray-900 hover:bg-black text-white font-medium text-sm transition-all shadow-sm"
            >
              <GithubIcon className="w-4 h-4" />
              <span>Sign in</span>
            </button>
          )}
        </div>
      </header>

      {/* Scrollable Content Container */}
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden md:overflow-hidden custom-scrollbar flex flex-col w-full max-w-full"
        onWheel={handleWheel}
      >
        {/* Main Container */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-5 md:px-6 py-6 md:py-8 flex flex-col gap-12 relative z-10 min-h-0">
          {/* Unauthenticated State View */}
        {!session && status !== "loading" && (
          <div className="flex-1 relative w-full flex flex-col md:block">
            {/* Section Indicators */}
            <div className="hidden md:flex fixed right-4 sm:right-18 top-1/2 -translate-y-1/2 flex-col gap-3 z-50">
              {[0, 1].map((idx) => (
                <button
                  key={idx}
                  onClick={() => setUnauthSection(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${unauthSection === idx ? "bg-[var(--accent-red)] scale-150" : "bg-gray-300 hover:bg-gray-400"}`}
                />
              ))}
            </div>

            {/* Section 0: Hero */}
            <div className={`relative md:absolute md:inset-0 flex flex-col lg:flex-row items-center gap-12 transition-all duration-800 ease-in-out py-10 md:py-0 ${
              unauthSection === 0
                ? "opacity-100 translate-y-0 pointer-events-auto z-10 md:delay-300"
                : "opacity-100 md:opacity-0 md:-translate-y-12 pointer-events-auto md:pointer-events-none md:z-0 md:delay-0"
            }`}>
              {/* Left: Headline + CTA */}
              <div className="flex-1 space-y-8">
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 text-xs font-semibold text-red-600 border border-red-100">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    GitHub-Powered · No CLI Required
                  </span>
                </div>
                <div className="space-y-4">
                  <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-gray-900 leading-[1.05]">
                    Ship code to
                    <br />
                    <span className="text-[var(--accent-red)]">GitHub</span>, visually.
                  </h1>
                  <p className="text-lg text-gray-500 leading-relaxed max-w-lg">
                    GitEase lets you push entire projects, manage repos, edit READMEs, and handle issues — all without opening a terminal.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    onClick={() => signIn("github")}
                    className="flex items-center gap-2.5 px-8 py-4 rounded-full bg-gray-900 hover:bg-black text-white font-semibold text-sm transition-all shadow-lg shadow-gray-900/20 hover:-translate-y-0.5"
                  >
                    <GithubIcon className="w-4 h-4" />
                    <span>Get Started Free</span>
                  </button>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <div className="flex -space-x-2">
                      <img className="w-8 h-8 rounded-full border-2 border-white" src="https://i.pravatar.cc/100?img=1" alt="User" />
                      <img className="w-8 h-8 rounded-full border-2 border-white" src="https://i.pravatar.cc/100?img=5" alt="User" />
                      <img className="w-8 h-8 rounded-full border-2 border-white" src="https://i.pravatar.cc/100?img=9" alt="User" />
                    </div>
                    <span className="font-medium text-gray-700">10k+ developers trust GitEase</span>
                  </div>
                </div>
              </div>

              {/* Right: Feature Highlights */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
                {[
                  { icon: <FolderUp className="w-5 h-5" />, title: "Drag & Drop Upload", desc: "Upload entire projects as a folder or .zip file with smart filtering." },
                  { icon: <Code2 className="w-5 h-5" />, title: "README Editor", desc: "Rich visual editor with Markdown preview and one-click commit." },
                  { icon: <LayoutDashboard className="w-5 h-5" />, title: "Repo Dashboard", desc: "Manage branches, issues, releases, and settings from one place." },
                  { icon: <ShieldCheck className="w-5 h-5" />, title: "Auto Smart Filter", desc: "Automatically strips node_modules, .git, and binary junk files." },
                ].map((f, i) => (
                  <div key={i} className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all space-y-2">
                    <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600">{f.icon}</div>
                    <h3 className="text-sm font-bold text-gray-900">{f.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 1: Footer */}
            <div className={`relative md:absolute md:inset-0 flex flex-col justify-center transition-all duration-800 ease-in-out py-10 md:py-0 ${
              unauthSection === 1
                ? "opacity-100 translate-y-0 pointer-events-auto z-10 md:delay-300"
                : "opacity-100 md:opacity-0 md:translate-y-12 pointer-events-auto md:pointer-events-none md:z-0 md:delay-0"
            }`}>
              <Footer />
            </div>
          </div>
        )}


        {/* Dashboard View */}
        {session && activeView === "dashboard" && (
          <Dashboard onPushUpdateRepo={handlePushUpdateForRepo} />
        )}

        {/* Push View */}
        {session && activeView === "push" && (
          <div className="flex-1 relative w-full flex flex-col md:block md:h-[60vh] md:min-h-[500px]">
            {/* Section Indicators */}
            <div className="hidden md:flex fixed right-4 sm:right-18 top-1/2 -translate-y-1/2 flex-col gap-3 z-50">
              {[0, 1, 2, 3].map((idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSection(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${currentSection === idx ? "bg-[var(--accent-red)] scale-150" : "bg-gray-300 hover:bg-gray-400"}`}
                />
              ))}
            </div>

            {/* Section 0: Hero */}
            <div id="hero-section" className={`relative md:absolute md:inset-0 flex flex-col justify-center transition-all duration-800 ease-in-out py-8 md:py-0 ${
              currentSection === 0 
                ? "opacity-100 translate-y-0 pointer-events-auto z-10 md:delay-500" 
                : "opacity-100 md:opacity-0 md:-translate-y-12 pointer-events-auto md:pointer-events-none md:z-0 md:delay-0"
            }`}>
              <div className="flex flex-col lg:flex-row lg:items-center gap-12">
                {/* Left: Headline + Steps */}
                <div className="flex-1 space-y-8">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-amber-50 text-[10px] sm:text-xs font-semibold text-amber-700 border border-amber-100">
                      <Sparkles className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                      Zero-config Git workflow
                    </span>
                    <span className="inline-flex px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-red-50 text-[10px] sm:text-xs font-semibold text-red-600 border border-red-100">
                      No terminal required
                    </span>
                  </div>

                  <div className="space-y-3">
                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-gray-900 leading-[1.05]">
                      Deploy projects
                      <br />
                      <span className="text-[var(--accent-red)]">in seconds.</span>
                    </h1>
                    <p className="text-base text-gray-500 leading-relaxed max-w-md">
                      Drop your project folder or .zip — GitEase handles the rest. Clean, commit, and push to GitHub without touching a terminal.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <button
                      onClick={() => {
                        setCurrentSection(1);
                        document.getElementById("upload-section")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gray-900 hover:bg-black text-white font-semibold text-sm transition-all shadow-lg shadow-gray-900/20 hover:-translate-y-0.5"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Start Uploading</span>
                    </button>
                    
                    <button
                      onClick={() => setActiveView("dashboard")}
                      className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-sm transition-all hover:-translate-y-0.5"
                    >
                      <LayoutDashboard className="w-4 h-4 text-[var(--accent-red)]" />
                      <span>Dashboard</span>
                    </button>
                  </div>
                </div>

                {/* Right: How it works + Stats */}
                <div className="flex-1 space-y-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">How it works</p>
                  <div className="space-y-3">
                    {[
                      { step: "01", title: "Drop your project", desc: "Drag a folder or .zip — we filter junk files automatically." },
                      { step: "02", title: "Set repo & commit", desc: "Name your repo, choose visibility, write a commit message." },
                      { step: "03", title: "Push to GitHub", desc: "One click pushes all your files to a new or existing repo." },
                    ].map((s) => (
                      <div key={s.step} className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <span className="text-xs font-black text-gray-300 mt-0.5 w-6 shrink-0">{s.step}</span>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{s.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                      <span className="text-2xl font-bold text-gray-900">10k+</span>
                      <p className="text-xs text-gray-500 mt-0.5">Projects pushed</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                      <span className="text-2xl font-bold text-gray-900">Zero</span>
                      <p className="text-xs text-gray-500 mt-0.5">Config required</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                      <span className="text-2xl font-bold text-gray-900">&lt;30s</span>
                      <p className="text-xs text-gray-500 mt-0.5">Avg push time</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 1: Upload Container */}
            <div id="upload-section" className={`relative md:absolute md:inset-0 flex flex-col justify-center transition-all duration-800 ease-in-out py-8 md:py-0 ${
              currentSection === 1 
                ? "opacity-100 translate-y-0 pointer-events-auto z-10 md:delay-500" 
                : currentSection < 1 
                  ? "opacity-100 md:opacity-0 md:translate-y-12 pointer-events-auto md:pointer-events-none md:z-0 md:delay-0" 
                  : "opacity-100 md:opacity-0 md:-translate-y-12 pointer-events-auto md:pointer-events-none md:z-0 md:delay-0"
            }`}>
              <div className="bg-gray-50/50 rounded-[2.5rem] p-6 sm:p-12 space-y-8 border border-gray-100 relative max-w-4xl w-full mx-auto">
                {/* Decorative background shape */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-[3rem] mix-blend-overlay opacity-50 pointer-events-none transform translate-x-1/2 -translate-y-1/2" />
                
                {/* Dropzone Container */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative rounded-3xl p-6 sm:p-10 md:p-14 text-center transition-all duration-300 cursor-pointer overflow-hidden bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border ${
                    isDragging
                      ? "border-[var(--accent-red)] scale-[1.02] shadow-xl"
                      : "border-transparent hover:border-gray-200 hover:shadow-lg"
                  }`}
                >
                  {/* Hidden Inputs */}
                  <input
                    type="file"
                    ref={folderInputRef}
                    onChange={(e) => { 
                      handleFolderSelect(e); 
                      setCurrentSection(2); 
                      document.getElementById("form-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                    className="hidden"
                    {...({ webkitdirectory: "", directory: "", multiple: true } as any)}
                  />
                  <input
                    type="file"
                    ref={zipInputRef}
                    accept=".zip"
                    onChange={(e) => { 
                      handleZipSelect(e); 
                      setCurrentSection(2); 
                      document.getElementById("form-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                    className="hidden"
                  />

                  {isProcessingFiles ? (
                    <div className="flex flex-col items-center justify-center py-6 space-y-4">
                      <Loader2 className="w-12 h-12 text-[var(--accent-red)] animate-spin" />
                      <div>
                        <p className="text-base font-semibold text-gray-900">
                          Processing & filtering files...
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Ignoring node_modules, .git, and binaries
                        </p>
                      </div>
                    </div>
                  ) : files.length > 0 ? (
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-gray-900 text-white flex items-center justify-center shadow-lg">
                        <FolderArchive className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-2xl font-bold text-gray-900">
                          {files.length} files ready
                        </h3>
                        <p className="text-sm text-gray-500">
                          Total size: {formatSize(totalSizeBytes)} (Cleaned payload)
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-3 pt-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            folderInputRef.current?.click();
                          }}
                          className="px-5 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition-colors"
                        >
                          Change Folder
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            zipInputRef.current?.click();
                          }}
                          className="px-5 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition-colors"
                        >
                          Change ZIP
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearFiles();
                          }}
                          className="w-10 h-10 rounded-full bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors"
                          title="Clear all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-6">
                      <div className="w-20 h-20 rounded-3xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:scale-110 group-hover:bg-red-50 group-hover:text-red-500 transition-all duration-300">
                        <UploadCloud className="w-10 h-10" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xl font-semibold text-gray-900 tracking-tight">
                          Drag & drop your project folder or .zip
                        </p>
                        <p className="text-sm text-gray-500">
                          Or select from your computer below
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            folderInputRef.current?.click();
                          }}
                          className="flex items-center gap-2 px-8 py-3.5 rounded-full bg-gray-900 hover:bg-black text-white font-medium text-sm transition-all shadow-md shadow-gray-900/20"
                        >
                          <FolderUp className="w-4 h-4" />
                          <span>Select Folder</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            zipInputRef.current?.click();
                          }}
                          className="flex items-center gap-2 px-8 py-3.5 rounded-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-medium text-sm transition-colors shadow-sm"
                        >
                          <FileArchive className="w-4 h-4 text-amber-500" />
                          <span>Upload .zip</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Files Preview Table */}
                {files.length > 0 && (
                  <div className="bg-white rounded-3xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <Layers className="w-4 h-4 text-gray-500" />
                        <span>Included Files ({filteredFiles.length})</span>
                      </div>

                      <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 text-gray-400 absolute left-4 top-3" />
                        <input
                          type="text"
                          placeholder="Search files..."
                          value={fileSearch}
                          onChange={(e) => setFileSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-full bg-gray-50 border-none text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-red)]/20 transition-all shadow-inner"
                        />
                      </div>
                    </div>

                    <div 
                      className="max-h-32 overflow-y-auto divide-y divide-gray-50 custom-scrollbar pr-2"
                      onWheel={(e) => e.stopPropagation()}
                    >
                      {filteredFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="py-3 px-3 flex items-center justify-between text-sm hover:bg-gray-50/80 rounded-xl transition-colors"
                        >
                          <div className="flex items-center gap-3 font-medium text-gray-700 truncate max-w-md">
                            {file.encoding === "base64" ? (
                              <ImageIcon className="w-4 h-4 text-[var(--accent-red)] opacity-80 shrink-0" />
                            ) : (
                              <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                            )}
                            <span className="truncate">{file.path}</span>
                          </div>
                          <div className="flex items-center gap-3 text-gray-400 shrink-0 text-xs">
                            <span className="uppercase px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-semibold tracking-wider">
                              {file.encoding}
                            </span>
                            <span className="font-medium">{formatSize(file.size)}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFile(file.path);
                              }}
                              className="p-1 hover:bg-red-100 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                              title="Remove file"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Form & Results */}
            <div id="form-section" className={`relative md:absolute md:inset-0 flex flex-col justify-center transition-all duration-800 ease-in-out py-8 md:py-0 ${
              currentSection === 2 
                ? "opacity-100 translate-y-0 pointer-events-auto z-10 md:delay-500" 
                : "opacity-100 md:opacity-0 md:translate-y-12 pointer-events-auto md:pointer-events-none md:z-0 md:delay-0"
            }`}>
              <div className="max-w-3xl w-full mx-auto space-y-6">
                
                {/* Success Alert Banner */}
                {result?.success && (
                  <div className="bg-emerald-50/50 border border-emerald-200 rounded-[2rem] p-8 shadow-sm space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <h3 className="text-xl font-bold text-gray-900">
                          Successfully committed & pushed
                        </h3>
                        <p className="text-sm text-gray-600">
                          Pushed <strong className="text-gray-900">{result.fileCount} files</strong> to branch <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-md text-xs font-mono text-gray-800">{result.branch}</span>.
                        </p>
                        {result.commitSha && (
                          <p className="text-xs text-gray-500 pt-1">
                            Commit SHA: <span className="font-mono">{result.commitSha.substring(0, 7)}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      {result.repoUrl && (
                        <a
                          href={result.repoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors shadow-sm"
                        >
                          <span>Open on GitHub</span>
                          <ArrowUpRight className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={() => setActiveView("dashboard")}
                        className="px-6 py-2.5 rounded-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-sm font-medium transition-colors shadow-sm"
                      >
                        Open Dashboard
                      </button>
                      <button
                        onClick={() => { 
                          clearFiles(); 
                          setResult(null); 
                          setCurrentSection(1);
                          document.getElementById("upload-section")?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="px-6 py-2.5 rounded-full bg-transparent hover:bg-emerald-100 text-emerald-700 text-sm font-medium transition-colors"
                      >
                        Upload another
                      </button>
                    </div>
                  </div>
                )}

                {/* Error Alert Banner */}
                {result && !result.success && (
                  <div className="bg-red-50/50 border border-red-200 rounded-[2rem] p-6 shadow-sm flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-red-500/20">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <h3 className="text-base font-bold text-gray-900">Push failed</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{result.error}</p>
                    </div>
                  </div>
                )}

                {/* Form Wrapper */}
                <div className="bg-white rounded-[2.5rem] p-6 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 space-y-8">
                  {/* Settings Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2.5">
                      <label className="text-sm font-semibold text-gray-700 pl-2">
                        Repository Name <span className="text-[var(--accent-red)]">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. my-awesome-app"
                        value={repoName}
                        onChange={(e) => setRepoName(e.target.value)}
                        className="w-full px-6 py-4 rounded-full bg-white border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-[var(--accent-red)]/10 focus:border-[var(--accent-red)] transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:border-gray-300"
                      />
                    </div>

                    <div className="space-y-2.5">
                      <label className="text-sm font-semibold text-gray-700 pl-2">
                        Visibility
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setIsPrivate(false)}
                          className={`flex items-center justify-center gap-2 py-4 px-4 rounded-full border text-sm font-medium transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)] ${
                            !isPrivate
                              ? "bg-gray-900 text-white border-gray-900"
                              : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          <Globe className="w-4 h-4" />
                          <span>Public</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsPrivate(true)}
                          className={`flex items-center justify-center gap-2 py-4 px-4 rounded-full border text-sm font-medium transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)] ${
                            isPrivate
                              ? "bg-gray-900 text-white border-gray-900"
                              : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          <Lock className="w-4 h-4 text-amber-500" />
                          <span>Private</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2.5 md:col-span-2">
                      <label className="text-sm font-semibold text-gray-700 pl-2">
                        Commit Message
                      </label>
                      <input
                        type="text"
                        placeholder="Initial commit via GitEase"
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        className="w-full px-6 py-4 rounded-full bg-white border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-[var(--accent-red)]/10 focus:border-[var(--accent-red)] transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:border-gray-300"
                      />
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={handlePush}
                      disabled={isPushing || files.length === 0 || !repoName.trim()}
                      className={`w-full py-5 px-8 rounded-full font-semibold text-base transition-all shadow-lg flex items-center justify-center gap-3 ${
                        isPushing || files.length === 0 || !repoName.trim()
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
                          : "bg-[var(--accent-red)] hover:bg-red-600 text-white shadow-red-500/30 hover:shadow-xl hover:-translate-y-0.5"
                      }`}
                    >
                      {isPushing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>{pushStatusStep || "Pushing project..."}</span>
                        </>
                      ) : (
                        <>
                          <span>Push Project to GitHub</span>
                          <ArrowUpRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Footer */}
            <div className={`relative md:absolute md:inset-0 flex flex-col justify-center transition-all duration-800 ease-in-out py-8 md:py-0 ${
              currentSection === 3 
                ? "opacity-100 translate-y-0 pointer-events-auto z-10 md:delay-500" 
                : "opacity-100 md:opacity-0 md:-translate-y-12 pointer-events-auto md:pointer-events-none md:z-0 md:delay-0"
            }`}>
              <Footer />
            </div>
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
