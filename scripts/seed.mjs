// Seed dữ liệu mẫu vào D1, KV, R2 LOCAL (thư mục .wrangler/, cũng là dữ liệu `npm run dev` dùng).
//
//   npm run seed          thêm dữ liệu mẫu (bảng D1 đã có dữ liệu thì bỏ qua bảng đó)
//   npm run seed:reset    xoá todo, job, ghi chú KV, file R2 rồi seed lại
//
// Không bao giờ đụng tới Cloudflare: getPlatformProxy chỉ mở binding local.

// Ẩn cảnh báo "Durable Object / Workflow không có ở local" (script không chạy Worker nên không cần chúng).
process.env.WRANGLER_LOG ??= "error";
const { getPlatformProxy } = await import("wrangler");

const reset = process.argv.includes("--reset");

// configPath rõ ràng để không bị "redirect" sang config trong dist/ sau khi build.
const { env, dispose } = await getPlatformProxy({ configPath: "wrangler.jsonc", persist: true });

try {
  if (reset) await clear();
  await seedTodos();
  await seedJobs();
  await seedKv();
  await seedFiles();
  console.log(`\n✅ Xong. Chạy \`npm run dev\` rồi mở http://localhost:5173`);
} finally {
  await dispose();
}

async function clear() {
  await env.DB.batch([env.DB.prepare("DELETE FROM todos"), env.DB.prepare("DELETE FROM jobs")]);
  const { keys } = await env.KV.list({ prefix: "note:" });
  await Promise.all(keys.map((k) => env.KV.delete(k.name)));
  const { objects } = await env.BUCKET.list({ prefix: "uploads/" });
  if (objects.length) await env.BUCKET.delete(objects.map((o) => o.key));
  console.log("🧹 Đã xoá dữ liệu cũ");
}

/** Bảng còn trống không (để không seed trùng). */
async function isEmpty(table) {
  return ((await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first("n")) ?? 0) === 0;
}

/** Thời điểm cách đây `minutes` phút, dạng ISO như SQLite ghi. */
function ago(minutes) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

async function seedTodos() {
  if (!(await isEmpty("todos"))) return console.log("⏭  D1 todos: đã có dữ liệu, bỏ qua (dùng seed:reset để làm lại)");
  const todos = [
    ["Đọc tài liệu Cloudflare Workers", 1, 60 * 24 * 3],
    ["Thiết kế bảng D1 cho đơn hàng", 1, 60 * 24 * 2],
    ["Viết API CRUD bằng Hono", 1, 60 * 30],
    ["Upload ảnh sản phẩm lên R2", 0, 60 * 20],
    ["Gửi email chào mừng qua Queue", 0, 60 * 8],
    ["Cấu hình domain riêng cho production", 0, 90],
    ["Viết test cho Durable Object", 0, 15],
  ];
  await env.DB.batch(
    todos.map(([title, done, minutes]) =>
      env.DB.prepare("INSERT INTO todos (title, done, created_at) VALUES (?, ?, ?)").bind(title, done, ago(minutes)),
    ),
  );
  console.log(`🗂  D1 todos: ${todos.length} việc`);
}

async function seedJobs() {
  if (!(await isEmpty("jobs"))) return console.log("⏭  D1 jobs: đã có dữ liệu, bỏ qua");
  const jobs = [
    ["echo", "Gửi email xác nhận đơn #1024", "done", 1, "Echo: Gửi email xác nhận đơn #1024", 180],
    ["slow", "Tạo ảnh thumbnail cho 12 sản phẩm", "done", 1, "Xong sau 3 giây: Tạo ảnh thumbnail cho 12 sản phẩm", 120],
    ["fail", "Đồng bộ kho với hệ thống cũ", "failed", 3, "Hết lượt retry, đã chuyển sang dead letter queue", 60],
    ["echo", "Gửi thông báo Telegram", "done", 1, "Echo: Gửi thông báo Telegram", 25],
    ["slow", "Xuất báo cáo doanh thu tuần", "done", 2, "Xong sau 3 giây: Xuất báo cáo doanh thu tuần", 5],
  ];
  await env.DB.batch(
    jobs.map(([kind, payload, status, attempts, result, minutes]) =>
      env.DB.prepare(
        "INSERT INTO jobs (id, kind, payload, status, attempts, result, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      ).bind(crypto.randomUUID(), kind, payload, status, attempts, result, ago(minutes), ago(minutes - 1)),
    ),
  );
  console.log(`📬 D1 jobs: ${jobs.length} job`);
}

async function seedKv() {
  const notes = {
    welcome: "Chào mừng bạn đến với Cloudflare Worker Boilerplate! Mỗi trang ở thanh trên là một tính năng của Cloudflare.",
    "feature-flags": JSON.stringify({ newCheckout: true, darkMode: false, betaUsers: ["an", "binh"] }, null, 2),
    "release-notes": "v1.2.0\n- Thêm upload file (R2)\n- Thêm hàng đợi job (Queues)\n- Counter realtime (Durable Objects)",
    "support-email": "hotro@example.com",
  };
  await Promise.all(Object.entries(notes).map(([key, value]) => env.KV.put(`note:${key}`, value)));
  // Key tự hết hạn sau 1 ngày (TTL).
  await env.KV.put("note:maintenance-banner", "Hệ thống bảo trì lúc 23:00 tối nay, khoảng 15 phút.", {
    expirationTtl: 60 * 60 * 24,
  });
  await env.KV.put("system:last-cron", ago(12));
  console.log(`🔑 KV: ${Object.keys(notes).length + 1} ghi chú (1 key có TTL)`);
}

async function seedFiles() {
  const files = {
    "logo.svg": [
      "image/svg+xml",
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 64"><path fill="#f6821f" d="M92 52H28a16 16 0 0 1-2-31.9A22 22 0 0 1 68 14a18 18 0 0 1 24 15 12 12 0 0 1 0 23z"/></svg>`,
    ],
    "huong-dan.md": [
      "text/markdown; charset=utf-8",
      "# Hướng dẫn\n\n1. Upload file ở trang R2\n2. Bấm tên file để mở\n3. Bấm Xoá để xoá khỏi bucket\n",
    ],
    "san-pham.json": [
      "application/json",
      JSON.stringify(
        [
          { id: 1, ten: "Áo thun Cloudflare", gia: 199000 },
          { id: 2, ten: "Cốc sứ Workers", gia: 149000 },
          { id: 3, ten: "Sticker R2", gia: 19000 },
        ],
        null,
        2,
      ),
    ],
    "doanh-thu-thang-10.csv": [
      "text/csv; charset=utf-8",
      "ngay,don_hang,doanh_thu\n2026-10-01,12,2350000\n2026-10-02,18,3120000\n2026-10-03,9,1480000\n",
    ],
  };
  await Promise.all(
    Object.entries(files).map(([name, [contentType, body]]) =>
      env.BUCKET.put(`uploads/${name}`, body, { httpMetadata: { contentType } }),
    ),
  );
  console.log(`📁 R2: ${Object.keys(files).length} file`);
}
