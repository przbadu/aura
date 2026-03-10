import { create } from "zustand";
import type { Thread, Message } from "@/lib/api";
import * as api from "@/lib/api";

interface ChatState {
  threads: Thread[];
  activeThreadId: string | null;
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  isLoadingThreads: boolean;
  isLoadingMessages: boolean;

  // Thread actions
  fetchThreads: () => Promise<void>;
  createThread: () => Promise<string>;
  setActiveThread: (id: string | null) => Promise<void>;
  renameThread: (id: string, title: string) => Promise<void>;
  deleteThread: (id: string) => Promise<void>;

  // Message actions
  sendMessage: (content: string) => Promise<void>;
  setStreamingContent: (content: string) => void;
  appendStreamContent: (content: string) => void;
  setIsStreaming: (streaming: boolean) => void;
  addMessage: (message: Message) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  threads: [],
  activeThreadId: null,
  messages: [],
  isStreaming: false,
  streamingContent: "",
  isLoadingThreads: false,
  isLoadingMessages: false,

  fetchThreads: async () => {
    set({ isLoadingThreads: true });
    try {
      const threads = await api.fetchThreads();
      set({ threads, isLoadingThreads: false });
    } catch {
      set({ isLoadingThreads: false });
    }
  },

  createThread: async () => {
    const thread = await api.createThread();
    set((state) => ({
      threads: [thread, ...state.threads],
      activeThreadId: thread.id,
      messages: [],
    }));
    return thread.id;
  },

  setActiveThread: async (id: string | null) => {
    set({ activeThreadId: id, messages: [], isLoadingMessages: !!id });
    if (id) {
      try {
        const messages = await api.fetchMessages(id);
        set({ messages, isLoadingMessages: false });
      } catch {
        set({ isLoadingMessages: false });
      }
    }
  },

  renameThread: async (id: string, title: string) => {
    await api.updateThread(id, title);
    set((state) => ({
      threads: state.threads.map((t) =>
        t.id === id ? { ...t, title } : t
      ),
    }));
  },

  deleteThread: async (id: string) => {
    await api.deleteThread(id);
    const { activeThreadId } = get();
    set((state) => ({
      threads: state.threads.filter((t) => t.id !== id),
      activeThreadId: activeThreadId === id ? null : activeThreadId,
      messages: activeThreadId === id ? [] : state.messages,
    }));
  },

  sendMessage: async (content: string) => {
    const { activeThreadId } = get();

    // Add user message optimistically
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      thread_id: activeThreadId || "",
      role: "user",
      content,
      tool_calls: [],
      created_at: new Date().toISOString(),
    };
    set((state) => ({
      messages: [...state.messages, tempUserMsg],
      isStreaming: true,
      streamingContent: "",
    }));

    try {
      let threadId = activeThreadId;
      let fullContent = "";

      await api.streamChat(content, threadId || undefined, (event) => {
        if (event.type === "thread_created" && "thread_id" in event) {
          threadId = (event as unknown as { thread_id: string }).thread_id;
          set({ activeThreadId: threadId });
          // Refresh threads to show new one
          get().fetchThreads();
        } else if (event.type === "text_delta") {
          fullContent += event.data;
          set({ streamingContent: fullContent });
        } else if (event.type === "message_end") {
          const assistantMsg: Message = {
            id: `msg-${Date.now()}`,
            thread_id: threadId || "",
            role: "assistant",
            content: fullContent,
            tool_calls: [],
            created_at: new Date().toISOString(),
          };
          set((state) => ({
            messages: [...state.messages, assistantMsg],
            isStreaming: false,
            streamingContent: "",
          }));
        }
      });
    } catch (error) {
      set({ isStreaming: false, streamingContent: "" });
      console.error("Failed to send message:", error);
    }
  },

  setStreamingContent: (content) => set({ streamingContent: content }),
  appendStreamContent: (content) =>
    set((state) => ({ streamingContent: state.streamingContent + content })),
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
}));
