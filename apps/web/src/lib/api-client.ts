import {
  initOfflineEngine,
  offlineGetFromCache,
  offlineCacheResponse,
  offlineEnqueueSubmission,
  offlineInvalidateAfterMutation,
  offlineAfterLessonGet,
} from "@/lib/offline/integration";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "http://localhost:4000/api/v1";
const DEFAULT_TIMEOUT = 30_000;

export interface RequestOptions {
  signal?: AbortSignal;
  timeout?: number;
  skipAuthRetry?: boolean;
}

export interface ApiResponse<T, M = unknown> {
  success: boolean;
  data?: T;
  meta?: M;
  message?: string;
}

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;
let failedQueue: {
  resolve: (value: boolean) => void;
  reject: (err: unknown) => void;
}[] = [];

function processQueue(success: boolean): void {
  for (const { resolve, reject } of failedQueue) {
    if (success) resolve(true);
    else reject(new Error("Token refresh failed"));
  }
  failedQueue = [];
}

async function attemptTokenRefresh(): Promise<boolean> {
  if (isRefreshing && refreshPromise) return refreshPromise;

  isRefreshing = true;
  refreshPromise = (async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
        method: "POST",
        credentials: "include",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
      const success = res.ok;
      processQueue(success);
      return success;
    } catch {
      processQueue(false);
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Offline fallback: serve cacheable GETs from the lesson cache, and queue
 * supported mutations for background sync. Fire-and-forget autosave calls
 * get a synthetic success; blocking submissions throw a friendly error so the
 * UI keeps the student's answers (they are synced automatically later).
 */
async function handleOffline<T>(
  endpoint: string,
  method: string,
  body: unknown,
): Promise<ApiResponse<T> | null> {
  if (method === "GET") {
    const cached = await offlineGetFromCache(endpoint);
    if (cached) return cached as ApiResponse<T>;
    return null;
  }
  const result = await offlineEnqueueSubmission({ method, endpoint, body });
  if (result?.queued) {
    if (result.fireAndForget) return { success: true };
    throw new ApiError(
      "أنت غير متصل بالإنترنت. تم حفظ بياناتك وستُرسل تلقائياً عند عودة الاتصال.",
      0,
    );
  }
  return null;
}

async function request<T>(
  endpoint: string,
  options: RequestInit & RequestOptions = {},
  retries = 1,
): Promise<ApiResponse<T>> {
  const { signal, timeout = DEFAULT_TIMEOUT, skipAuthRetry = false, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
    ...(fetchOptions.headers as Record<string, string> | undefined),
  };

  const url = `${API_BASE_URL}${endpoint}`;
  const method = (fetchOptions.method ?? "GET").toUpperCase();

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const combinedSignal = signal
      ? anySignal([controller.signal, signal])
      : controller.signal;
    const timeoutId = setTimeout(() => { controller.abort(); }, timeout);
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        credentials: "include",
        signal: combinedSignal,
      });

      clearTimeout(timeoutId);

      if (response.status === 401) {
        const message = await extractErrorMessage(response);
        if (skipAuthRetry) {
          throw new ApiError(message, 401);
        }
        const refreshed = await attemptTokenRefresh();
        if (refreshed) {
          return await request<T>(endpoint, {
            ...fetchOptions,
            signal,
            timeout,
            skipAuthRetry: true,
          });
        }
        // Session is gone (e.g. superseded by a login on another device) —
        // notify the app so it can log out and send the user to /login.
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("elbannawy:session-expired"));
        }
        throw new ApiError(message || "Session expired", 401);
      }

      if (response.status === 204) {
        return { success: true };
      }

      const data: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof data === "object" && data !== null && "message" in data
            ? String(data.message)
            : "An error occurred";
        throw new ApiError(message, response.status);
      }

      if (typeof data !== "object" || data === null) {
        throw new ApiError("Invalid response format: expected object", response.status);
      }

      const safe = data as Partial<ApiResponse<unknown>>;
      if (typeof safe.success !== "boolean") {
        safe.success = response.ok;
      }

      if (method === "GET") {
        void offlineCacheResponse(endpoint, data);
        void offlineAfterLessonGet(endpoint);
      } else {
        void offlineInvalidateAfterMutation(endpoint);
      }

      return data as ApiResponse<T>;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof DOMException && err.name === "AbortError") {
        if (signal?.aborted) throw err;
        if (method === "GET") {
          const cached = await offlineGetFromCache(endpoint);
          if (cached) return cached as ApiResponse<T>;
        }
        if (attempt < retries) continue;
        throw new ApiError("انتهت مهلة الطلب. تأكد من اتصالك وحاول مرة أخرى", 408);
      }
      if (
        attempt < retries &&
        err instanceof TypeError &&
        err.message === "Failed to fetch"
      ) {
        const handled = await handleOffline<T>(endpoint, method, fetchOptions.body);
        if (handled) return handled;
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      throw err;
    }
  }
  throw new ApiError("Backend unreachable", 503);
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json();
    if (typeof data === "object" && data !== null && "message" in data) {
      return String(data.message);
    }
  } catch {
    // Response body is not JSON — fall through to a generic message.
  }
  return "Session expired";
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      return controller.signal;
    }
    signal.addEventListener("abort", () => { controller.abort(); }, { once: true });
  }
  return controller.signal;
}

export const api = {
  get: <T>(endpoint: string, opts?: RequestOptions): Promise<ApiResponse<T>> =>
    request<T>(endpoint, { method: "GET", ...opts }),
  post: <T>(endpoint: string, body?: unknown, opts?: RequestOptions): Promise<ApiResponse<T>> =>
    request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      ...opts,
    }),
  put: <T>(endpoint: string, body?: unknown, opts?: RequestOptions): Promise<ApiResponse<T>> =>
    request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
      ...opts,
    }),
  patch: <T>(endpoint: string, body?: unknown, opts?: RequestOptions): Promise<ApiResponse<T>> =>
    request<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
      ...opts,
    }),
  delete: <T>(endpoint: string, opts?: RequestOptions): Promise<ApiResponse<T>> =>
    request<T>(endpoint, { method: "DELETE", ...opts }),
};

export { ApiError };

// Attach the offline/sync engine once (idempotent; no-op on SSR).
initOfflineEngine();
