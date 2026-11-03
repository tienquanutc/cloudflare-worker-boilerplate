import { useEffect, useState, type FormEvent } from "react";
import type { ReportStatus } from "../../shared/types";
import { api } from "../api";
import { ErrorText, useAction } from "../use-action";

const DONE = ["complete", "errored", "terminated"];

export function ReportsPage() {
  const [note, setNote] = useState("Báo cáo thử");
  const [report, setReport] = useState<ReportStatus>();
  const { error, run } = useAction();

  // Hỏi trạng thái mỗi giây cho tới khi Workflow kết thúc.
  useEffect(() => {
    if (!report || DONE.includes(report.status)) return;
    const timer = setTimeout(() => run(async () => setReport(await api.reports.status(report.id))), 1000);
    return () => clearTimeout(timer);
  }, [report, run]);

  function start(event: FormEvent) {
    event.preventDefault();
    run(async () => {
      const { id } = await api.reports.start(note);
      setReport({ id, status: "queued", output: null, error: null });
    });
  }

  return (
    <>
      <h1>Workflows</h1>
      <p className="muted">
        <code>ReportWorkflow</code> chạy 5 bước: đếm todo, đếm job, đếm file, <strong>ngủ 5 giây</strong>, ghi báo
        cáo JSON vào R2. Mỗi bước tự retry khi lỗi và không chạy lại khi đã xong.
      </p>

      <form onSubmit={start}>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ghi chú cho báo cáo" />
        <button type="submit" disabled={Boolean(report && !DONE.includes(report.status))}>
          Chạy báo cáo
        </button>
      </form>

      <ErrorText error={error} />

      {report && (
        <dl className="info">
          <dt>Instance</dt>
          <dd>
            <code>{report.id}</code>
          </dd>
          <dt>Trạng thái</dt>
          <dd>
            <span className={`badge ${report.status}`}>{report.status}</span>
          </dd>
          {report.output && (
            <>
              <dt>Kết quả</dt>
              <dd>
                {report.output.todos} todo ({report.output.doneTodos} xong) · {report.output.jobs} job ·{" "}
                {report.output.files} file
              </dd>
              <dt>File</dt>
              <dd>
                <a href={api.reports.downloadUrl(report.id)} target="_blank" rel="noreferrer">
                  {report.output.key}
                </a>
              </dd>
            </>
          )}
          {report.error && (
            <>
              <dt>Lỗi</dt>
              <dd className="error">{report.error}</dd>
            </>
          )}
        </dl>
      )}
    </>
  );
}
