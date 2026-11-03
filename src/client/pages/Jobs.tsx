import { useEffect, useState } from "react";
import type { Job, JobKind } from "../../shared/types";
import { api } from "../api";
import { ErrorText, useAction } from "../use-action";

const KINDS: { kind: JobKind; label: string }[] = [
  { kind: "echo", label: "echo — xử lý ngay" },
  { kind: "slow", label: "slow — mất 3 giây" },
  { kind: "fail", label: "fail — luôn lỗi, retry rồi vào DLQ" },
];

export function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [payload, setPayload] = useState("Xin chào Queue");
  const { error, run } = useAction();

  // Tự tải lại mỗi 2 giây để thấy job đổi trạng thái khi consumer xử lý xong.
  useEffect(() => {
    const load = () => run(async () => setJobs(await api.jobs.list()));
    load();
    const timer = setInterval(load, 2000);
    return () => clearInterval(timer);
  }, [run]);

  function send(kind: JobKind) {
    run(async () => {
      const job = await api.jobs.create(kind, payload);
      setJobs((list) => [job, ...list]);
    });
  }

  return (
    <>
      <h1>Queues</h1>
      <p className="muted">
        API chỉ gửi job vào hàng đợi rồi trả về ngay (202). Consumer <code>queue()</code> xử lý nền theo lô; lỗi thì
        retry 2 lần, sau đó message sang dead letter queue.
      </p>

      <div className="row">
        <input value={payload} onChange={(e) => setPayload(e.target.value)} placeholder="payload" />
      </div>
      <div className="row">
        {KINDS.map((k) => (
          <button key={k.kind} type="button" onClick={() => send(k.kind)}>
            {k.label}
          </button>
        ))}
      </div>

      <ErrorText error={error} />

      <table>
        <thead>
          <tr>
            <th>Loại</th>
            <th>Trạng thái</th>
            <th>Lần</th>
            <th>Kết quả</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td>
                <code>{job.kind}</code>
              </td>
              <td>
                <span className={`badge ${job.status}`}>{job.status}</span>
              </td>
              <td>{job.attempts}</td>
              <td className="muted">{job.result ?? "…"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {jobs.length === 0 && <p className="muted">Chưa có job nào.</p>}
    </>
  );
}
