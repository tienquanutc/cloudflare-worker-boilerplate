import { createExecutionContext, createMessageBatch, getQueueResult } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { Job, JobMessage } from "../src/shared/types";
import worker from "../src/worker/index";
import { call } from "./helpers";

async function createJob(kind: string, payload = "hi"): Promise<Job> {
  const res = await call("POST", "/api/jobs", { kind, payload });
  expect(res.status).toBe(202);
  return res.json();
}

/** Gọi consumer queue() với một lô message, như Cloudflare làm. */
async function consume(queue: string, job: Job, attempts = 1) {
  const batch = createMessageBatch<JobMessage>(queue, [
    { id: `msg-${job.id}`, timestamp: new Date(), attempts, body: { id: job.id, kind: job.kind, payload: job.payload } },
  ]);
  const ctx = createExecutionContext();
  await worker.queue(batch, env);
  return getQueueResult(batch, ctx);
}

async function getJob(id: string): Promise<Job> {
  return (await call("GET", `/api/jobs/${id}`)).json();
}

describe("/api/jobs (Queues)", () => {
  it("POST ghi job 'queued' và trả 202", async () => {
    const job = await createJob("echo", "Xin chào");
    expect(job).toMatchObject({ kind: "echo", payload: "Xin chào", status: "queued", attempts: 0 });

    const list: Job[] = await (await call("GET", "/api/jobs")).json();
    expect(list.map((j) => j.id)).toContain(job.id);
  });

  it("từ chối loại job lạ", async () => {
    expect((await call("POST", "/api/jobs", { kind: "nope" })).status).toBe(400);
  });

  it("consumer xử lý job 'echo' → done + ack", async () => {
    const job = await createJob("echo", "abc");
    const result = await consume("cloudflare-worker-boilerplate-jobs", job);
    expect(result.explicitAcks).toEqual([`msg-${job.id}`]);
    expect(await getJob(job.id)).toMatchObject({ status: "done", attempts: 1, result: "Echo: abc" });
  });

  it("consumer gặp job 'fail' → retry, giữ trạng thái queued", async () => {
    const job = await createJob("fail");
    const result = await consume("cloudflare-worker-boilerplate-jobs", job);
    expect(result.retryMessages).toMatchObject([{ msgId: `msg-${job.id}` }]);
    expect(await getJob(job.id)).toMatchObject({ status: "queued", attempts: 1 });
  });

  it("dead letter queue đánh dấu job failed, giữ số lần đã thử", async () => {
    const job = await createJob("fail");
    for (const attempts of [1, 2, 3]) await consume("cloudflare-worker-boilerplate-jobs", job, attempts);
    // Ở DLQ message bắt đầu lại từ attempts = 1.
    const result = await consume("cloudflare-worker-boilerplate-jobs-dlq", job, 1);
    expect(result.explicitAcks).toEqual([`msg-${job.id}`]);
    expect(await getJob(job.id)).toMatchObject({ status: "failed", attempts: 3 });
  });
});
