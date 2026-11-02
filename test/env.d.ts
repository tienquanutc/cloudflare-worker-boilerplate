import type { D1Migration } from "cloudflare:test";
import type { Env } from "../src/worker/env";

// Kiểu của `env` từ "cloudflare:workers" trong test.
declare global {
  namespace Cloudflare {
    interface Env {
      DB: D1Database;
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}

export type { Env };
