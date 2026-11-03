import type {
  AdminStats,
  AppInfo,
  CounterState,
  CreateTodo,
  Job,
  JobKind,
  KvEntry,
  ReportStatus,
  StoredFile,
  Todo,
  UpdateTodo,
} from "../shared/types";

/** Gọi API của Worker; lỗi HTTP ném ra Error kèm mã lỗi trong body. */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (typeof init.body === "string") headers.set("Content-Type", "application/json");
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

const json = (method: string, data?: unknown): RequestInit => ({
  method,
  body: data === undefined ? undefined : JSON.stringify(data),
});

export const api = {
  info: () => request<AppInfo>("/api/info"),

  todos: {
    list: () => request<Todo[]>("/api/todos"),
    create: (data: CreateTodo) => request<Todo>("/api/todos", json("POST", data)),
    update: (id: number, data: UpdateTodo) => request<Todo>(`/api/todos/${id}`, json("PATCH", data)),
    remove: (id: number) => request<void>(`/api/todos/${id}`, { method: "DELETE" }),
  },

  kv: {
    list: () => request<KvEntry[]>("/api/kv"),
    get: (key: string) => request<{ key: string; value: string }>(`/api/kv/${encodeURIComponent(key)}`),
    put: (key: string, value: string, ttl?: number) =>
      request<{ key: string; value: string }>(`/api/kv/${encodeURIComponent(key)}`, json("PUT", { value, ttl })),
    remove: (key: string) => request<void>(`/api/kv/${encodeURIComponent(key)}`, { method: "DELETE" }),
  },

  files: {
    list: () => request<StoredFile[]>("/api/files"),
    upload: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return request<StoredFile>("/api/files", { method: "POST", body: form });
    },
    url: (name: string) => `/api/files/${encodeURIComponent(name)}`,
    remove: (name: string) => request<void>(`/api/files/${encodeURIComponent(name)}`, { method: "DELETE" }),
  },

  jobs: {
    list: () => request<Job[]>("/api/jobs"),
    create: (kind: JobKind, payload: string) => request<Job>("/api/jobs", json("POST", { kind, payload })),
  },

  reports: {
    start: (note: string) => request<{ id: string }>("/api/reports", json("POST", { note })),
    status: (id: string) => request<ReportStatus>(`/api/reports/${id}`),
    downloadUrl: (id: string) => `/api/reports/${id}/download`,
  },

  counters: {
    get: (name: string) => request<CounterState>(`/api/counters/${name}`),
    increment: (name: string, by: number) => request<CounterState>(`/api/counters/${name}/increment`, json("POST", { by })),
    reset: (name: string) => request<CounterState>(`/api/counters/${name}`, { method: "DELETE" }),
    socketUrl: (name: string) => `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/counters/${name}/ws`,
  },

  admin: {
    stats: (token: string) =>
      request<AdminStats>("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } }),
  },
};
