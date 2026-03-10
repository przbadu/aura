"use client";

import { useEffect, useRef } from "react";
import { useChatStore } from "@/stores/chat-store";
import { MessageBubble } from "./message-bubble";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Sparkles } from "lucide-react";
import type { Message } from "@/lib/api";

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      <div className="flex max-w-md flex-col items-center gap-5 text-center">
        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 shadow-sm ring-1 ring-border/30">
            <MessageSquare className="h-8 w-8 text-primary/80" />
          </div>
          <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent shadow-sm ring-1 ring-border/30">
            <Sparkles className="h-3 w-3 text-accent-foreground" />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">
            How can I help you today?
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Start a conversation by typing a message below. I can help with writing, analysis, coding, and more.
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageSkeleton() {
  return (
    <div className="space-y-6 p-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={`flex gap-3 ${i % 2 === 0 ? "" : "flex-row-reverse"}`}>
          <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className={`space-y-2 ${i % 2 === 0 ? "max-w-[60%]" : "max-w-[50%] ml-auto"}`}>
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MessageList() {
  const { messages, isStreaming, streamingContent, isLoadingMessages, activeThreadId } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or streaming content updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  if (!activeThreadId && messages.length === 0) {
    return <EmptyState />;
  }

  if (isLoadingMessages) {
    return (
      <ScrollArea className="flex-1">
        <MessageSkeleton />
      </ScrollArea>
    );
  }

  if (messages.length === 0 && !isStreaming) {
    return <EmptyState />;
  }

  // Build streaming message to display at the bottom
  const streamingMessage: Message | null =
    isStreaming
      ? {
          id: "streaming",
          thread_id: activeThreadId || "",
          role: "assistant",
          content: streamingContent,
          tool_calls: [],
          created_at: new Date().toISOString(),
        }
      : null;

  return (
    <ScrollArea className="flex-1">
      <div className="mx-auto max-w-3xl py-6">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {streamingMessage && (
          <MessageBubble
            message={streamingMessage}
            isStreaming
          />
        )}
        <div ref={bottomRef} className="h-1" />
      </div>
    </ScrollArea>
  );
}
