import { Hono } from "hono";
import type { ReportOutput, ReportStatus } from "../../shared/types";
import type { AppEnv } from "../env";
import { notFound, readJson } from "../lib/http";

/** Workflow /api/reports — chạy ReportWorkflow (src/worker/workflows/report.ts) và xem tiến độ. */
export const reports = new Hono<AppEnv>();

// POST /api/reports  {"note"?: "..."} — bắt đầu một lần chạy, trả id để theo dõi
reports.post("/", async (c) => {
  const body = await readJson(c);
  const note = typeof body?.note === "string" ? body.note.slice(0, 200) : "";
  const instance = await c.env.REPORT_WORKFLOW.create({ params: { note } });
  return c.json({ id: instance.id }, 202);
});

// GET /api/reports/:id — trạng thái: queued | running | waiting | complete | errored …
reports.get("/:id", async (c) => {
  const id = c.req.param("id");
  const instance = await c.env.REPORT_WORKFLOW.get(id).catch(() => undefined);
  if (!instance) return notFound(c);

  const status = await instance.status();
  const result: ReportStatus = {
    id,
    status: status.status,
    output: (status.output as ReportOutput | undefined) ?? null,
    error: status.error?.message ?? null,
  };
  return c.json(result);
});

// GET /api/reports/:id/download — file JSON Workflow đã ghi vào R2
reports.get("/:id/download", async (c) => {
  const object = await c.env.BUCKET.get(`reports/${c.req.param("id")}.json`);
  if (!object) return notFound(c);
  return new Response(object.body, { headers: { "Content-Type": "application/json; charset=utf-8" } });
});
