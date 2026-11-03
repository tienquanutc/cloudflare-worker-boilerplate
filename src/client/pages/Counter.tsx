import { useEffect, useRef, useState } from "react";
import type { CounterState } from "../../shared/types";
import { api } from "../api";
import { ErrorText, useAction } from "../use-action";

export function CounterPage() {
  const [name, setName] = useState("demo");
  const [state, setState] = useState<CounterState>();
  const [live, setLive] = useState(false);
  const socket = useRef<WebSocket>(null);
  const { error, run } = useAction();

  // Mở WebSocket tới Durable Object; object gửi giá trị mới mỗi khi có ai thay đổi.
  useEffect(() => {
    if (!/^[\w.-]{1,100}$/.test(name)) return;
    run(async () => setState(await api.counters.get(name)));

    const ws = new WebSocket(api.counters.socketUrl(name));
    socket.current = ws;
    ws.onopen = () => setLive(true);
    ws.onclose = () => setLive(false);
    ws.onmessage = (event) => setState(JSON.parse(event.data as string) as CounterState);
    return () => ws.close();
  }, [name, run]);

  /** Gửi qua WebSocket nếu đang mở, không thì gọi API HTTP. */
  function send(command: "+1" | "-1" | "reset") {
    if (socket.current?.readyState === WebSocket.OPEN) return socket.current.send(command);
    run(async () =>
      setState(command === "reset" ? await api.counters.reset(name) : await api.counters.increment(name, command === "+1" ? 1 : -1)),
    );
  }

  return (
    <>
      <h1>Durable Objects</h1>
      <p className="muted">
        Mỗi tên counter là <strong>một object duy nhất</strong> trên toàn cầu, giữ trạng thái trong SQLite riêng. Mở
        trang này ở 2 tab rồi bấm: tab kia cập nhật ngay qua WebSocket.
      </p>

      <div className="row">
        <label className="grow">
          Tên counter{" "}
          <input value={name} onChange={(e) => setName(e.target.value.trim())} placeholder="demo" />
        </label>
        <span className={`badge ${live ? "done" : "failed"}`}>{live ? "WebSocket đã kết nối" : "chưa kết nối"}</span>
      </div>

      <p className="big">{state?.value ?? "…"}</p>
      <div className="row center">
        <button type="button" onClick={() => send("-1")}>
          −1
        </button>
        <button type="button" onClick={() => send("+1")}>
          +1
        </button>
        <button type="button" onClick={() => send("reset")}>
          Về 0
        </button>
      </div>
      <p className="muted center">{state ? `${state.connections} kết nối đang mở tới counter "${state.name}"` : ""}</p>

      <ErrorText error={error} />
    </>
  );
}
