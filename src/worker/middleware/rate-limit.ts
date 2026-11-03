import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../env";

/**
 * Giới hạn số request ghi (POST/PUT/PATCH/DELETE) theo IP, dùng binding RATE_LIMITER
 * ("ratelimits" trong wrangler.jsonc: 60 request / 60 giây). Vượt → 429.
 */
export const rateLimit = createMiddleware<AppEnv>(async (c, next) => {
  if (c.req.method === "GET" || c.req.method === "HEAD") return next();

  const key = c.req.header("CF-Connecting-IP") ?? "anonymous";
  const { success } = await c.env.RATE_LIMITER.limit({ key });
  if (!success) return c.json({ error: "rate_limited" }, 429, { "Retry-After": "60" });
  return next();
});
