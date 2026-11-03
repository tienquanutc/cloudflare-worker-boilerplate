import { Hono } from "hono";
import type { Job, JobKind } from "../../shared/types";
import type { AppEnv } from "../env";
import { badRequest, notFound, readJson } from "../lib/http";

/** Queue /api/jobs — gửi job vào Queue; consumer (src/worker/queue.ts) xử lý sau. */
export const jobs = new Hono<AppEnv>();

export type JobRow = {
  id: string;
  kind: JobKind;
  payload: string;
  status: Job["status"];
  attempts: number;
  result: string | null;
  created_at: string;
  updated_at: string;
};

const KINDS: JobKind[] = ["echo", "slow", "fail"];

// GET /api/jobs — 50 job mới nhất
jobs.get("/", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM jobs ORDER BY created_at DESC LIMIT 50").all<JobRow>();
  return c.json(results.map(toJob));
});

// GET /api/jobs/:id
jobs.get("/:id", async (c) => {
  const row = await c.env.DB.prepare("SELECT * FROM jobs WHERE id = ?").bind(c.req.param("id")).first<JobRow>();
  return row ? c.json(toJob(row)) : notFound(c);
});

// POST /api/jobs  {"kind": "echo" | "slow" | "fail", "payload": "..."}
//   echo: xử lý ngay · slow: mất 3 giây · fail: luôn lỗi → retry → chuyển sang dead letter queue
jobs.post("/", async (c) => {
  const body = await readJson(c);
  const kind = body?.kind as JobKind;
  if (!KINDS.includes(kind)) return badRequest(c, "invalid_kind");
  const payload = typeof body?.payload === "string" ? body.payload.slice(0, 500) : "";

  const id = crypto.randomUUID();
  // Ghi vào D1 trước để trang Job thấy ngay trạng thái "queued", rồi mới gửi vào Queue.
  const row = await c.env.DB.prepare("INSERT INTO jobs (id, kind, payload) VALUES (?, ?, ?) RETURNING *")
    .bind(id, kind, payload)
    .first<JobRow>();
  await c.env.JOBS.send({ id, kind, payload });
  return c.json(toJob(row!), 202);
});

export function toJob(row: JobRow): Job {
  return {
    id: row.id,
    kind: row.kind,
    payload: row.payload,
    status: row.status,
    attempts: row.attempts,
    result: row.result,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
