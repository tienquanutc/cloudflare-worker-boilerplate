import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { AppInfo } from "../../shared/types";
import { api } from "../api";
import { ErrorText, useAction } from "../use-action";

const FEATURES = [
  { to: "/todos", name: "D1", text: "Database SQL (SQLite) — CRUD todo, migrations" },
  { to: "/kv", name: "KV", text: "Key-value toàn cầu — ghi chú có TTL tự hết hạn" },
  { to: "/files", name: "R2", text: "Lưu file — upload, tải về, xoá" },
  { to: "/jobs", name: "Queues", text: "Việc chạy nền — retry, dead letter queue" },
  { to: "/reports", name: "Workflows", text: "Quy trình nhiều bước, tự retry, có sleep" },
  { to: "/counter", name: "Durable Objects", text: "Object có trạng thái + WebSocket realtime" },
  { to: "/admin", name: "Secret", text: "API cần token (ADMIN_TOKEN là secret)" },
];

export function HomePage() {
  const [info, setInfo] = useState<AppInfo>();
  const { error, run } = useAction();

  useEffect(() => {
    run(async () => setInfo(await api.info()));
  }, [run]);

  return (
    <>
      <h1>{info?.app ?? "Cloudflare Worker Boilerplate"}</h1>
      <ErrorText error={error} />
      {info && (
        <dl className="info">
          <dt>Môi trường</dt>
          <dd>
            <code>{info.env}</code> (biến <code>APP_ENV</code>)
          </dd>
          <dt>Version</dt>
          <dd>{info.version ? <code>{info.version.id.slice(0, 8)}</code> : "chạy local"}</dd>
          <dt>Cron gần nhất</dt>
          <dd>{info.lastCron ? new Date(info.lastCron).toLocaleString("vi-VN") : "chưa chạy"}</dd>
        </dl>
      )}

      <h2>Tính năng</h2>
      <ul className="cards">
        {FEATURES.map((f) => (
          <li key={f.to}>
            <Link to={f.to}>
              <strong>{f.name}</strong>
              <span>{f.text}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="muted">
        Ngoài ra: Cron Triggers, Rate limiting (60 request ghi / phút / IP), Analytics Engine, version metadata — xem
        README.
      </p>
    </>
  );
}
