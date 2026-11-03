import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import type { ReportOutput, ReportParams } from "../../shared/types";
import type { Env } from "../env";

/**
 * Workflow ReportWorkflow: tổng hợp số liệu rồi ghi báo cáo JSON vào R2.
 *
 * Mỗi `step.do` là một bước: kết quả được lưu lại, bước lỗi tự retry; nếu Worker
 * bị khởi động lại giữa chừng, Workflow chạy tiếp từ bước dang dở (bước xong không chạy lại).
 * `step.sleep` cho Workflow ngủ (vài giây đến cả tháng) mà không tốn CPU.
 */
export class ReportWorkflow extends WorkflowEntrypoint<Env, ReportParams> {
  override async run(event: WorkflowEvent<ReportParams>, step: WorkflowStep): Promise<ReportOutput> {
    const todos = await step.do("đếm todo (D1)", async () => {
      const row = await this.env.DB.prepare(
        "SELECT COUNT(*) AS total, COALESCE(SUM(done), 0) AS done FROM todos",
      ).first<{ total: number; done: number }>();
      return { total: row?.total ?? 0, done: row?.done ?? 0 };
    });

    const jobs = await step.do("đếm job (D1)", async () => {
      return (await this.env.DB.prepare("SELECT COUNT(*) AS n FROM jobs").first<number>("n")) ?? 0;
    });

    const files = await step.do(
      "đếm file (R2)",
      // Tuỳ chọn retry cho riêng bước này.
      { retries: { limit: 3, delay: "1 second", backoff: "exponential" }, timeout: "30 seconds" },
      async () => (await this.env.BUCKET.list({ prefix: "uploads/" })).objects.length,
    );

    // Giả lập việc chờ (ví dụ chờ hệ thống khác). Trong test sleep được tắt.
    await step.sleep("chờ 5 giây", "5 seconds");

    const key = `reports/${event.instanceId}.json`;
    await step.do("ghi báo cáo (R2)", async () => {
      const report = {
        id: event.instanceId,
        note: event.payload.note,
        createdAt: new Date().toISOString(),
        todos,
        jobs,
        files,
      };
      await this.env.BUCKET.put(key, JSON.stringify(report, null, 2), {
        httpMetadata: { contentType: "application/json" },
      });
    });

    return { key, todos: todos.total, doneTodos: todos.done, files, jobs };
  }
}
