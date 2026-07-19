import { getAccessToken, useAuthStore } from "./auth-store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
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

// Guards against concurrent refresh attempts across multiple requests.
let refreshPromise: Promise<boolean> | null = null;

async function attemptTokenRefresh(): Promise<boolean> {
  // If a refresh is already in-flight, wait for it.
  if (refreshPromise) {
    return refreshPromise;
  }

  const store = useAuthStore.getState();
  if (!store.refreshToken) {
    store.logout();
    return Promise.resolve(false);
  }

  refreshPromise = (async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: store.refreshToken }),
      });

      if (!response.ok) {
        useAuthStore.getState().logout();
        return false;
      }

      const data: ApiResponse<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
      }> = (await response.json()) as ApiResponse<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
      }>;

      if (data.data) {
        useAuthStore.getState().setAuth(data.data.accessToken, data.data.refreshToken);
        // Keep the middleware cookie in sync so hard navigation still works.
        document.cookie = `auth_token=${data.data.accessToken}; path=/; max-age=${String(data.data.expiresIn)}; SameSite=Lax`;
        return true;
      }

      useAuthStore.getState().logout();
      return false;
    } catch {
      useAuthStore.getState().logout();
      return false;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function doFetch(
  url: string,
  options: RequestInit,
  headers: Record<string, string>,
): Promise<Response> {
  return fetch(url, { ...options, headers });
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  let response = await doFetch(url, options, headers);

  // Auto-refresh on 401 and retry once
  if (response.status === 401) {
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      const newStore = useAuthStore.getState();
      if (newStore.accessToken) {
        headers.Authorization = `Bearer ${newStore.accessToken}`;
      }
      response = await doFetch(url, options, headers);
    } else {
      throw new ApiError("Session expired. Please log in again.", 401);
    }
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

  return data as ApiResponse<T>;
}

export const api = {
  get: <T>(endpoint: string): Promise<ApiResponse<T>> => request<T>(endpoint),
  post: <T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> =>
    request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> =>
    request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> =>
    request<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(endpoint: string): Promise<ApiResponse<T>> =>
    request<T>(endpoint, { method: "DELETE" }),
};

export { ApiError };
