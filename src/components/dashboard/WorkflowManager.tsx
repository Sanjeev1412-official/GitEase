"use client";

import React, { useState } from "react";
import { WorkflowInfo, WorkflowRunInfo, dispatchWorkflow } from "@/app/actions/dashboard";
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  Loader2,
  Cpu,
  Activity,
} from "lucide-react";

interface WorkflowManagerProps {
  owner: string;
  repo: string;
  workflows: WorkflowInfo[];
  workflowRuns: WorkflowRunInfo[];
  onTriggered?: () => void;
}

export function WorkflowManager({
  owner,
  repo,
  workflows,
  workflowRuns,
  onTriggered,
}: WorkflowManagerProps) {
  const [dispatchingWfId, setDispatchingWfId] = useState<number | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleTriggerWorkflow = async (wfId: number) => {
    setDispatchingWfId(wfId);
    setMessage(null);
    try {
      const res = await dispatchWorkflow(owner, repo, wfId, "main");
      if (res.success) {
        setMessage({
          type: "success",
          text: "Workflow dispatch event triggered on GitHub successfully!",
        });
        if (onTriggered) onTriggered();
      } else {
        setMessage({
          type: "error",
          text: res.error || "Failed to dispatch workflow.",
        });
      }
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err?.message || "Error dispatching workflow.",
      });
    } finally {
      setDispatchingWfId(null);
    }
  };

  const getConclusionBadge = (status: string | null, conclusion: string | null) => {
    if (status === "in_progress" || status === "queued") {
      return (
        <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/50 shadow-inner">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>{status === "in_progress" ? "In Progress" : "Queued"}</span>
        </span>
      );
    }
    if (conclusion === "success") {
      return (
        <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/50 shadow-inner">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Success</span>
        </span>
      );
    }
    if (conclusion === "failure") {
      return (
        <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200/50 shadow-inner">
          <XCircle className="w-3.5 h-3.5 text-red-600" />
          <span>Failed</span>
        </span>
      );
    }
    return (
      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 shadow-inner capitalize">
        {conclusion || status || "Unknown"}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {message && (
        <div
          className={`p-4 rounded-2xl text-sm font-medium ${
            message.type === "success"
              ? "bg-emerald-50 border border-emerald-100 text-emerald-800"
              : "bg-red-50 border border-red-100 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Configured Workflows */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-3">
          <div className="p-2 bg-gray-50 rounded-xl border border-gray-100 shadow-sm">
            <Cpu className="w-5 h-5 text-[var(--accent-red)]" />
          </div>
          <span>Configured Workflows ({workflows.length})</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              className="p-5 bg-white border border-gray-100 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group"
            >
              <div className="space-y-1 w-full sm:w-auto overflow-hidden">
                <h4 className="text-sm font-bold text-gray-900 truncate">{wf.name}</h4>
                <p className="text-xs font-medium text-gray-500 truncate">{wf.path}</p>
              </div>

              <button
                type="button"
                onClick={() => handleTriggerWorkflow(wf.id)}
                disabled={dispatchingWfId === wf.id}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-gray-900 hover:bg-[var(--accent-red)] text-white text-sm font-semibold transition-all disabled:opacity-50 shrink-0 shadow-sm w-full sm:w-auto"
              >
                {dispatchingWfId === wf.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>Run</span>
              </button>
            </div>
          ))}

          {workflows.length === 0 && (
            <div className="sm:col-span-2 flex flex-col items-center justify-center py-12 bg-white border border-dashed border-gray-200 rounded-3xl space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
              <Cpu className="w-10 h-10 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">No GitHub Actions workflows found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Workflow Runs */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-3">
          <div className="p-2 bg-gray-50 rounded-xl border border-gray-100 shadow-sm">
            <Activity className="w-5 h-5 text-[var(--accent-red)]" />
          </div>
          <span>Recent Workflow Runs ({workflowRuns.length})</span>
        </h3>

        <div className="border border-gray-100 rounded-3xl bg-white overflow-hidden divide-y divide-gray-100 max-h-72 overflow-y-auto custom-scrollbar shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          {workflowRuns.map((run) => (
            <div
              key={run.id}
              className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors group"
            >
              <div className="space-y-1.5 w-full sm:w-auto overflow-hidden">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 truncate">
                    {run.name || "Workflow Run"}
                  </span>
                  {run.headBranch && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 shadow-sm">
                      {run.headBranch}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(run.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 shrink-0 mt-2 sm:mt-0">
                {getConclusionBadge(run.status, run.conclusion)}
                <a
                  href={run.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-gray-400 hover:text-gray-900 transition-colors shadow-sm"
                  title="View workflow run on GitHub"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}

          {workflowRuns.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Activity className="w-10 h-10 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">No recent workflow run history.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
