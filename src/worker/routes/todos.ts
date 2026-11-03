import { Hono, type Context } from "hono";
import type { Todo } from "../../shared/todo";
import type { AppEnv } from "../env";
import { badRequest, notFound, readJson } from "../lib/http";

/** CRUD /api/todos, lưu trong D1 (bảng `todos`, xem migrations/). */
export const todos = new Hono<AppEnv>();

type TodoRow = { id: number; title: string; done: number; created_at: string };

const MAX_TITLE = 200;

// GET /api/todos — danh sách
todos.get("/", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM todos ORDER BY id").all<TodoRow>();
  return c.json(results.map(toTodo));
});

// GET /api/todos/:id — một todo
todos.get("/:id", async (c) => {
  const row = await c.env.DB.prepare("SELECT * FROM todos WHERE id = ?").bind(id(c)).first<TodoRow>();
  return row ? c.json(toTodo(row)) : notFound(c);
});

// POST /api/todos  {"title": "..."} — tạo mới
todos.post("/", async (c) => {
  const body = await readJson(c);
  const title = validTitle(body?.title);
  if (title === undefined) return badRequest(c, "title_required");

  const row = await c.env.DB.prepare("INSERT INTO todos (title) VALUES (?) RETURNING *").bind(title).first<TodoRow>();
  return c.json(toTodo(row!), 201);
});

// PATCH /api/todos/:id  {"title"?: "...", "done"?: true} — sửa
todos.patch("/:id", async (c) => {
  const body = await readJson(c);
  if (!body) return badRequest(c, "invalid_json");

  const title = body.title === undefined ? null : validTitle(body.title);
  if (title === undefined) return badRequest(c, "invalid_title");
  if (body.done !== undefined && typeof body.done !== "boolean") return badRequest(c, "invalid_done");
  const done = body.done === undefined ? null : Number(body.done);

  const row = await c.env.DB.prepare(
    "UPDATE todos SET title = COALESCE(?, title), done = COALESCE(?, done) WHERE id = ? RETURNING *",
  )
    .bind(title, done, id(c))
    .first<TodoRow>();
  return row ? c.json(toTodo(row)) : notFound(c);
});

// DELETE /api/todos/:id — xoá
todos.delete("/:id", async (c) => {
  const { meta } = await c.env.DB.prepare("DELETE FROM todos WHERE id = ?").bind(id(c)).run();
  return meta.changes > 0 ? c.body(null, 204) : notFound(c);
});

function toTodo(row: TodoRow): Todo {
  return { id: row.id, title: row.title, done: row.done === 1, createdAt: row.created_at };
}

/** id trong URL; không phải số nguyên dương → 0 (không khớp dòng nào → 404). */
function id(c: Context<AppEnv>): number {
  const value = Number(c.req.param("id"));
  return Number.isInteger(value) && value > 0 ? value : 0;
}

/** Tiêu đề hợp lệ (đã trim), hoặc undefined nếu sai. */
function validTitle(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const title = value.trim();
  return title.length > 0 && title.length <= MAX_TITLE ? title : undefined;
}
