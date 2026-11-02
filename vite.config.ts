import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// react(): app React trong src/client · cloudflare(): chạy Worker (đọc wrangler.jsonc) ngay trong Vite.
export default defineConfig({
  plugins: [react(), cloudflare()],
});
