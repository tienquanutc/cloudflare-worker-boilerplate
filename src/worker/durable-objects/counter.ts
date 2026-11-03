import { DurableObject } from "cloudflare:workers";
import type { CounterState } from "../../shared/types";
import type { Env } from "../env";

/**
 * Durable Object Counter: mỗi tên counter là MỘT object duy nhất trên toàn cầu,
 * nên mọi request cộng dồn đúng thứ tự, không bị ghi đè lẫn nhau.
 *
 * - Lưu trạng thái trong SQLite riêng của object (`ctx.storage.kv`), còn nguyên sau khi object ngủ.
 * - Method public (getState, increment, reset) gọi được qua RPC: `env.COUNTER.getByName(name).increment(1)`.
 * - WebSocket dùng Hibernation API: object được "ngủ" khi không có message, không tốn tiền chờ.
 */
export class Counter extends DurableObject<Env> {
  getState(): CounterState {
    return {
      name: this.ctx.id.name ?? "",
      value: this.ctx.storage.kv.get<number>("value") ?? 0,
      connections: this.ctx.getWebSockets().length,
    };
  }

  increment(by = 1): CounterState {
    const value = (this.ctx.storage.kv.get<number>("value") ?? 0) + by;
    this.ctx.storage.kv.put("value", value);
    return this.broadcast();
  }

  reset(): CounterState {
    this.ctx.storage.kv.put("value", 0);
    return this.broadcast();
  }

  /** Chỉ dùng cho WebSocket upgrade (route /api/counters/:name/ws). */
  override async fetch(): Promise<Response> {
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server!);
    this.broadcast();
    return new Response(null, { status: 101, webSocket: client });
  }

  /** Client gửi "+1" / "-1" / "reset" qua WebSocket. */
  override async webSocketMessage(_ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (message === "+1") this.increment(1);
    else if (message === "-1") this.increment(-1);
    else if (message === "reset") this.reset();
  }

  override async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    // 1005 / 1006 (không có mã, mất kết nối) là mã dành riêng, không được gửi lại → dùng 1000.
    ws.close(code === 1005 || code === 1006 ? 1000 : code, "bye");
    this.broadcast(ws);
  }

  /** Gửi trạng thái mới cho mọi WebSocket đang mở (trừ `closing`). */
  private broadcast(closing?: WebSocket): CounterState {
    const sockets = this.ctx.getWebSockets().filter((ws) => ws !== closing);
    const state = { ...this.getState(), connections: sockets.length };
    const message = JSON.stringify(state);
    for (const ws of sockets) ws.send(message);
    return state;
  }
}
