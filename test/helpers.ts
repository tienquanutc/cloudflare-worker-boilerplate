import { env } from "cloudflare:workers";
import { app } from "../src/worker/index";

/**
 * Gọi Worker bằng app.request() của Hono, với binding của test (D1, KV, R2… chạy local trong workerd).
 * Mỗi lần gọi dùng một IP ngẫu nhiên để rate limiter không chặn test (trừ khi truyền `ip`).
 */
export async function call(
  method: string,
  path: string,
  body?: unknown,
  options: { ip?: string; headers?: Record<string, string> } = {},
): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set("CF-Connecting-IP", options.ip ?? `test-${crypto.randomUUID()}`);
  const init: RequestInit = { method, headers };
  if (body instanceof FormData) {
    init.body = body;
  } else if (body !== undefined) {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
    headers.set("Content-Type", "application/json");
  }
  return app.request(path, init, env);
}
