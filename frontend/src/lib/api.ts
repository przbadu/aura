import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getAuthHeaders(forceRefresh = false) {
  const supabase = createClient();

  let token = "";

  if (!forceRefresh) {
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token || "";
  }

  // Fallback: if getSession() returns no token or forced refresh, try refreshing
  if (!token) {
    const { data } = await supabase.auth.refreshSession();
    token = data.session?.access_token || "";
  }

  if (!token) {
    throw new Error("Not authenticated");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
  timeout = 30000
): Promise<Response> {
  const headers = await getAuthHeaders();
  const res = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers },
    signal: AbortSignal.timeout(timeout),
  });

  // Retry once with refreshed token on 401
  if (res.status === 401) {
    const freshHeaders = await getAuthHeaders(true);
    return fetch(url, {
      ...options,
      headers: { ...freshHeaders, ...options.headers },
      signal: AbortSignal.timeout(timeout),
    });
  }

  return res;
}

export interface Thread {
  id: string;
  title: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  thread_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tool_calls: unknown[];
  created_at: string;
}

export async function fetchThreads(): Promise<Thread[]> {
  const res = await fetchWithAuth(`${API_URL}/api/threads`);
  if (!res.ok) throw new Error("Failed to fetch threads");
  return res.json();
}

export async function createThread(title?: string): Promise<Thread> {
  const res = await fetchWithAuth(`${API_URL}/api/threads`, {
    method: "POST",
    body: JSON.stringify({ title: title || "New Chat" }),
  });
  if (!res.ok) throw new Error("Failed to create thread");
  return res.json();
}

export async function updateThread(
  id: string,
  title: string
): Promise<Thread> {
  const res = await fetchWithAuth(`${API_URL}/api/threads/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error("Failed to update thread");
  return res.json();
}

export async function deleteThread(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/threads/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete thread");
}

export async function fetchMessages(threadId: string): Promise<Message[]> {
  const res = await fetchWithAuth(`${API_URL}/api/threads/${threadId}/messages`);
  if (!res.ok) throw new Error("Failed to fetch messages");
  return res.json();
}

// Skills

export interface Skill {
  id: string;
  name: string;
  description: string;
  instructions: string;
  enabled: boolean;
  license: string | null;
  metadata: Record<string, unknown> | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSkillPayload {
  name: string;
  description: string;
  instructions: string;
  enabled?: boolean;
}

export interface UpdateSkillPayload {
  name?: string;
  description?: string;
  instructions?: string;
  enabled?: boolean;
}

export async function fetchSkills(): Promise<Skill[]> {
  const res = await fetchWithAuth(`${API_URL}/api/skills`);
  if (!res.ok) throw new Error("Failed to fetch skills");
  return res.json();
}

export async function createSkill(payload: CreateSkillPayload): Promise<Skill> {
  const res = await fetchWithAuth(`${API_URL}/api/skills`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create skill");
  return res.json();
}

export async function updateSkill(
  id: string,
  payload: UpdateSkillPayload
): Promise<Skill> {
  const res = await fetchWithAuth(`${API_URL}/api/skills/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update skill");
  return res.json();
}

export async function deleteSkill(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/skills/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete skill");
}

export async function toggleSkillShare(id: string): Promise<Skill> {
  const res = await fetchWithAuth(`${API_URL}/api/skills/${id}/share`, {
    method: "PATCH",
  });
  if (!res.ok) throw new Error("Failed to toggle skill sharing");
  return res.json();
}

export async function streamChat(
  message: string,
  threadId?: string,
  onEvent?: (event: { type: string; data: string }) => void
): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/chat`, {
    method: "POST",
    body: JSON.stringify({ message, thread_id: threadId }),
  }, 120000);

  if (!res.ok) throw new Error("Failed to start chat");
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
        continue;
      }
      if (line.startsWith("data: ")) {
        const rawData = line.slice(6);
        try {
          const parsed = JSON.parse(rawData);
          onEvent?.({ type: currentEvent || "unknown", data: parsed.content ?? "", ...parsed });
        } catch {
          onEvent?.({ type: currentEvent || "text_delta", data: rawData });
        }
        currentEvent = "";
      }
    }
  }
}
