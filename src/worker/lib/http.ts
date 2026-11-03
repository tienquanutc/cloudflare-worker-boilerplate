import type { Context } from "hono";

/** Body JSON dạng object, hoặc undefined nếu không phải JSON object. */
export async function readJson(c: Context): Promise<Record<string, unknown> | undefined> {
  try {
    const body: unknown = await c.req.json();
    return body !== null && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

export function badRequest(c: Context, error: string) {
  return c.json({ error }, 400);
}

export function notFound(c: Context) {
  return c.json({ error: "not_found" }, 404);
}

/** Tên an toàn cho key KV / file R2: chữ, số, `.`, `-`, `_`, tối đa 100 ký tự. */
export function validName(value: unknown): string | undefined {
  return typeof value === "string" && /^[\w.-]{1,100}$/.test(value) ? value : undefined;
}
