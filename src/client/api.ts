import type { CreateTodo, Todo, UpdateTodo } from "../shared/todo";

/** Gọi API của Worker; lỗi HTTP ném ra Error kèm mã lỗi trong body. */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export const api = {
  list: () => request<Todo[]>("/api/todos"),
  create: (data: CreateTodo) => request<Todo>("/api/todos", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: UpdateTodo) =>
    request<Todo>(`/api/todos/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  remove: (id: number) => request<void>(`/api/todos/${id}`, { method: "DELETE" }),
};
