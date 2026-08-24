import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { assessPronunciation } from "./pronunciation-api";
import type { PronunciationAssessResponse } from "./pronunciation-types";

function mockFetchOnce(body: unknown, status = 200): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, _opts: unknown) => {
      return {
        status,
        ok: status >= 200 && status < 300,
        json: async () => body,
      } as Response;
    }),
  );
}

describe("assessPronunciation", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("posts a multipart form and returns the parsed assessment", async () => {
    const assessment: PronunciationAssessResponse = {
      id: "attempt-1",
      overallScore: 88,
      accuracy: 90,
      fluency: 80,
      prosody: 85,
      completeness: 100,
      transcript: "hello",
      engine: "gopt",
      words: [],
      phonemes: [],
    };
    mockFetchOnce({ success: true, data: assessment });

    const blob = new Blob(["RIFF"], { type: "audio/wav" });
    const result = await assessPronunciation(blob, "hello");

    expect(result.id).toBe("attempt-1");
    expect(result.overallScore).toBe(88);

    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/pronunciation/assess");
    expect(opts.method).toBe("POST");
    expect(opts.body).toBeInstanceOf(FormData);
    const form = opts.body as FormData;
    expect(form.get("expected_text")).toBe("hello");
    expect(form.has("audio")).toBe(true);
  });

  it("throws a friendly error when the engine returns 400", async () => {
    mockFetchOnce({ message: "النص المتوقع مطلوب" }, 400);
    const blob = new Blob(["RIFF"], { type: "audio/wav" });
    await expect(assessPronunciation(blob, "")).rejects.toThrow(
      "النص المتوقع مطلوب",
    );
  });
});
