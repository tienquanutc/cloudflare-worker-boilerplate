import { describe, expect, it } from "vitest";
import type { Todo } from "../src/shared/types";
import { call } from "./helpers";

async function create(title: string): Promise<Todo> {
  const res = await call("POST", "/api/todos", { title });
  expect(res.status).toBe(201);
  return res.json();
}

describe("/api/todos", () => {
  it("POST tạo todo mới", async () => {
    const todo = await create("  Mua sữa  ");
    expect(todo).toMatchObject({ title: "Mua sữa", done: false });
    expect(todo.id).toBeGreaterThan(0);
    expect(todo.createdAt).toMatch(/^\d{4}-\d\d-\d\dT/);
  });

  it("POST từ chối tiêu đề trống, quá dài hoặc body không phải JSON", async () => {
    expect((await call("POST", "/api/todos", { title: "  " })).status).toBe(400);
    expect((await call("POST", "/api/todos", { title: "x".repeat(201) })).status).toBe(400);
    expect((await call("POST", "/api/todos", {})).status).toBe(400);
    expect((await call("POST", "/api/todos", "không phải json")).status).toBe(400);
  });

  it("GET trả danh sách và từng todo", async () => {
    const todo = await create("Đọc sách");

    const list: Todo[] = await (await call("GET", "/api/todos")).json();
    expect(list).toContainEqual(todo);

    const res = await call("GET", `/api/todos/${todo.id}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(todo);
  });

  it("PATCH sửa tiêu đề và trạng thái", async () => {
    const todo = await create("Chạy bộ");

    const done: Todo = await (await call("PATCH", `/api/todos/${todo.id}`, { done: true })).json();
    expect(done).toMatchObject({ title: "Chạy bộ", done: true });

    const renamed: Todo = await (await call("PATCH", `/api/todos/${todo.id}`, { title: "Chạy 5km" })).json();
    expect(renamed).toMatchObject({ title: "Chạy 5km", done: true });
  });

  it("PATCH từ chối dữ liệu sai", async () => {
    const todo = await create("Học Hono");
    expect((await call("PATCH", `/api/todos/${todo.id}`, { done: "yes" })).status).toBe(400);
    expect((await call("PATCH", `/api/todos/${todo.id}`, { title: "" })).status).toBe(400);
  });

  it("DELETE xoá todo", async () => {
    const todo = await create("Việc sẽ xoá");
    expect((await call("DELETE", `/api/todos/${todo.id}`)).status).toBe(204);
    expect((await call("GET", `/api/todos/${todo.id}`)).status).toBe(404);
    expect((await call("DELETE", `/api/todos/${todo.id}`)).status).toBe(404);
  });

  it("id không tồn tại hoặc sai dạng trả 404", async () => {
    expect((await call("GET", "/api/todos/999999")).status).toBe(404);
    expect((await call("GET", "/api/todos/abc")).status).toBe(404);
    expect((await call("PATCH", "/api/todos/999999", { done: true })).status).toBe(404);
  });
});

describe("khác", () => {
  it("GET /api/health", async () => {
    expect(await (await call("GET", "/api/health")).json()).toEqual({ status: "ok" });
  });

  it("đường dẫn API lạ trả 404", async () => {
    expect((await call("GET", "/api/khong-co")).status).toBe(404);
  });
});
