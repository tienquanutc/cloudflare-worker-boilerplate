/**
 * Entry của Worker. Một Worker có thể có nhiều "handler":
 *   fetch     — request HTTP (Hono, chỉ /api/*; còn lại là app React trong static assets)
 *   queue     — consumer của Queues                         (src/worker/queue.ts)
 *   scheduled — Cron Triggers                               (src/worker/scheduled.ts)
 * và export các class mà wrangler.jsonc tham chiếu:
 *   Counter        — Durable Object                         (src/worker/durable-objects/counter.ts)
 *   ReportWorkflow — Workflow                               (src/worker/workflows/report.ts)
 */
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import type { AppInfo, JobMessage } from "../shared/types";
import { KV_LAST_CRON, type AppEnv, type Env } from "./env";
import { analytics } from "./middleware/analytics";
import { rateLimit } from "./middleware/rate-limit";
import { queue } from "./queue";
import { admin } from "./routes/admin";
import { counters } from "./routes/counters";
import { files } from "./routes/files";
import { jobs } from "./routes/jobs";
import { kv } from "./routes/kv";
import { reports } from "./routes/reports";
import { todos } from "./routes/todos";
import { scheduled } from "./scheduled";

export { Counter } from "./durable-objects/counter";
export { ReportWorkflow } from "./workflows/report";

const app = new Hono<AppEnv>();

/** Mã lỗi JSON cho HTTPException của middleware Hono (bearerAuth không kèm message). */
const HTTP_ERRORS: Record<number, string> = { 400: "bad_request", 401: "unauthorized", 403: "forbidden" };

app.use("/api/*", logger(), analytics, rateLimit);

app.get("/api/health", (c) => c.json({ status: "ok" }));

// GET /api/info — vars + version_metadata + lần chạy cron gần nhất
app.get("/api/info", async (c) => {
  const { id, tag, timestamp } = c.env.VERSION;
  const info: AppInfo = {
    app: c.env.APP_NAME,
    env: c.env.APP_ENV,
    version: id ? { id, tag, timestamp } : null,
    lastCron: await c.env.KV.get(KV_LAST_CRON),
  };
  return c.json(info);
});

app.route("/api/todos", todos); //       D1
app.route("/api/kv", kv); //             KV
app.route("/api/files", files); //       R2
app.route("/api/jobs", jobs); //         Queues
app.route("/api/reports", reports); //   Workflows
app.route("/api/counters", counters); // Durable Objects
app.route("/api/admin", admin); //       secret

app.notFound((c) => c.json({ error: "not_found" }, 404));
app.onError((error, c) => {
  // Lỗi HTTP có chủ đích (ví dụ bearerAuth ném 401): giữ status, trả JSON như mọi lỗi khác.
  if (error instanceof HTTPException) {
    const code = HTTP_ERRORS[error.status] ?? (error.message.toLowerCase().replace(/\W+/g, "_") || "http_error");
    return c.json({ error: code }, error.status);
  }
  console.error(error);
  return c.json({ error: "internal_error" }, 500);
});

export { app };

export default {
  fetch: app.fetch,
  queue,
  scheduled,
} satisfies ExportedHandler<Env, JobMessage>;
