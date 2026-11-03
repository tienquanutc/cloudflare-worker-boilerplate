import { useState, type FormEvent } from "react";
import type { AdminStats } from "../../shared/types";
import { api } from "../api";
import { ErrorText, useAction } from "../use-action";

export function AdminPage() {
  const [token, setToken] = useState("");
  const [stats, setStats] = useState<AdminStats>();
  const { error, run } = useAction();

  function load(event: FormEvent) {
    event.preventDefault();
    setStats(undefined);
    run(async () => setStats(await api.admin.stats(token)));
  }

  return (
    <>
      <h1>Admin</h1>
      <p className="muted">
        <code>/api/admin/*</code> cần header <code>Authorization: Bearer &lt;ADMIN_TOKEN&gt;</code>.{" "}
        <code>ADMIN_TOKEN</code> là secret: local lấy từ <code>.dev.vars</code> (mặc định <code>dev-admin-token</code>
        ), trên Cloudflare đặt bằng <code>wrangler secret put</code>.
      </p>

      <form onSubmit={load}>
        <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="ADMIN_TOKEN" />
        <button type="submit">Xem số liệu</button>
      </form>

      <ErrorText error={error} />

      {stats && (
        <dl className="info">
          <dt>Todo (D1)</dt>
          <dd>{stats.todos}</dd>
          <dt>Job (D1)</dt>
          <dd>{stats.jobs}</dd>
          <dt>Ghi chú (KV)</dt>
          <dd>{stats.kvKeys}</dd>
          <dt>File (R2)</dt>
          <dd>{stats.files}</dd>
          <dt>Cron gần nhất</dt>
          <dd>{stats.lastCron ? new Date(stats.lastCron).toLocaleString("vi-VN") : "chưa chạy"}</dd>
        </dl>
      )}
    </>
  );
}
