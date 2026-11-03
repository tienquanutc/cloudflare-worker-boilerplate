import { createScheduledController } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { AdminStats, AppInfo } from "../src/shared/types";
import { KV_LAST_CRON } from "../src/worker/env";
import worker from "../src/worker/index";
import { call } from "./helpers";

describe("chung", () => {
  it("GET /api/health", async () => {
    expect(await (await call("GET", "/api/health")).json()).toEqual({ status: "ok" });
  });

  it("GET /api/info trả vars", async () => {
    const info: AppInfo = await (await call("GET", "/api/info")).json();
    expect(info.app).toBe("Cloudflare Worker Boilerplate");
    expect(typeof info.env).toBe("string");
  });

  it("đường dẫn API lạ trả 404", async () => {
    expect((await call("GET", "/api/khong-co")).status).toBe(404);
  });
});

describe("rate limiting", () => {
  it("quá 60 request ghi / phút từ một IP → 429", async () => {
    const ip = "203.0.113.7";
    const statuses: number[] = [];
    for (let i = 0; i < 61; i++) {
      statuses.push((await call("PUT", `/api/kv/rl-${i}`, { value: "x" }, { ip })).status);
    }
    expect(statuses.slice(0, 60).every((s) => s === 200)).toBe(true);
    expect(statuses[60]).toBe(429);
    // GET không bị giới hạn
    expect((await call("GET", "/api/health", undefined, { ip })).status).toBe(200);
  });
});

describe("/api/admin (secret)", () => {
  it("thiếu hoặc sai token → 401", async () => {
    const missing = await call("GET", "/api/admin/stats");
    expect(missing.status).toBe(401);
    expect(await missing.json()).toEqual({ error: "unauthorized" });
    const res = await call("GET", "/api/admin/stats", undefined, { headers: { Authorization: "Bearer sai" } });
    expect(res.status).toBe(401);
  });

  it("đúng token → số liệu", async () => {
    const res = await call("GET", "/api/admin/stats", undefined, {
      headers: { Authorization: `Bearer ${env.ADMIN_TOKEN}` },
    });
    expect(res.status).toBe(200);
    const stats: AdminStats = await res.json();
    expect(stats).toHaveProperty("todos");
    expect(stats).toHaveProperty("files");
  });
});

describe("cron (scheduled)", () => {
  it("*/30 * * * * ghi thời điểm chạy vào KV", async () => {
    const scheduledTime = Date.UTC(2026, 10, 3, 1, 30);
    const controller = createScheduledController({ cron: "*/30 * * * *", scheduledTime });
    await worker.scheduled(controller, env);
    expect(await env.KV.get(KV_LAST_CRON)).toBe(new Date(scheduledTime).toISOString());
  });

  it("0 17 * * * xoá job cũ hơn 7 ngày (trừ job còn queued)", async () => {
    await env.DB.prepare(
      `INSERT INTO jobs (id, kind, payload, status, created_at) VALUES
        ('old-done', 'echo', '', 'done', '2020-01-01T00:00:00.000Z'),
        ('old-queued', 'echo', '', 'queued', '2020-01-01T00:00:00.000Z'),
        ('new-done', 'echo', '', 'done', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`,
    ).run();
    await worker.scheduled(createScheduledController({ cron: "0 17 * * *" }), env);

    const { results } = await env.DB.prepare(
      "SELECT id FROM jobs WHERE id IN ('old-done', 'old-queued', 'new-done') ORDER BY id",
    ).all<{ id: string }>();
    expect(results.map((r) => r.id)).toEqual(["new-done", "old-queued"]);
  });
});
