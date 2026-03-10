"use client";

import { useState } from "react";
import { Bot, Check, Copy, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "./markdown-renderer";
import type { Message } from "@/lib/api";

function StreamingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" />
    </span>
  );
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "group flex gap-3 px-4 py-2",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold mt-0.5",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground ring-1 ring-border/50"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "relative max-w-[75%] min-w-0",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-card text-card-foreground rounded-bl-md shadow-sm ring-1 ring-border/40"
          )}
        >
          {isStreaming && !message.content ? (
            <StreamingDots />
          ) : isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose-chat">
              <MarkdownRenderer content={message.content} />
              {isStreaming && (
                <span className="ml-1 inline-block">
                  <span className="inline-block h-3 w-0.5 animate-pulse bg-current" />
                </span>
              )}
            </div>
          )}
        </div>

        {/* Hover actions row */}
        <div
          className={cn(
            "mt-1 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100",
            isUser ? "flex-row-reverse" : "flex-row"
          )}
        >
          <span className="text-[11px] text-muted-foreground/60">
            {formatTime(message.created_at)}
          </span>
          {!isStreaming && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground/60 transition-colors hover:bg-muted hover:text-muted-foreground"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" /> Copy
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
