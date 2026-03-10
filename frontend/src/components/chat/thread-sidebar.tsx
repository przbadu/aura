"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useChatStore } from "@/stores/chat-store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  MessageSquare,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ThreadSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
          <div className="h-4 w-4 animate-pulse rounded bg-muted" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-1/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface ThreadItemProps {
  thread: { id: string; title: string; updated_at: string };
  isActive: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}

function ThreadItem({ thread, isActive, onSelect, onRename, onDelete }: ThreadItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(thread.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const deleteTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    return () => {
      if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
    };
  }, []);

  const handleStartEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTitle(thread.title);
    setIsEditing(true);
  }, [thread.title]);

  const handleConfirmEdit = useCallback(() => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== thread.title) {
      onRename(trimmed);
    }
    setIsEditing(false);
  }, [editTitle, thread.title, onRename]);

  const handleCancelEdit = useCallback(() => {
    setEditTitle(thread.title);
    setIsEditing(false);
  }, [thread.title]);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDelete) {
      onDelete();
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      deleteTimeoutRef.current = setTimeout(() => setConfirmDelete(false), 3000);
    }
  }, [confirmDelete, onDelete]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleConfirmEdit();
    if (e.key === "Escape") handleCancelEdit();
  }, [handleConfirmEdit, handleCancelEdit]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={isEditing ? undefined : onSelect}
      onKeyDown={(e) => { if (e.key === "Enter" && !isEditing) onSelect(); }}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 cursor-pointer",
        isActive
          ? "bg-accent text-accent-foreground shadow-sm before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-primary"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      <MessageSquare className={cn(
        "h-4 w-4 shrink-0 transition-colors",
        isActive ? "text-primary" : "text-muted-foreground/60"
      )} />

      {isEditing ? (
        <div className="flex flex-1 items-center gap-1">
          <input
            ref={inputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleConfirmEdit}
            className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
          />
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleConfirmEdit}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <Check className="h-3 w-3" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <div className="truncate font-medium leading-snug">{thread.title}</div>
            <div className="text-[11px] text-muted-foreground/70 mt-0.5">
              {formatRelativeTime(thread.updated_at)}
            </div>
          </div>

          <div className={cn(
            "flex items-center gap-0.5 opacity-0 transition-opacity",
            "group-hover:opacity-100",
            isActive && "opacity-100"
          )}>
            <button
              onClick={handleStartEdit}
              className="rounded p-1 text-muted-foreground/70 transition-colors hover:bg-background/80 hover:text-foreground"
              aria-label="Rename thread"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={handleDeleteClick}
              className={cn(
                "rounded p-1 transition-colors",
                confirmDelete
                  ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                  : "text-muted-foreground/70 hover:bg-background/80 hover:text-destructive"
              )}
              aria-label={confirmDelete ? "Click again to confirm delete" : "Delete thread"}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function ThreadSidebar({ className }: { className?: string }) {
  const {
    threads,
    activeThreadId,
    isLoadingThreads,
    fetchThreads,
    createThread,
    setActiveThread,
    renameThread,
    deleteThread,
  } = useChatStore();

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  return (
    <div className={cn("flex h-full flex-col bg-sidebar", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3">
        <h2 className="text-sm font-semibold text-sidebar-foreground">Chats</h2>
        <Button
          variant="default"
          size="sm"
          onClick={() => createThread()}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          New Chat
        </Button>
      </div>

      {/* Thread list */}
      <ScrollArea className="flex-1">
        {isLoadingThreads ? (
          <ThreadSkeleton />
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No conversations yet</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Start a new chat to begin
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-0.5 p-2">
            {threads.map((thread) => (
              <ThreadItem
                key={thread.id}
                thread={thread}
                isActive={thread.id === activeThreadId}
                onSelect={() => setActiveThread(thread.id)}
                onRename={(title) => renameThread(thread.id, title)}
                onDelete={() => deleteThread(thread.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
