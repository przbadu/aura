"use client";

import { useState, useCallback } from "react";
import { FileText, Upload, File, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploaded_at: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function DropZone({ onFiles }: { onFiles: (files: FileList) => void }) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        onFiles(e.dataTransfer.files);
      }
    },
    [onFiles]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors",
        dragOver
          ? "border-primary bg-primary/5"
          : "border-border/60 hover:border-border"
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
        <Upload className="h-6 w-6 text-primary" />
      </div>
      <p className="mt-3 text-sm font-medium">
        Drag and drop files here
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        or click to browse from your computer
      </p>
      <label className="mt-4 cursor-pointer">
        <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          <Upload className="h-4 w-4" />
          Browse Files
        </span>
        <input
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onFiles(e.target.files);
            }
          }}
        />
      </label>
      <p className="mt-3 text-[11px] text-muted-foreground/60">
        PDF, TXT, MD, CSV, JSON, DOCX up to 10MB
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <FileText className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-sm font-medium">No documents yet</h3>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
        Upload documents to give the AI context about your domain. Supported
        formats include PDF, TXT, Markdown, and more.
      </p>
    </div>
  );
}

function FileRow({ file }: { file: DocumentFile }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-card px-4 py-3 transition-colors hover:bg-muted/30">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <File className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.name}</p>
        <p className="text-[11px] text-muted-foreground">
          {file.type}
        </p>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">
        {formatBytes(file.size)}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground/60">
        {formatDate(file.uploaded_at)}
      </span>
    </div>
  );
}

export default function DocumentsPage() {
  const [files] = useState<DocumentFile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const handleFiles = useCallback((_fileList: FileList) => {
    // TODO: implement actual upload to backend
    console.log("Files selected for upload:", _fileList);
  }, []);

  const filtered = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold tracking-tight">
          Knowledge Base
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Upload documents to give the AI context about your domain.
        </p>
      </div>

      {/* Drop zone */}
      <DropZone onFiles={handleFiles} />

      {/* Search (only show when there are files) */}
      {files.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg border border-border/60 bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
          />
        </div>
      )}

      {/* File list */}
      {files.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-muted-foreground">
              {filtered.length} document{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
          {filtered.map((file) => (
            <FileRow key={file.id} file={file} />
          ))}
        </div>
      )}
    </div>
  );
}
