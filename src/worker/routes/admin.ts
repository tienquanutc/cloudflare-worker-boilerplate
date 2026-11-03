import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import type { AdminStats } from "../../shared/types";
import { KV_LAST_CRON, type AppEnv } from "../env";

/** /api/admin — cần header "Authorization: Bearer <ADMIN_TOKEN>" (ADMIN_TOKEN là secret). */
export const admin = new Hono<AppEnv>();

admin.use(
  bearerAuth<AppEnv>({
    // Chưa đặt secret → từ chối mọi token, không bao giờ cho qua.
    verifyToken: (token, c) => Boolean(c.env.ADMIN_TOKEN) && token === c.env.ADMIN_TOKEN,
  }),
);

// GET /api/admin/stats — số liệu từ mọi kho dữ liệu
admin.get("/stats", async (c) => {
  const [todos, jobs, kvKeys, files, lastCron] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) AS n FROM todos").first<number>("n"),
    c.env.DB.prepare("SELECT COUNT(*) AS n FROM jobs").first<number>("n"),
    c.env.KV.list({ prefix: "note:" }).then((r) => r.keys.length),
    c.env.BUCKET.list({ prefix: "uploads/" }).then((r) => r.objects.length),
    c.env.KV.get(KV_LAST_CRON),
  ]);
  const stats: AdminStats = { todos: todos ?? 0, jobs: jobs ?? 0, kvKeys, files, lastCron };
  return c.json(stats);
});
