"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useChatStore } from "@/stores/chat-store";
import { ArrowUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function MessageInput() {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, isStreaming, activeThreadId, createThread } = useChatStore();

  const canSend = content.trim().length > 0 && !isStreaming;

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [content, adjustHeight]);

  const handleSend = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed || isStreaming) return;

    setContent("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // If no active thread, create one first
    if (!activeThreadId) {
      await createThread();
    }

    sendMessage(trimmed);
  }, [content, isStreaming, activeThreadId, createThread, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="border-t border-border/50 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto max-w-3xl px-4 py-3">
        <div
          className={cn(
            "relative flex items-end gap-2 rounded-2xl border bg-card shadow-sm transition-all duration-200",
            isStreaming
              ? "border-border/30"
              : "border-border/50 focus-within:border-ring focus-within:shadow-md focus-within:ring-2 focus-within:ring-ring/20"
          )}
        >
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? "AI is thinking..." : "Type a message..."}
            disabled={isStreaming}
            rows={1}
            className={cn(
              "flex-1 resize-none bg-transparent px-4 py-3 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/60",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "scrollbar-thin scrollbar-thumb-border"
            )}
            style={{ maxHeight: "200px" }}
          />

          <div className="flex items-center gap-1 pb-2 pr-2">
            {isStreaming ? (
              <div className="flex h-8 w-8 items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <button
                onClick={handleSend}
                disabled={!canSend}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200",
                  canSend
                    ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-95"
                    : "bg-muted text-muted-foreground/40"
                )}
                aria-label="Send message"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <p className="mt-2 text-center text-[11px] text-muted-foreground/50">
          Press Enter to send, Shift+Enter for a new line
        </p>
      </div>
    </div>
  );
}
