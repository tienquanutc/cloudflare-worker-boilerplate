# cloudflare-worker-boilerplate

App Todo mẫu chạy trên **Cloudflare Workers**:

- **Giao diện**: React (SPA), build bằng Vite
- **API**: Hono, CRUD `/api/todos`
- **Database**: Cloudflare D1 (SQLite)

```text
index.html               trang gốc của React
src/client/              React: App.tsx, api.ts (gọi API), style.css
src/worker/              Worker: index.ts (Hono), todos.ts (CRUD)
src/shared/todo.ts       kiểu Todo dùng chung
migrations/              SQL tạo bảng
test/                    test API (chạy với D1 thật ở local)
wrangler.jsonc           cấu hình Cloudflare
```

## API

| Method | Path | Body | Kết quả |
|---|---|---|---|
| GET | `/api/todos` | | danh sách todo |
| GET | `/api/todos/:id` | | một todo (`404` nếu không có) |
| POST | `/api/todos` | `{"title":"Mua sữa"}` | `201` + todo mới |
| PATCH | `/api/todos/:id` | `{"title":"…"}` và/hoặc `{"done":true}` | todo sau khi sửa |
| DELETE | `/api/todos/:id` | | `204` |

Todo: `{"id":1,"title":"Mua sữa","done":false,"createdAt":"2026-11-03T08:00:00.000Z"}`. Dữ liệu sai → `400 {"error":"…"}`.

## 1. Cài đặt (một lần)

Cần macOS 13.5 trở lên. Mở **Terminal** (`⌘ Space` → gõ Terminal):

```bash
# Homebrew (bỏ qua nếu đã có) — cài xong làm theo mục "Next steps" nó in ra
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.js 22
brew install node@22
echo "export PATH=\"$(brew --prefix node@22)/bin:\$PATH\"" >> ~/.zshrc
source ~/.zshrc
node -v
```

Vào thư mục project và cài thư viện:

```bash
cd cloudflare-worker-boilerplate
npm install
```

## 2. Chạy local

```bash
npm run dev
```

Mở <http://localhost:5173>. Sửa code là trang tự cập nhật. `Ctrl+C` để dừng.

Database local nằm trong `.wrangler/`, không đụng tới Cloudflare. Muốn xoá sạch dữ liệu local: `rm -rf .wrangler`.

## 3. Deploy

Đăng nhập Cloudflare (một lần, trình duyệt sẽ mở → **Allow**):

```bash
npm run login
```

Deploy:

```bash
npm run deploy
```

Lệnh này chạy test → build → upload → cập nhật bảng trong database. Test lỗi thì dừng, không upload gì. Xong sẽ in ra URL dạng `https://cloudflare-worker-boilerplate.<tên>.workers.dev`.

Lần deploy đầu, Cloudflare tự tạo database `cloudflare-worker-boilerplate-db`. Nếu được hỏi chọn database thì chọn tạo mới. Nếu được hỏi đặt tên subdomain `workers.dev` thì gõ một tên bất kỳ. Khi được hỏi có chạy migration không thì gõ `y`.

## Lệnh thường dùng

| Lệnh | Việc |
|---|---|
| `npm run dev` | chạy local |
| `npm test` | chạy test |
| `npm run check` | kiểm tra kiểu + test |
| `npm run deploy` | deploy lên Cloudflare |
| `npm run tail` | xem log trực tiếp của bản đã deploy |

Trong Finder có thể bấm đúp `dev.command` / `deploy.command` (lần đầu chạy `chmod +x *.command` trong Terminal).

## Thêm bảng / cột

Tạo file SQL mới trong `migrations/`, đánh số tiếp theo, ví dụ `0002_add_due_date.sql`:

```sql
ALTER TABLE todos ADD COLUMN due_date TEXT;
```

`npm run dev` và `npm run deploy` tự chạy các file chưa chạy.

## Gặp lỗi

| Lỗi | Cách sửa |
|---|---|
| `command not found: node` | chạy lại 3 dòng `brew install node@22 …` ở trên |
| `Cannot read properties of null (reading 'edgesOut')` | thiếu file `.npmrc` (file ẩn) — copy lại từ project gốc |
| `no such table: todos` | chưa chạy migration: `npx wrangler d1 migrations apply DB --local` (hoặc `--remote`) |
| `More than one account available` | điền `account_id` trong `wrangler.jsonc` (xem bằng `npx wrangler whoami`) |
| `Not logged in` | `npm run login` |
