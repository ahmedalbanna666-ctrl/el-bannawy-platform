"use client";

import { createContext, useContext, useEffect, useCallback, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api-client";
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
      clearStore();
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
      });

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
      await api.post<{ userId: string }>("/auth/confirm-login", { confirmToken });
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
      const response = await api.post<{ verified: boolean }>("/auth/verify-email", { email, code });
      if (!response.data?.verified) {
        throw new Error("Verification failed");
      }
    },
    [],
  );

  const resendVerification = useCallback(
    async (email: string): Promise<void> => {
      const response = await api.post<{ sent: boolean }>("/auth/resend-verification", { email });
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
      const response = await api.post<{ userId: string }>("/auth/firebase-login", { idToken, rememberMe });
      if (!response.data) {
        throw new Error("Login failed");
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
      await api.post("/auth/logout");
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
