import type { JobMessage, ReportParams } from "../shared/types";
import type { Counter } from "./durable-objects/counter";

/**
 * Binding của Worker — mỗi trường tương ứng một mục trong wrangler.jsonc.
 * Đọc trong route bằng `c.env`, trong queue / scheduled bằng tham số `env`.
 */
export type Env = {
  // vars
  APP_NAME: string;
  APP_ENV: string;
  // secret (.dev.vars / `wrangler secret put`)
  ADMIN_TOKEN?: string;

  DB: D1Database;
  KV: KVNamespace;
  BUCKET: R2Bucket;
  JOBS: Queue<JobMessage>;
  COUNTER: DurableObjectNamespace<Counter>;
  REPORT_WORKFLOW: Workflow<ReportParams>;
  RATE_LIMITER: RateLimit;
  ANALYTICS: AnalyticsEngineDataset;
  VERSION: WorkerVersionMetadata;
};

export type AppEnv = { Bindings: Env };

/** Key KV hệ thống (không hiện trong trang KV). */
export const KV_LAST_CRON = "system:last-cron";
