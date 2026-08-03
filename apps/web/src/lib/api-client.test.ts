import { describe, it, expect, vi, beforeEach } from "vitest";
import { api, ApiError } from "./api-client";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const BASE_URL = "http://localhost:4000/api/v1";

function createMockResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(data),
    headers: new Headers({ "content-type": "application/json" }),
  } as Response;
}

describe("api-client", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    process.env.NEXT_PUBLIC_API_URL = BASE_URL;
  });

  it("get makes GET request with correct headers", async () => {
    mockFetch.mockResolvedValue(createMockResponse({ success: true, data: { id: "1" } }));

    const result = await api.get<{ id: string }>("/test");

    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE_URL}/test`,
      expect.objectContaining({
        method: "GET",
        credentials: "include",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        }),
      }),
    );
    expect(result.data?.id).toBe("1");
  });

  it("post sends JSON body", async () => {
    mockFetch.mockResolvedValue(createMockResponse({ success: true, data: null }));
    const body = { name: "test" };

    await api.post("/test", body);

    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE_URL}/test`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(body),
      }),
    );
  });

  it("throws ApiError on non-ok response", async () => {
    mockFetch.mockResolvedValue(
      createMockResponse({ message: "Not found" }, 404),
    );

    await expect(api.get("/test")).rejects.toThrow(ApiError);
    await expect(api.get("/test")).rejects.toThrow("Not found");
  });

  it("handles 204 no content", async () => {
    const noContentRes = {
      ok: true,
      status: 204,
      json: () => Promise.reject(new Error("No body")),
      headers: new Headers(),
    } as unknown as Response;
    mockFetch.mockResolvedValue(noContentRes);

    const result = await api.delete("/test");
    expect(result.success).toBe(true);
  });

  it("handles network error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    await expect(api.get("/test")).rejects.toThrow("Network error");
  });

  it("put sends PUT request with body", async () => {
    mockFetch.mockResolvedValue(createMockResponse({ success: true }));
    const body = { key: "value" };

    await api.put("/test/1", body);

    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE_URL}/test/1`,
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify(body),
      }),
    );
  });

  it("patch sends PATCH request with body", async () => {
    mockFetch.mockResolvedValue(createMockResponse({ success: true }));

    await api.patch("/test/1", { field: "updated" });

    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE_URL}/test/1`,
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("delete sends DELETE request", async () => {
    const noContentRes = {
      ok: true,
      status: 204,
      json: () => Promise.reject(new Error("No body")),
      headers: new Headers(),
    } as unknown as Response;
    mockFetch.mockResolvedValue(noContentRes);

    await api.delete("/test/1");

    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE_URL}/test/1`,
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("includes signal when provided in opts", async () => {
    mockFetch.mockResolvedValue(createMockResponse({ success: true }));
    const controller = new AbortController();

    await api.get("/test", { signal: controller.signal });

    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE_URL}/test`,
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });
});
