import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getAuthHeaders() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token || ""}`,
  };
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
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/threads`, { headers });
  if (!res.ok) throw new Error("Failed to fetch threads");
  return res.json();
}

export async function createThread(title?: string): Promise<Thread> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/threads`, {
    method: "POST",
    headers,
    body: JSON.stringify({ title: title || "New Chat" }),
  });
  if (!res.ok) throw new Error("Failed to create thread");
  return res.json();
}

export async function updateThread(
  id: string,
  title: string
): Promise<Thread> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/threads/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error("Failed to update thread");
  return res.json();
}

export async function deleteThread(id: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/threads/${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error("Failed to delete thread");
}

export async function fetchMessages(threadId: string): Promise<Message[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/threads/${threadId}/messages`, {
    headers,
  });
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
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/skills`, { headers });
  if (!res.ok) throw new Error("Failed to fetch skills");
  return res.json();
}

export async function createSkill(payload: CreateSkillPayload): Promise<Skill> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/skills`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create skill");
  return res.json();
}

export async function updateSkill(
  id: string,
  payload: UpdateSkillPayload
): Promise<Skill> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/skills/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update skill");
  return res.json();
}

export async function deleteSkill(id: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/skills/${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error("Failed to delete skill");
}

export async function toggleSkillShare(id: string): Promise<Skill> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/skills/${id}/share`, {
    method: "PATCH",
    headers,
  });
  if (!res.ok) throw new Error("Failed to toggle skill sharing");
  return res.json();
}

export async function streamChat(
  message: string,
  threadId?: string,
  onEvent?: (event: { type: string; data: string }) => void
): Promise<void> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token || ""}`,
    },
    body: JSON.stringify({ message, thread_id: threadId }),
  });

  if (!res.ok) throw new Error("Failed to start chat");
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        continue;
      }
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        try {
          const parsed = JSON.parse(data);
          onEvent?.(parsed);
        } catch {
          onEvent?.({ type: "text_delta", data });
        }
      }
    }
  }
}
