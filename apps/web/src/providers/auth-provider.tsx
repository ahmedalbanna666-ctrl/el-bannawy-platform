"use client";

import { createContext, useContext, useEffect, useCallback, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth-store";
import { api, ApiError } from "@/lib/api-client";
import type { Permission, UserRole } from "@el-bannawy/shared";

interface AuthContextValue {
  isAuthenticated: boolean;
  isInitialized: boolean;
  user: {
    id: string;
    fullName: string;
    mobileNumber: string | null;
    role: string;
    status: string;
    effectivePermissions?: Permission[];
  } | null;
  login: (mobile: string, password: string, rememberMe?: boolean) => Promise<void>;
  confirmLogin: (confirmToken: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<{ userId: string; requiresEmailVerification: boolean }>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  firebaseLogin: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  oauthRegister: (payload: OAuthRegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

interface RegisterPayload {
  fullName: string;
  englishName?: string;
  email: string;
  mobile?: string;
  parentMobile?: string;
  password: string;
  confirmPassword: string;
  governorate?: string;
  school?: string;
  educationalSystem?: string;
  educationalStage?: string;
  grade?: string;
  referralCode?: string;
  firebaseIdToken?: string;
}

interface OAuthRegisterPayload {
  email: string;
  fullName: string;
  englishName?: string;
  mobile?: string;
  parentMobile?: string;
  password?: string;
  governorate?: string;
  school?: string;
  educationalSystem?: string;
  educationalStage?: string;
  grade?: string;
  referralCode?: string;
}

export class DeviceConfirmationError extends Error {
  confirmToken: string;
  constructor(confirmToken: string) {
    super("Device confirmation required");
    this.name = "DeviceConfirmationError";
    this.confirmToken = confirmToken;
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const { user, isAuthenticated, isInitialized, setUser, setInitialized, logout: clearStore } = useAuthStore();

  const queryClient = useQueryClient();

  // Global handler: any API 401 that also fails to refresh (e.g. the session was
  // superseded by a login on another device) clears the auth state and returns
  // the user to the login page.
  useEffect(() => {
    const onSessionExpired = (): void => {
      clearStore();
      queryClient.clear();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    };
    window.addEventListener("elbannawy:session-expired", onSessionExpired);
    return (): void => {
      window.removeEventListener("elbannawy:session-expired", onSessionExpired);
    };
  }, [clearStore, queryClient]);

  // When the tab regains focus, re-validate the session so a device whose
  // session was superseded by another login is sent back to /login promptly.
  useEffect(() => {
    const onFocus = (): void => {
      if (!isAuthenticated) return;
      void api.get("/auth/me").catch(() => {
        // 401 → the api-client dispatches "elbannawy:session-expired" → logout + redirect
      });
    };
    window.addEventListener("focus", onFocus);
    return (): void => {
      window.removeEventListener("focus", onFocus);
    };
  }, [isAuthenticated]);

  const fetchUser = useCallback(async (): Promise<void> => {
    try {
      const response = await api.get<{
        id: string;
        fullName: string;
        mobileNumber: string | null;
        role: UserRole;
        status: string;
        effectivePermissions: string[];
      }>("/auth/me");
      if (response.data) {
        setUser({
          ...response.data,
          effectivePermissions: response.data.effectivePermissions as Permission[],
        });
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.warn("[Auth] fetchUser failed:", err);
      const isAuthFailure = err instanceof ApiError && err.status === 401;
      clearStore();
      // A 401 here means the session (access + refresh) is gone. Clear the
      // httpOnly cookies via a best-effort logout call, then send the user to
      // the login page so they are not stuck showing repeated 401s.
      if (isAuthFailure && typeof window !== "undefined") {
        try {
          await api.post("/auth/logout", undefined, { skipAuthRetry: true });
        } catch {
          // ignore
        }
        if (window.location.pathname !== "/login") {
          window.location.assign("/login");
        }
      }
    } finally {
      setInitialized();
    }
  }, [setUser, clearStore, setInitialized]);

  useEffect(() => {
    if (!user && !isInitialized) {
      void fetchUser();
    } else if (user) {
      setInitialized();
    }
  }, [user, fetchUser, isInitialized, setInitialized]);

  const login = useCallback(
    async (mobile: string, password: string, rememberMe = false): Promise<void> => {
      const response = await api.post<{ userId: string } | { requiresConfirmation: boolean; confirmToken: string }>("/auth/login", {
        identity: mobile,
        password,
        rememberMe,
      }, { skipAuthRetry: true });

      if (!response.data) {
        throw new Error("Login failed");
      }

      if ("requiresConfirmation" in response.data && response.data.requiresConfirmation) {
        const confirmToken = (response.data as { confirmToken: string }).confirmToken;
        throw new DeviceConfirmationError(confirmToken);
      }

      await fetchUser();
      queryClient.removeQueries({ queryKey: ["profile"] });
      queryClient.removeQueries({ queryKey: ["sidebar-profile"] });
    },
    [fetchUser, queryClient],
  );

  const confirmLogin = useCallback(
    async (confirmToken: string): Promise<void> => {
      await api.post<{ userId: string }>("/auth/confirm-login", { confirmToken }, { skipAuthRetry: true });
      await fetchUser();
      queryClient.removeQueries({ queryKey: ["profile"] });
      queryClient.removeQueries({ queryKey: ["sidebar-profile"] });
    },
    [fetchUser, queryClient],
  );

  const register = useCallback(
    async (payload: RegisterPayload): Promise<{ userId: string; requiresEmailVerification: boolean }> => {
      const response = await api.post<{ userId: string; requiresEmailVerification: boolean }>(
        "/auth/register",
        payload,
        { skipAuthRetry: true },
      );

      if (!response.data) {
        throw new Error("Registration failed");
      }

      if (!response.data.requiresEmailVerification) {
        await fetchUser();
        queryClient.removeQueries({ queryKey: ["profile"] });
        queryClient.removeQueries({ queryKey: ["sidebar-profile"] });
      }

      return response.data;
    },
    [fetchUser, queryClient],
  );

  const verifyEmail = useCallback(
    async (email: string, code: string): Promise<void> => {
      const response = await api.post<{ verified: boolean }>("/auth/verify-email", { email, code }, { skipAuthRetry: true });
      if (!response.data?.verified) {
        throw new Error("Verification failed");
      }
    },
    [],
  );

  const resendVerification = useCallback(
    async (email: string): Promise<void> => {
      const response = await api.post<{ sent: boolean }>("/auth/resend-verification", { email }, { skipAuthRetry: true });
      if (!response.data?.sent) {
        throw new Error("No pending verification");
      }
    },
    [],
  );

  const firebaseLogin = useCallback(
    async (email: string, password: string, rememberMe = false): Promise<void> => {
      const { signInFirebaseUser } = await import("@/lib/firebase-auth");
      const idToken = await signInFirebaseUser(email, password);
      if (!idToken) {
        // Firebase Auth is not configured (or the account is not linked in
        // Firebase) — fall back to the platform's own credentials (JWT) so
        // email login keeps working. Once Firebase credentials are added,
        // the Firebase path is used automatically.
        await login(email, password, rememberMe);
        return;
      }
      try {
        const response = await api.post<{ userId: string }>("/auth/firebase-login", { idToken, rememberMe }, { skipAuthRetry: true });
        if (!response.data) {
          throw new Error("Login failed");
        }
      } catch {
        // The backend rejected the Firebase ID token (e.g. Firebase Admin is
        // not configured server-side, or the account was not linked). Fall
        // back to the platform's own credentials so email login still works.
        await login(email, password, rememberMe);
        return;
      }
      await fetchUser();
      queryClient.removeQueries({ queryKey: ["profile"] });
      queryClient.removeQueries({ queryKey: ["sidebar-profile"] });
    },
    [fetchUser, queryClient, login],
  );

  const oauthRegister = useCallback(
    async (payload: OAuthRegisterPayload): Promise<void> => {
      const response = await api.post<{ userId: string }>(
        "/auth/complete-oauth-registration",
        payload,
        { skipAuthRetry: true },
      );

      if (response.data) {
        await fetchUser();
        queryClient.removeQueries({ queryKey: ["profile"] });
        queryClient.removeQueries({ queryKey: ["sidebar-profile"] });
      }
    },
    [fetchUser, queryClient],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await api.post("/auth/logout", undefined, { skipAuthRetry: true });
    } catch {
      // ignore errors on logout
    } finally {
      clearStore();
      queryClient.clear();
    }
  }, [clearStore, queryClient]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isInitialized,
        user,
        login,
        confirmLogin,
        register,
        verifyEmail,
        resendVerification,
        firebaseLogin,
        oauthRegister,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
