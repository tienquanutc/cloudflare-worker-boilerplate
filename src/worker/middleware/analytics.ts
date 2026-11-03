import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../env";

/**
 * Ghi một data point vào Analytics Engine cho mỗi request /api/*:
 * blobs = [method, đường dẫn, quốc gia], doubles = [status, thời gian xử lý ms].
 * Query trên Cloudflare bằng SQL API, ví dụ:
 *   SELECT blob2 AS path, count() FROM cloudflare_worker_boilerplate_requests GROUP BY path
 */
export const analytics = createMiddleware<AppEnv>(async (c, next) => {
  const start = Date.now();
  await next();
  c.env.ANALYTICS.writeDataPoint({
    indexes: [c.req.method],
    blobs: [c.req.method, c.req.path, String(c.req.raw.cf?.country ?? "")],
    doubles: [c.res.status, Date.now() - start],
  });
});
