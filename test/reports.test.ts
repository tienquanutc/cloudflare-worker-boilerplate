import { introspectWorkflow } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { ReportStatus } from "../src/shared/types";
import { call } from "./helpers";

describe("/api/reports (Workflows)", () => {
  it("chạy hết các bước và ghi báo cáo vào R2", async () => {
    await call("POST", "/api/todos", { title: "Có trong báo cáo" });

    // Tắt step.sleep để test không phải chờ 5 giây.
    await using introspector = await introspectWorkflow(env.REPORT_WORKFLOW);
    await introspector.modifyAll(async (m) => {
      await m.disableSleeps();
    });

    const start = await call("POST", "/api/reports", { note: "test" });
    expect(start.status).toBe(202);
    const { id } = (await start.json()) as { id: string };

    const [instance] = await introspector.get();
    await instance!.waitForStatus("complete");

    const status: ReportStatus = await (await call("GET", `/api/reports/${id}`)).json();
    expect(status.status).toBe("complete");
    expect(status.output).toMatchObject({ key: `reports/${id}.json` });
    expect(status.output!.todos).toBeGreaterThan(0);

    const report = await (await call("GET", `/api/reports/${id}/download`)).json();
    expect(report).toMatchObject({ id, note: "test" });
  });

  it("id không tồn tại trả 404", async () => {
    expect((await call("GET", "/api/reports/khong-co")).status).toBe(404);
  });
});
