// Tạo trên Cloudflare những tài nguyên Wrangler KHÔNG tự tạo khi deploy (hiện là Queues).
// D1, KV, R2 tự tạo ở lần deploy đầu; Durable Objects, Workflows tạo cùng Worker.
//
//   npm run setup            cho production
//   npm run setup:staging    cho env "staging"
//
// Chạy lại nhiều lần cũng được: queue đã có thì bỏ qua.
import { spawnSync } from "node:child_process";
import { unstable_readConfig } from "wrangler";

const envIndex = process.argv.indexOf("--env");
const env = envIndex > 0 ? process.argv[envIndex + 1] : undefined;
const config = unstable_readConfig({ config: "wrangler.jsonc", env });

const queues = new Set([
  ...config.queues.producers.map((p) => p.queue),
  ...config.queues.consumers.flatMap((c) => [c.queue, c.dead_letter_queue].filter(Boolean)),
]);

console.log(`Worker: ${config.name}${env ? ` (env ${env})` : ""}`);
for (const queue of queues) {
  const result = spawnSync("npx", ["wrangler", "queues", "create", queue], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  const output = `${result.stdout}\n${result.stderr}`;
  if (result.status === 0) console.log(`✅ đã tạo queue ${queue}`);
  else if (/already (exists|taken)/i.test(output)) console.log(`⏭  queue ${queue} đã có`);
  else {
    console.error(`❌ không tạo được queue ${queue}:\n${output.trim()}`);
    process.exitCode = 1;
  }
}
