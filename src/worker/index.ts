/**
 * Worker (Hono): chỉ xử lý /api/*. Mọi đường dẫn khác trả về app React
 * (đã build vào static assets, xem "assets" trong wrangler.jsonc).
 */
import { Hono } from "hono";
import type { AppEnv } from "./env";
import { todos } from "./todos";

const app = new Hono<AppEnv>();

app.get("/api/health", (c) => c.json({ status: "ok" }));
app.route("/api/todos", todos);

app.notFound((c) => c.json({ error: "not_found" }, 404));
app.onError((error, c) => {
  console.error(error);
  return c.json({ error: "internal_error" }, 500);
});

export default app;
