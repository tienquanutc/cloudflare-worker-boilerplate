import { describe, expect, it } from "vitest";
import type { KvEntry } from "../src/shared/types";
import { call } from "./helpers";

describe("/api/kv (KV)", () => {
  it("PUT ghi, GET đọc, DELETE xoá", async () => {
    expect((await call("PUT", "/api/kv/greeting", { value: "Xin chào" })).status).toBe(200);
    expect(await (await call("GET", "/api/kv/greeting")).json()).toEqual({ key: "greeting", value: "Xin chào" });

    const list: KvEntry[] = await (await call("GET", "/api/kv")).json();
    expect(list).toContainEqual({ key: "greeting", expiration: null });

    expect((await call("DELETE", "/api/kv/greeting")).status).toBe(204);
    expect((await call("GET", "/api/kv/greeting")).status).toBe(404);
  });

  it("TTL tạo key tự hết hạn", async () => {
    await call("PUT", "/api/kv/temp", { value: "tạm", ttl: 120 });
    const list: KvEntry[] = await (await call("GET", "/api/kv")).json();
    const entry = list.find((e) => e.key === "temp");
    expect(entry?.expiration).toBeGreaterThan(Date.now() / 1000);
  });

  it("từ chối key, value, TTL sai", async () => {
    expect((await call("PUT", "/api/kv/c%C3%B3%20d%E1%BA%A5u", { value: "x" })).status).toBe(400);
    expect((await call("PUT", "/api/kv/ok", { value: "" })).status).toBe(400);
    expect((await call("PUT", "/api/kv/ok", { value: "x", ttl: 10 })).status).toBe(400);
  });
});
