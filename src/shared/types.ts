// Kiểu dữ liệu API trả về, dùng chung cho Worker và React.

export type { CreateTodo, Todo, UpdateTodo } from "./todo";

/** GET /api/info */
export type AppInfo = {
  app: string;
  env: string;
  version: { id: string; tag: string; timestamp: string } | null;
  lastCron: string | null;
};

/** KV: GET /api/kv */
export type KvEntry = { key: string; expiration: number | null };

/** R2: GET /api/files */
export type StoredFile = { name: string; size: number; contentType: string | null; uploaded: string };

/** Queue: một job và trạng thái xử lý. */
export type JobKind = "echo" | "slow" | "fail";
export type Job = {
  id: string;
  kind: JobKind;
  payload: string;
  status: "queued" | "done" | "failed";
  attempts: number;
  result: string | null;
  createdAt: string;
  updatedAt: string;
};
/** Message gửi vào Queue. */
export type JobMessage = { id: string; kind: JobKind; payload: string };

/** Workflow: tham số, kết quả và trạng thái một lần chạy báo cáo. */
export type ReportParams = { note: string };
export type ReportOutput = { key: string; todos: number; doneTodos: number; files: number; jobs: number };
export type ReportStatus = {
  id: string;
  status: string;
  output: ReportOutput | null;
  error: string | null;
};

/** Durable Object: giá trị counter, cũng là message WebSocket gửi về client. */
export type CounterState = { name: string; value: number; connections: number };

/** GET /api/admin/stats */
export type AdminStats = { todos: number; jobs: number; kvKeys: number; files: number; lastCron: string | null };
