import { describe, expect, it } from "vitest";
import type { StoredFile } from "../src/shared/types";
import { call } from "./helpers";

function upload(name: string, content: string, type = "text/plain") {
  const form = new FormData();
  form.append("file", new File([content], name, { type }));
  return call("POST", "/api/files", form);
}

describe("/api/files (R2)", () => {
  it("upload, liệt kê, tải về, xoá", async () => {
    const res = await upload("hello.txt", "Xin chào R2");
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ name: "hello.txt", size: 12, contentType: "text/plain" });

    const list: StoredFile[] = await (await call("GET", "/api/files")).json();
    expect(list.map((f) => f.name)).toContain("hello.txt");

    const download = await call("GET", "/api/files/hello.txt");
    expect(download.headers.get("Content-Type")).toBe("text/plain");
    expect(await download.text()).toBe("Xin chào R2");

    expect((await call("DELETE", "/api/files/hello.txt")).status).toBe(204);
    expect((await call("GET", "/api/files/hello.txt")).status).toBe(404);
    expect((await call("DELETE", "/api/files/hello.txt")).status).toBe(404);
  });

  it("khoảng trắng trong tên được đổi thành '-'", async () => {
    expect(await (await upload("bao cao.txt", "x")).json()).toMatchObject({ name: "bao-cao.txt" });
  });

  it("từ chối khi thiếu file hoặc file rỗng", async () => {
    expect((await call("POST", "/api/files", new FormData())).status).toBe(400);
    expect((await upload("empty.txt", "")).status).toBe(400);
  });
});
