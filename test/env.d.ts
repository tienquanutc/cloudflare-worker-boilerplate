import type { D1Migration } from "cloudflare:test";
import type { Env as WorkerEnv } from "../src/worker/env";

// Kiểu của `env` từ "cloudflare:workers" trong test: mọi binding của Worker + migrations cho D1 test.
declare global {
  namespace Cloudflare {
    interface Env extends WorkerEnv {
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}
