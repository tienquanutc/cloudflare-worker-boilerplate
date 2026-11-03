import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

// Test chạy trong runtime Workers (workerd) với một D1 local riêng cho test.
export default defineConfig(async () => {
  const migrations = await readD1Migrations("./migrations");
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: { bindings: { TEST_MIGRATIONS: migrations, ADMIN_TOKEN: "test-admin-token" } },
      }),
    ],
    test: { setupFiles: ["./test/setup.ts"] },
  };
});
