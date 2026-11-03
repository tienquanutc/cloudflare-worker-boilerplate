import { useEffect, useState, type FormEvent } from "react";
import type { KvEntry } from "../../shared/types";
import { api } from "../api";
import { ErrorText, useAction } from "../use-action";

export function KvPage() {
  const [entries, setEntries] = useState<KvEntry[]>([]);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [ttl, setTtl] = useState("");
  const [opened, setOpened] = useState<{ key: string; value: string }>();
  const { error, run } = useAction();

  const reload = () => run(async () => setEntries(await api.kv.list()));
  useEffect(() => {
    reload();
  }, []);

  function save(event: FormEvent) {
    event.preventDefault();
    run(async () => {
      await api.kv.put(key, value, ttl ? Number(ttl) : undefined);
      setKey("");
      setValue("");
      setTtl("");
      await reload();
    });
  }

  return (
    <>
      <h1>KV</h1>
      <p className="muted">
        Key-value lưu ở mọi data center. Đọc rất nhanh; ghi mới có thể mất tới ~60 giây mới thấy ở nơi khác.
      </p>

      <form onSubmit={save} className="stack">
        <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="key (chữ, số, . - _)" required />
        <textarea value={value} onChange={(e) => setValue(e.target.value)} placeholder="value" rows={3} required />
        <div className="row">
          <input
            value={ttl}
            onChange={(e) => setTtl(e.target.value)}
            placeholder="TTL giây (để trống = không hết hạn, tối thiểu 60)"
            inputMode="numeric"
          />
          <button type="submit">Lưu</button>
        </div>
      </form>

      <ErrorText error={error} />

      <ul>
        {entries.map((entry) => (
          <li key={entry.key}>
            <button type="button" className="link" onClick={() => run(async () => setOpened(await api.kv.get(entry.key)))}>
              {entry.key}
            </button>
            <span className="muted grow">
              {entry.expiration ? `hết hạn ${new Date(entry.expiration * 1000).toLocaleString("vi-VN")}` : ""}
            </span>
            <button type="button" onClick={() => run(async () => (await api.kv.remove(entry.key), await reload()))}>
              Xoá
            </button>
          </li>
        ))}
      </ul>
      {entries.length === 0 && <p className="muted">Chưa có key nào.</p>}

      {opened && (
        <>
          <h2>{opened.key}</h2>
          <pre>{opened.value}</pre>
        </>
      )}
    </>
  );
}
