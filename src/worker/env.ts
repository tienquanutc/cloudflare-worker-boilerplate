/** Binding của Worker (khai báo trong wrangler.jsonc), đọc trong route bằng `c.env`. */
export type Env = {
  DB: D1Database;
};

export type AppEnv = { Bindings: Env };
