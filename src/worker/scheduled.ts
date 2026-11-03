import { KV_LAST_CRON, type Env } from "./env";

// Cron Triggers ("triggers.crons" trong wrangler.jsonc). `controller.cron` cho biết lịch nào đang chạy.
// Chạy thử ở local: mở http://localhost:5173/cdn-cgi/handler/scheduled?cron=*/30+*+*+*+*
export async function scheduled(controller: ScheduledController, env: Env): Promise<void> {
  switch (controller.cron) {
    // Mỗi 30 phút: ghi thời điểm chạy vào KV (trang Tổng quan hiển thị).
    case "*/30 * * * *":
      await env.KV.put(KV_LAST_CRON, new Date(controller.scheduledTime).toISOString());
      break;

    // Mỗi ngày 00:00 giờ Việt Nam: xoá job đã xong / lỗi quá 7 ngày.
    case "0 17 * * *": {
      const { meta } = await env.DB.prepare(
        "DELETE FROM jobs WHERE status != 'queued' AND created_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days')",
      ).run();
      console.log(JSON.stringify({ job: "cleanup_jobs", deleted: meta.changes }));
      break;
    }

    default:
      console.warn(`cron không xử lý: ${controller.cron}`);
  }
}
