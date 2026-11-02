import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";

// Tạo bảng trong D1 của test (chạy migrations/ — giống trên Cloudflare).
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
