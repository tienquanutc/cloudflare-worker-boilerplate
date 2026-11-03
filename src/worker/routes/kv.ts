import { Hono } from "hono";
import type { KvEntry } from "../../shared/types";
import type { AppEnv } from "../env";
import { badRequest, notFound, readJson, validName } from "../lib/http";

/** KV /api/kv — ghi chú dạng key → value, có thể tự hết hạn (TTL). */
export const kv = new Hono<AppEnv>();

// Mọi key của trang này có tiền tố "note:" để không lẫn với key hệ thống.
const PREFIX = "note:";
const MAX_VALUE = 10_000;

// GET /api/kv — danh sách key (KV.list chỉ trả key + metadata, không trả value)
kv.get("/", async (c) => {
  const { keys } = await c.env.KV.list({ prefix: PREFIX });
  const entries: KvEntry[] = keys.map((k) => ({ key: k.name.slice(PREFIX.length), expiration: k.expiration ?? null }));
  return c.json(entries);
});

// GET /api/kv/:key — đọc value
kv.get("/:key", async (c) => {
  const key = validName(c.req.param("key"));
  const value = key && (await c.env.KV.get(PREFIX + key));
  return value == null || value === "" ? notFound(c) : c.json({ key, value });
});

// PUT /api/kv/:key  {"value": "...", "ttl"?: 60} — ghi (tạo hoặc thay thế)
kv.put("/:key", async (c) => {
  const key = validName(c.req.param("key"));
  if (!key) return badRequest(c, "invalid_key");
  const body = await readJson(c);
  const value = body?.value;
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_VALUE) return badRequest(c, "invalid_value");
  const ttl = body?.ttl;
  // KV yêu cầu TTL tối thiểu 60 giây.
  if (ttl !== undefined && (typeof ttl !== "number" || !Number.isInteger(ttl) || ttl < 60)) {
    return badRequest(c, "invalid_ttl");
  }

  await c.env.KV.put(PREFIX + key, value, ttl ? { expirationTtl: ttl } : undefined);
  return c.json({ key, value });
});

// DELETE /api/kv/:key — xoá
kv.delete("/:key", async (c) => {
  const key = validName(c.req.param("key"));
  if (!key) return notFound(c);
  await c.env.KV.delete(PREFIX + key);
  return c.body(null, 204);
});
