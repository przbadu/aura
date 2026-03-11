"use client";

import { useState, useEffect } from "react";
import { useChatStore } from "@/stores/chat-store";
import { ThreadSidebar } from "./thread-sidebar";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { PanelLeftClose, PanelLeftOpen, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChatLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const fetchThreads = useChatStore((s) => s.fetchThreads);
  const error = useChatStore((s) => s.error);
  const clearError = useChatStore((s) => s.clearError);

  // Initialize by fetching threads
  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Desktop sidebar */}
      {!isMobile && (
        <div
          className={cn(
            "relative shrink-0 border-r border-sidebar-border transition-all duration-300 ease-in-out",
            sidebarOpen ? "w-[280px]" : "w-0"
          )}
        >
          <div className={cn(
            "absolute inset-0 overflow-hidden transition-opacity duration-300",
            sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}>
            <ThreadSidebar className="w-[280px]" />
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
          {isMobile ? (
            <Sheet>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="icon-sm" aria-label="Open sidebar" />
                }
              >
                <Menu className="h-4 w-4" />
              </SheetTrigger>
              <SheetContent side="left" showCloseButton={true} className="w-[280px] p-0">
                <SheetTitle className="sr-only">Chat threads</SheetTitle>
                <ThreadSidebar />
              </SheetContent>
            </Sheet>
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 bg-destructive/10 border-b border-destructive/20 px-4 py-2 text-sm text-destructive">
            <span className="flex-1">{error}</span>
            <button
              onClick={clearError}
              className="shrink-0 rounded p-0.5 hover:bg-destructive/20"
              aria-label="Dismiss error"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Messages */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <MessageList />
          <MessageInput />
        </div>
      </div>
    </div>
  );
}
