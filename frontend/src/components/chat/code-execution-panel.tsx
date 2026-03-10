"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Loader2,
  Download,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ExecutionFile {
  filename: string;
  size: number;
  download_url: string;
}

interface CodeExecutionResult {
  code: string;
  stdout?: string;
  stderr?: string;
  exit_code: number;
  execution_time_ms: number;
  status: "running" | "completed" | "failed";
  files?: ExecutionFile[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function StatusIcon({ status }: { status: CodeExecutionResult["status"] }) {
  switch (status) {
    case "running":
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />;
    case "completed":
      return <Check className="h-3.5 w-3.5 text-emerald-400" />;
    case "failed":
      return <X className="h-3.5 w-3.5 text-red-400" />;
  }
}

export function CodeExecutionPanel({ result }: { result: CodeExecutionResult }) {
  const [codeExpanded, setCodeExpanded] = useState(false);

  const hasOutput = result.stdout || result.stderr;
  const hasFiles = result.files && result.files.length > 0;
  const isFailed = result.status === "failed" || result.exit_code !== 0;

  return (
    <div className="my-2 w-full overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
        <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-500">
          Python
        </span>
        <StatusIcon status={result.status} />
        <span className="text-xs text-muted-foreground">
          {result.status === "running"
            ? "Executing..."
            : result.status === "completed"
              ? "Finished"
              : "Failed"}
        </span>
        <span className="ml-auto text-[11px] text-muted-foreground/60">
          {formatDuration(result.execution_time_ms)}
        </span>
      </div>

      {/* Code preview (collapsible) */}
      <button
        onClick={() => setCodeExpanded(!codeExpanded)}
        className="flex w-full items-center gap-1.5 border-b border-border/40 px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/50"
      >
        {codeExpanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <span className="font-medium">Code</span>
        {!codeExpanded && (
          <span className="ml-1 truncate font-mono text-[11px] text-muted-foreground/50">
            {result.code.split("\n")[0]}
          </span>
        )}
      </button>

      {codeExpanded && (
        <div className="border-b border-border/40 bg-zinc-950 p-3">
          <pre className="overflow-x-auto text-xs leading-relaxed text-zinc-300">
            <code>{result.code}</code>
          </pre>
        </div>
      )}

      {/* Output */}
      {hasOutput && (
        <div className="bg-zinc-950 p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-zinc-500">
            <Terminal className="h-3 w-3" />
            Output
          </div>
          <pre className="overflow-x-auto text-xs leading-relaxed">
            {result.stdout && (
              <code className="text-emerald-400">{result.stdout}</code>
            )}
            {result.stderr && (
              <code className="text-red-400">{result.stderr}</code>
            )}
          </pre>
        </div>
      )}

      {/* Error state */}
      {isFailed && !result.stderr && (
        <div className="border-t border-red-500/20 bg-red-500/5 px-3 py-2">
          <p className="text-xs text-red-400">
            Process exited with code {result.exit_code}
          </p>
        </div>
      )}

      {/* Files */}
      {hasFiles && (
        <div className="border-t border-border/40 px-3 py-2">
          <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
            Files
          </p>
          <div className="flex flex-wrap gap-2">
            {result.files!.map((file) => (
              <a
                key={file.filename}
                href={file.download_url}
                download={file.filename}
                className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5 text-xs transition-colors hover:bg-muted/60"
              >
                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{file.filename}</span>
                <span className="text-muted-foreground/60">
                  {formatBytes(file.size)}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
