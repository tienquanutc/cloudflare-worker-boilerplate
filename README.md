# cloudflare-worker-boilerplate · `feat/all`

Bản demo **đầy đủ tính năng** của Cloudflare Workers trong một project: React (SPA) + Hono, kèm cấu hình cho production và staging.

| Tính năng | Binding | Trang | API | Code |
|---|---|---|---|---|
| **D1** — database SQL | `DB` | `/todos` | `/api/todos` (CRUD) | `src/worker/routes/todos.ts` |
| **KV** — key-value, TTL | `KV` | `/kv` | `/api/kv/:key` (GET · PUT · DELETE) | `routes/kv.ts` |
| **R2** — lưu file | `BUCKET` | `/files` | `/api/files` (upload · tải · xoá) | `routes/files.ts` |
| **Queues** — việc chạy nền, retry, DLQ | `JOBS` | `/jobs` | `/api/jobs` | `routes/jobs.ts`, `queue.ts` |
| **Workflows** — nhiều bước, sleep | `REPORT_WORKFLOW` | `/reports` | `/api/reports` | `routes/reports.ts`, `workflows/report.ts` |
| **Durable Objects** — trạng thái + WebSocket | `COUNTER` | `/counter` | `/api/counters/:name` (+ `/ws`) | `routes/counters.ts`, `durable-objects/counter.ts` |
| **Secret** — API cần token | `ADMIN_TOKEN` | `/admin` | `/api/admin/stats` | `routes/admin.ts` |
| **Cron Triggers** | — | | | `scheduled.ts` |
| **Rate limiting** — 60 request ghi / phút / IP | `RATE_LIMITER` | | mọi POST/PUT/PATCH/DELETE | `middleware/rate-limit.ts` |
| **Analytics Engine** — số liệu mỗi request | `ANALYTICS` | | | `middleware/analytics.ts` |
| **Vars + version metadata** | `APP_NAME`, `APP_ENV`, `VERSION` | `/` | `/api/info` | `index.ts` |
| **Static assets (SPA)** | — | mọi trang | | `src/client/` |

Toàn bộ cấu hình nằm trong [`wrangler.jsonc`](wrangler.jsonc), mỗi mục có ghi chú.

```text
src/worker/index.ts        Hono app + export fetch / queue / scheduled + class Counter, ReportWorkflow
src/worker/routes/         mỗi tính năng một file route
src/worker/env.ts          kiểu của mọi binding
src/client/                React: App.tsx (router), pages/ (mỗi tính năng một trang), api.ts
src/shared/types.ts        kiểu dữ liệu dùng chung Worker ↔ React
migrations/                SQL cho D1
scripts/seed.mjs           seed dữ liệu mẫu local
scripts/setup-cloudflare.mjs  tạo Queue trên Cloudflare
test/                      test từng tính năng (chạy trong workerd, binding thật ở local)
```

## 1. Cài đặt

Cần macOS 13.5+ và Node.js 22 (`brew install node@22`, xem nhánh `master`). Rồi:

```bash
npm install
cp .dev.vars.example .dev.vars    # secret local: ADMIN_TOKEN=dev-admin-token
npm run seed                      # dữ liệu mẫu: todo, job, ghi chú KV, file R2
```

## 2. Chạy local

```bash
npm run dev
```

Mở <http://localhost:5173>. Mọi binding (D1, KV, R2, Queue, Durable Object, Workflow, rate limit…) chạy ngay trên máy, không cần mạng hay tài khoản Cloudflare. Dữ liệu nằm trong `.wrangler/`.

| Muốn | Làm |
|---|---|
| Seed lại từ đầu | `npm run seed:reset` (xoá todo, job, ghi chú KV, file R2 rồi seed lại) |
| Chạy cron ngay | mở <http://localhost:5173/cdn-cgi/handler/scheduled?cron=*/30+*+*+*+*> |
| Xem / query database, KV, R2 | <http://localhost:5173/cdn-cgi/local/explorer> |
| Xoá sạch dữ liệu local | `rm -rf .wrangler` |

## 3. Deploy

Lần đầu:

```bash
npm run login                     # đăng nhập Cloudflare
npm run setup                     # tạo Queue (KV, R2, D1 tự tạo khi deploy)
npm run deploy
npx wrangler secret put ADMIN_TOKEN --config wrangler.jsonc
```

Các lần sau chỉ cần `npm run deploy`: chạy test → build → upload → migrate D1.

Account cần **bật R2** trước (Dashboard → R2 → Enable). Khi deploy được hỏi tạo KV / R2 / D1 mới thì chọn tạo mới.

### Staging

Môi trường riêng: Worker `cloudflare-worker-boilerplate-staging`, tài nguyên riêng có hậu tố `-staging`.

```bash
npm run setup:staging
npm run deploy:staging
npx wrangler secret put ADMIN_TOKEN --config wrangler.jsonc --env staging
```

`deploy:staging` build với `vite build --mode staging`: file `.env.staging` đặt `CLOUDFLARE_ENV=staging` để chọn `env.staging` trong `wrangler.jsonc`.

### Domain riêng

Bỏ comment mục `"routes"` trong `wrangler.jsonc` và đổi domain (zone phải nằm trong cùng account):

```jsonc
"routes": [
  { "pattern": "app.example.com", "custom_domain": true },        // cả domain trỏ vào Worker
  { "pattern": "example.com/api/*", "zone_name": "example.com" }  // chỉ một phần URL của domain có sẵn
],
```

Staging muốn domain riêng thì thêm `"routes"` vào trong `env.staging` (route không kế thừa).

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | chạy local |
| `npm run seed` / `seed:reset` | seed dữ liệu mẫu local |
| `npm run check` | kiểm tra kiểu + test |
| `npm run deploy` / `deploy:staging` | deploy |
| `npm run setup` / `setup:staging` | tạo Queue trên Cloudflare |
| `npm run tail` / `tail:staging` | log trực tiếp của bản đã deploy |

## Thêm một binding mới

1. Khai báo trong `wrangler.jsonc`, ở **cả** mức ngoài cùng **và** `env.staging` (binding không kế thừa).
2. Thêm kiểu vào `src/worker/env.ts`.
3. Dùng trong code qua `c.env.<TÊN>`.

Chưa có trong demo (cần tài khoản trả phí hoặc tài nguyên ngoài, không chạy được hoàn toàn ở local): Workers AI, Vectorize, Hyperdrive, Browser Rendering, Email.

## Gặp lỗi

| Lỗi | Cách sửa |
|---|---|
| `Queue "…" does not exist` khi deploy | chưa chạy `npm run setup` (hoặc `setup:staging`) |
| `Please enable R2` | bật R2 trên Dashboard |
| `/api/admin/stats` trả `401` | sai token; local xem `.dev.vars`, Cloudflare đặt bằng `wrangler secret put` |
| `429 rate_limited` | quá 60 request ghi / phút từ một IP, đợi 1 phút |
| `no such table` | `npx wrangler d1 migrations apply DB --local` |
| `More than one account available` | điền `account_id` trong `wrangler.jsonc` |
