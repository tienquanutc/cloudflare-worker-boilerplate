import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { CounterState } from "../src/shared/types";
import { call } from "./helpers";

describe("/api/counters (Durable Objects)", () => {
  it("cộng dồn, đọc, về 0", async () => {
    expect(await (await call("GET", "/api/counters/a")).json()).toMatchObject({ name: "a", value: 0 });
    await call("POST", "/api/counters/a/increment", {});
    const state: CounterState = await (await call("POST", "/api/counters/a/increment", { by: 5 })).json();
    expect(state.value).toBe(6);
    expect(((await (await call("DELETE", "/api/counters/a")).json()) as CounterState).value).toBe(0);
  });

  it("mỗi tên là một object riêng", async () => {
    await call("POST", "/api/counters/x/increment", { by: 2 });
    expect(((await (await call("GET", "/api/counters/y")).json()) as CounterState).value).toBe(0);
  });

  it("gọi RPC trực tiếp qua binding", async () => {
    const stub = env.COUNTER.getByName("rpc");
    await stub.increment(3);
    expect((await stub.getState()).value).toBe(3);
  });

  it("WebSocket nhận giá trị mới khi tăng", async () => {
    const res = await call("GET", "/api/counters/ws/ws", undefined, { headers: { Upgrade: "websocket" } });
    expect(res.status).toBe(101);
    const ws = res.webSocket!;
    ws.accept();
    const messages: CounterState[] = [];
    const got = new Promise<void>((resolve) => {
      ws.addEventListener("message", (event) => {
        messages.push(JSON.parse(event.data as string));
        if (messages.some((m) => m.value === 1)) resolve();
      });
    });
    ws.send("+1");
    await got;
    expect(messages.at(-1)).toMatchObject({ name: "ws", value: 1, connections: 1 });
    ws.close();
  });

  it("từ chối tên sai và by sai, yêu cầu header Upgrade cho /ws", async () => {
    expect((await call("GET", "/api/counters/c%C3%B3%20d%E1%BA%A5u")).status).toBe(400);
    expect((await call("POST", "/api/counters/a/increment", { by: "x" })).status).toBe(400);
    expect((await call("GET", "/api/counters/a/ws")).status).toBe(426);
  });
});
