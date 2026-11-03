import { Hono } from "hono";
import type { StoredFile } from "../../shared/types";
import type { AppEnv } from "../env";
import { badRequest, notFound, validName } from "../lib/http";

/** R2 /api/files — upload, tải, liệt kê, xoá file. */
export const files = new Hono<AppEnv>();

// File người dùng upload nằm dưới "uploads/"; báo cáo của Workflow nằm dưới "reports/".
const PREFIX = "uploads/";
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

// GET /api/files — danh sách
files.get("/", async (c) => {
  const { objects } = await c.env.BUCKET.list({ prefix: PREFIX, include: ["httpMetadata"] });
  const list: StoredFile[] = objects.map((o) => ({
    name: o.key.slice(PREFIX.length),
    size: o.size,
    contentType: o.httpMetadata?.contentType ?? null,
    uploaded: o.uploaded.toISOString(),
  }));
  return c.json(list);
});

// POST /api/files — upload bằng form multipart, trường "file"
files.post("/", async (c) => {
  const form = await c.req.formData().catch(() => undefined);
  const file = form?.get("file");
  if (!(file instanceof File)) return badRequest(c, "file_required");
  const name = validName(file.name.replace(/\s+/g, "-"));
  if (!name) return badRequest(c, "invalid_file_name");
  if (file.size === 0 || file.size > MAX_SIZE) return badRequest(c, "invalid_file_size");

  const object = await c.env.BUCKET.put(PREFIX + name, file.stream(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });
  const stored: StoredFile = {
    name,
    size: object.size,
    contentType: object.httpMetadata?.contentType ?? null,
    uploaded: object.uploaded.toISOString(),
  };
  return c.json(stored, 201);
});

// GET /api/files/:name — tải file (stream thẳng từ R2)
files.get("/:name", async (c) => {
  const name = validName(c.req.param("name"));
  const object = name && (await c.env.BUCKET.get(PREFIX + name));
  if (!object) return notFound(c);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Content-Disposition", `inline; filename="${name}"`);
  return new Response(object.body, { headers });
});

// DELETE /api/files/:name
files.delete("/:name", async (c) => {
  const name = validName(c.req.param("name"));
  if (!name || !(await c.env.BUCKET.head(PREFIX + name))) return notFound(c);
  await c.env.BUCKET.delete(PREFIX + name);
  return c.body(null, 204);
});
