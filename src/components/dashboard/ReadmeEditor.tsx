"use client";

import React, { useState } from "react";
import { saveReadmeContent } from "@/app/actions/dashboard";
import { Save, Eye, Edit3, Loader2, Bold, Italic, Strikethrough, Heading1, Heading2, List, ListOrdered, Code, Link } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";

interface ReadmeEditorProps {
  owner: string;
  repo: string;
  initialContent: string;
  initialSha: string;
  onSaved?: () => void;
}

export function ReadmeEditor({
  owner,
  repo,
  initialContent,
  initialSha,
  onSaved,
}: ReadmeEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [sha, setSha] = useState(initialSha);
  const [commitMessage, setCommitMessage] = useState("Update README.md via GitEase");
  const [activeTab, setActiveTab] = useState<"visual" | "raw" | "preview">("visual");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    content: initialContent,
    onUpdate: ({ editor }) => {
      setContent((editor.storage as any).markdown.getMarkdown());
    },
    editorProps: {
      attributes: {
        class: "prose prose-gray max-w-none focus:outline-none min-h-[400px] leading-relaxed text-gray-800",
      },
    },
  });

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const res = await saveReadmeContent(owner, repo, content, sha, commitMessage);
      if (res.success) {
        if (res.newSha) setSha(res.newSha);
        setStatusMessage({
          type: "success",
          text: "README.md committed to GitHub successfully!",
        });
        if (onSaved) onSaved();
      } else {
        setStatusMessage({
          type: "error",
          text: res.error || "Failed to commit README.md.",
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err?.message || "Error saving README.md",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 p-4 sm:p-5 bg-white border border-gray-100 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        
        {/* Tab Switcher */}
        <div className="flex items-center justify-center gap-1.5 bg-gray-50 p-1.5 rounded-full border border-gray-100 text-sm font-semibold shadow-inner w-full sm:w-max max-w-full overflow-x-auto mx-auto xl:mx-0">
          <button
            type="button"
            onClick={() => setActiveTab("visual")}
            title="Visual Editor"
            className={`flex items-center justify-center rounded-full transition-all duration-300 ease-out h-9 ${
              activeTab === "visual"
                ? "bg-white text-gray-900 shadow-sm border border-gray-200 w-[110px]"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 w-[44px]"
            }`}
          >
            <Edit3 className="w-4 h-4 shrink-0" />
            <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-out ${
              activeTab === "visual" ? "max-w-[100px] opacity-100 ml-2" : "max-w-0 opacity-0 ml-0"
            }`}>
              Visual
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("raw")}
            title="Raw Markdown"
            className={`flex items-center justify-center rounded-full transition-all duration-300 ease-out h-9 ${
              activeTab === "raw"
                ? "bg-white text-gray-900 shadow-sm border border-gray-200 w-[120px]"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 w-[44px]"
            }`}
          >
            <Code className="w-4 h-4 shrink-0" />
            <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-out ${
              activeTab === "raw" ? "max-w-[100px] opacity-100 ml-2" : "max-w-0 opacity-0 ml-0"
            }`}>
              Markdown
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            title="Preview"
            className={`flex items-center justify-center rounded-full transition-all duration-300 ease-out h-9 ${
              activeTab === "preview"
                ? "bg-white text-gray-900 shadow-sm border border-gray-200 w-[110px]"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 w-[44px]"
            }`}
          >
            <Eye className="w-4 h-4 shrink-0" />
            <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-out ${
              activeTab === "preview" ? "max-w-[100px] opacity-100 ml-2" : "max-w-0 opacity-0 ml-0"
            }`}>
              Preview
            </span>
          </button>
        </div>

        {/* Input & Commit Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
          <input
            type="text"
            placeholder="Commit message..."
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            className="flex-1 xl:w-64 px-5 py-2.5 rounded-full bg-gray-50 border-none text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-red)]/20 shadow-inner transition-all min-w-0"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[var(--accent-red)] hover:bg-red-600 text-white text-sm font-semibold transition-all disabled:opacity-50 shrink-0 shadow-md shadow-red-500/20 whitespace-nowrap"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isSaving ? "Saving..." : "Commit"}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-2xl text-sm font-medium ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border border-emerald-100 text-emerald-800"
              : "bg-red-50 border border-red-100 text-red-800"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Editor Content Area */}
      <div className="border border-gray-100 rounded-3xl bg-white overflow-hidden min-h-[450px] flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        {activeTab === "visual" && (
          <div className="flex flex-col h-full">
            {/* Formatting Toolbar */}
            {editor && (
              <div className="flex items-center gap-1.5 p-3 border-b border-gray-100 bg-gray-50/50 overflow-x-auto custom-scrollbar flex-nowrap w-full">
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={`p-2 rounded-lg transition-colors ${editor.isActive("bold") ? "bg-[var(--accent-red)]/10 text-[var(--accent-red)]" : "text-gray-600 hover:bg-gray-200"}`}
                  title="Bold"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={`p-2 rounded-lg transition-colors ${editor.isActive("italic") ? "bg-[var(--accent-red)]/10 text-[var(--accent-red)]" : "text-gray-600 hover:bg-gray-200"}`}
                  title="Italic"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                  className={`p-2 rounded-lg transition-colors ${editor.isActive("strike") ? "bg-[var(--accent-red)]/10 text-[var(--accent-red)]" : "text-gray-600 hover:bg-gray-200"}`}
                  title="Strikethrough"
                >
                  <Strikethrough className="w-4 h-4" />
                </button>
                
                <div className="w-px h-5 bg-gray-300 mx-1"></div>

                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  className={`p-2 rounded-lg transition-colors ${editor.isActive("heading", { level: 1 }) ? "bg-[var(--accent-red)]/10 text-[var(--accent-red)]" : "text-gray-600 hover:bg-gray-200"}`}
                  title="Heading 1"
                >
                  <Heading1 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={`p-2 rounded-lg transition-colors ${editor.isActive("heading", { level: 2 }) ? "bg-[var(--accent-red)]/10 text-[var(--accent-red)]" : "text-gray-600 hover:bg-gray-200"}`}
                  title="Heading 2"
                >
                  <Heading2 className="w-4 h-4" />
                </button>

                <div className="w-px h-5 bg-gray-300 mx-1"></div>

                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className={`p-2 rounded-lg transition-colors ${editor.isActive("bulletList") ? "bg-[var(--accent-red)]/10 text-[var(--accent-red)]" : "text-gray-600 hover:bg-gray-200"}`}
                  title="Bullet List"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  className={`p-2 rounded-lg transition-colors ${editor.isActive("orderedList") ? "bg-[var(--accent-red)]/10 text-[var(--accent-red)]" : "text-gray-600 hover:bg-gray-200"}`}
                  title="Numbered List"
                >
                  <ListOrdered className="w-4 h-4" />
                </button>

                <div className="w-px h-5 bg-gray-300 mx-1"></div>

                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                  className={`p-2 rounded-lg transition-colors ${editor.isActive("codeBlock") ? "bg-[var(--accent-red)]/10 text-[var(--accent-red)]" : "text-gray-600 hover:bg-gray-200"}`}
                  title="Code Block"
                >
                  <Code className="w-4 h-4" />
                </button>
              </div>
            )}
            
            {/* Tiptap Editor Content */}
            <div className="p-8 flex-1 overflow-y-auto max-h-[500px]">
              <EditorContent editor={editor} />
            </div>
          </div>
        )}

        {activeTab === "raw" && (
          <div className="flex flex-col h-full bg-gray-50/30">
             <textarea
               value={content}
               onChange={(e) => {
                 setContent(e.target.value);
                 if (editor) {
                   editor.commands.setContent(e.target.value);
                 }
               }}
               placeholder="# Project Title\n\nDescribe your project in Markdown..."
               className="w-full h-[500px] p-8 bg-transparent text-gray-800 font-mono text-sm focus:outline-none resize-y leading-relaxed"
             />
          </div>
        )}

        {activeTab === "preview" && (
          <div className="p-8 prose prose-gray max-w-none text-gray-800 text-sm overflow-y-auto max-h-[500px] custom-scrollbar bg-gray-50/10">
            {content.trim() ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            ) : (
              <p className="text-gray-400 italic">
                No README content to preview. Start typing in Visual or Raw mode.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
