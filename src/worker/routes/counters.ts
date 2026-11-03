import { Hono, type Context } from "hono";
import type { AppEnv } from "../env";
import { badRequest, readJson, validName } from "../lib/http";

/** Durable Object /api/counters/:name — mỗi tên là một object Counter riêng trên toàn cầu. */
export const counters = new Hono<AppEnv>();

/** Stub tới object Counter theo tên (cùng tên → luôn cùng một object). */
function counter(c: Context<AppEnv>) {
  const name = validName(c.req.param("name"));
  return name ? c.env.COUNTER.getByName(name) : undefined;
}

// GET /api/counters/:name
counters.get("/:name", async (c) => {
  const stub = counter(c);
  return stub ? c.json(await stub.getState()) : badRequest(c, "invalid_name");
});

// POST /api/counters/:name/increment  {"by"?: 1}
counters.post("/:name/increment", async (c) => {
  const stub = counter(c);
  if (!stub) return badRequest(c, "invalid_name");
  const by = (await readJson(c))?.by ?? 1;
  if (typeof by !== "number" || !Number.isInteger(by) || Math.abs(by) > 1000) return badRequest(c, "invalid_by");
  return c.json(await stub.increment(by));
});

// DELETE /api/counters/:name — về 0
counters.delete("/:name", async (c) => {
  const stub = counter(c);
  return stub ? c.json(await stub.reset()) : badRequest(c, "invalid_name");
});

// GET /api/counters/:name/ws — WebSocket: nhận giá trị mới mỗi khi có ai bấm
counters.get("/:name/ws", async (c) => {
  if (c.req.header("Upgrade") !== "websocket") return c.json({ error: "websocket_required" }, 426);
  const stub = counter(c);
  return stub ? stub.fetch(c.req.raw) : badRequest(c, "invalid_name");
});
