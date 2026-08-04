import { describe, it, expect, beforeEach, vi } from "vitest";
import { __resetBackendForTests } from "./db";
import { __setCacheQuotaForTests, cachePut, cacheGet, cacheDeleteWhereKeyStartsWith } from "./cache-manager";
import { enqueueSubmission, pendingSubmissions, removeSubmission, pendingCount } from "./queue";
import { runSync } from "./sync-engine";
import {
  isCacheableGet,
  isQueuable,
  lessonIdFromEndpoint,
  normalizeEndpoint,
} from "./cache-policy";

describe("cache-policy", () => {
  it("classifies cacheable lesson GETs", () => {
    expect(isCacheableGet("/lessons/abc")).toBe(true);
    expect(isCacheableGet("/lessons/abc/vocabulary")).toBe(true);
    expect(isCacheableGet("/lessons/abc/games")).toBe(true);
    expect(isCacheableGet("/quizzes/abc")).toBe(true);
    expect(isCacheableGet("/homework/abc")).toBe(true);
    expect(isCacheableGet("/curriculum")).toBe(true);
    expect(isCacheableGet("/mistakes?page=1")).toBe(true);
  });

  it("never caches sensitive endpoints", () => {
    expect(isCacheableGet("/auth/me")).toBe(false);
    expect(isCacheableGet("/profile")).toBe(false);
    expect(isCacheableGet("/wallet")).toBe(false);
    expect(isCacheableGet("/leaderboard")).toBe(false);
    expect(isCacheableGet("/ai/chat")).toBe(false);
    expect(isCacheableGet("/payments")).toBe(false);
  });

  it("classifies queuable submissions and normalizes keys", () => {
    expect(isQueuable("/quizzes/abc/submit")?.kind).toBe("unique");
    expect(isQueuable("/videos/abc/progress")?.kind).toBe("mergeable");
    expect(isQueuable("/homework/abc/save")?.kind).toBe("mergeable");
    expect(isQueuable("/auth/login")).toBeNull();
    expect(normalizeEndpoint("/lessons/x?foo=1")).toBe("/lessons/x");
  });

  it("extracts owning lesson id", () => {
    expect(lessonIdFromEndpoint("/lessons/l1/vocabulary")).toBe("l1");
    expect(lessonIdFromEndpoint("/quizzes/l1")).toBe("l1");
    expect(lessonIdFromEndpoint("/homework/l1")).toBe("l1");
    expect(lessonIdFromEndpoint("/curriculum/lessons/l1")).toBe("l1");
    expect(lessonIdFromEndpoint("/auth/me")).toBeNull();
  });
});

describe("queue", () => {
  beforeEach(() => {
    __resetBackendForTests();
  });

  it("collapses mergeable submissions to the latest value", async () => {
    await enqueueSubmission({ method: "PATCH", endpoint: "/videos/v1/progress", body: { currentPosition: 10 } });
    await enqueueSubmission({ method: "PATCH", endpoint: "/videos/v1/progress", body: { currentPosition: 40 } });

    const pending = await pendingSubmissions();
    expect(pending).toHaveLength(1);
    expect(pending[0].body).toEqual({ currentPosition: 40 });
  });

  it("dedupes unique submissions with the same body", async () => {
    await enqueueSubmission({ method: "POST", endpoint: "/quizzes/q1/submit", body: { answers: ["a", "b"] } });
    await enqueueSubmission({ method: "POST", endpoint: "/quizzes/q1/submit", body: { answers: ["a", "b"] } });

    expect(await pendingSubmissions()).toHaveLength(1);
  });

  it("orders pending submissions oldest first", async () => {
    await enqueueSubmission({ method: "POST", endpoint: "/quizzes/q1/start", body: {} });
    await new Promise((r) => setTimeout(r, 5));
    await enqueueSubmission({ method: "POST", endpoint: "/homework/h1/submit", body: { answers: [] } });

    const pending = await pendingSubmissions();
    expect(pending.map((p) => p.endpoint)).toEqual(["/quizzes/q1/start", "/homework/h1/submit"]);
  });

  it("removes a submission by id", async () => {
    const id = await enqueueSubmission({ method: "POST", endpoint: "/quizzes/q1/submit", body: { answers: [] } });
    expect(id).not.toBeNull();
    await removeSubmission(id as string);
    expect(await pendingCount()).toBe(0);
  });
});

describe("cache-manager", () => {
  beforeEach(() => {
    __resetBackendForTests();
  });

  it("puts and gets entries", async () => {
    await cachePut("user:/lessons/l1", { title: "Lesson 1" });
    expect(await cacheGet("user:/lessons/l1")).toEqual({ title: "Lesson 1" });
    expect(await cacheGet("user:/missing")).toBeNull();
  });

  it("evicts least-recently-accessed entries first when over quota", async () => {
    __setCacheQuotaForTests(700);
    await cachePut("k:a", { payload: "x".repeat(250) });
    await cachePut("k:b", { payload: "y".repeat(250) });
    // Adding c pushes the total over quota → oldest (k:a) is evicted.
    await cachePut("k:c", { payload: "z".repeat(250) });

    expect(await cacheGet("k:a")).toBeNull();
    expect(await cacheGet("k:b")).not.toBeNull();
    expect(await cacheGet("k:c")).not.toBeNull();
  });

  it("never evicts pinned entries", async () => {
    __setCacheQuotaForTests(700);
    await cachePut("pin:lesson", { payload: "p".repeat(250) }, { pin: true });
    await cachePut("other:a", { payload: "a".repeat(250) });
    // Adding c pushes the total over quota → only the non-pinned oldest is evicted.
    await cachePut("other:b", { payload: "b".repeat(250) });

    expect(await cacheGet("pin:lesson")).not.toBeNull();
    expect(await cacheGet("other:a")).toBeNull();
    expect(await cacheGet("other:b")).not.toBeNull();
  });

  it("deletes keys by prefix for per-lesson invalidation", async () => {
    await cachePut("user:/lessons/l1", { title: "L1" });
    await cachePut("user:/lessons/l1/vocabulary", { groups: [] });
    await cachePut("user:/lessons/l2", { title: "L2" });

    await cacheDeleteWhereKeyStartsWith("user:/lessons/l1");

    expect(await cacheGet("user:/lessons/l1")).toBeNull();
    expect(await cacheGet("user:/lessons/l1/vocabulary")).toBeNull();
    expect(await cacheGet("user:/lessons/l2")).not.toBeNull();
  });
});

describe("sync-engine", () => {
  beforeEach(() => {
    __resetBackendForTests();
  });

  it("flushes queued submissions and reports counts", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:4000/api/v1";

    await enqueueSubmission({ method: "POST", endpoint: "/homework/h1/submit", body: { answers: [] } });
    await enqueueSubmission({ method: "PATCH", endpoint: "/videos/v1/progress", body: { currentPosition: 5 } });

    const result = await runSync();

    expect(result.synced).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.pending).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await pendingCount()).toBe(0);

    vi.unstubAllGlobals();
  });

  it("keeps failed submissions queued and stops on network errors", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:4000/api/v1";

    await enqueueSubmission({ method: "POST", endpoint: "/quizzes/q1/submit", body: { answers: [] } });
    await enqueueSubmission({ method: "POST", endpoint: "/homework/h1/submit", body: { answers: [] } });

    const result = await runSync();

    expect(result.synced).toBe(0);
    expect(result.failed).toBeGreaterThan(0);
    // First record (500) stays; second never attempted because we stop on network error.
    expect(await pendingCount()).toBeGreaterThan(0);

    vi.unstubAllGlobals();
  });
});
