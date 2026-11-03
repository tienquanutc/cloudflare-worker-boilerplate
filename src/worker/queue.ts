import type { JobMessage } from "../shared/types";
import type { Env } from "./env";

/**
 * Queue consumer: Cloudflare gọi hàm này với một lô message (tối đa max_batch_size trong wrangler.jsonc).
 *
 * - Hàng đợi chính: xử lý từng job; lỗi → `msg.retry()`, sau max_retries lần message sang dead letter queue.
 * - Dead letter queue (tên kết thúc bằng "-dlq"): đánh dấu job "failed".
 */
export async function queue(batch: MessageBatch<JobMessage>, env: Env): Promise<void> {
  const isDeadLetter = batch.queue.includes("-dlq");

  for (const msg of batch.messages) {
    const job = msg.body;
    if (isDeadLetter) {
      // msg.attempts ở DLQ đếm lại từ 1 → giữ số lần thử của hàng đợi chính (null = không đổi).
      await setStatus(env, job.id, "failed", null, "Hết lượt retry, đã chuyển sang dead letter queue");
      msg.ack();
      continue;
    }

    try {
      const result = await process(job);
      await setStatus(env, job.id, "done", msg.attempts, result);
      msg.ack();
    } catch (error) {
      await setStatus(env, job.id, "queued", msg.attempts, `Lần ${msg.attempts} lỗi: ${(error as Error).message}`);
      msg.retry({ delaySeconds: 2 });
    }
  }
}

async function process(job: JobMessage): Promise<string> {
  switch (job.kind) {
    case "echo":
      return `Echo: ${job.payload || "(trống)"}`;
    case "slow":
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return `Xong sau 3 giây: ${job.payload || "(trống)"}`;
    case "fail":
      throw new Error("job 'fail' luôn lỗi (cố ý)");
  }
}

async function setStatus(env: Env, id: string, status: string, attempts: number | null, result: string): Promise<void> {
  await env.DB.prepare(
    "UPDATE jobs SET status = ?, attempts = COALESCE(?, attempts), result = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
  )
    .bind(status, attempts, result, id)
    .run();
}
