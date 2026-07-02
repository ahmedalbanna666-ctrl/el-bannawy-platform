"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api-client";

interface AuthContextValue {
  isAuthenticated: boolean;
  user: {
    id: string;
    fullName: string;
    mobileNumber: string | null;
    role: string;
    status: string;
  } | null;
  login: (mobile: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  oauthRegister: (payload: OAuthRegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

interface RegisterPayload {
  fullName: string;
  englishName?: string;
  mobile: string;
  parentMobile?: string;
  password: string;
  confirmPassword: string;
  governorate?: string;
  school?: string;
  educationalSystem?: string;
  educationalStage?: string;
  grade?: string;
  academicTerm?: string;
}

interface OAuthRegisterPayload {
  email: string;
  fullName: string;
  englishName?: string;
  mobile: string;
  parentMobile?: string;
  password?: string;
  governorate?: string;
  school?: string;
  educationalSystem?: string;
  educationalStage?: string;
  grade?: string;
  academicTerm?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const {
    accessToken,
    refreshToken: storedRefreshToken,
    user,
    isAuthenticated,
    setAuth,
    setUser,
    logout: clearStore,
  } = useAuthStore();

  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const fetchUser = useCallback(async (): Promise<void> => {
    try {
      const response = await api.get<{
        id: string;
        fullName: string;
        mobileNumber: string | null;
        role: string;
        status: string;
      }>("/auth/me");
      if (response.data) {
        setUser(response.data);
      }
    } catch {
      clearStore();
    }
  }, [setUser, clearStore]);

  const oauthProcessed = useRef(false);

  useEffect(() => {
    if (oauthProcessed.current) return;
    oauthProcessed.current = true;

    const urlToken = searchParams.get("token");
    const urlRefreshToken = searchParams.get("refreshToken");
    const urlExpiresIn = searchParams.get("expiresIn");

    if (urlToken && urlRefreshToken) {
      const expiresIn = Number(urlExpiresIn) || 3600;
      setAuth(urlToken, urlRefreshToken);
      document.cookie = `auth_token=${urlToken}; path=/; max-age=${String(expiresIn)}; SameSite=Lax`;
      void fetchUser();
      queryClient.removeQueries({ queryKey: ["profile"] });
      queryClient.removeQueries({ queryKey: ["sidebar-profile"] });
    }
  }, [searchParams, setAuth, fetchUser, queryClient]);

  useEffect(() => {
    if (accessToken && !user) {
      void fetchUser();
    }
  }, [accessToken, user, fetchUser]);

  const login = useCallback(
    async (mobile: string, password: string, rememberMe = false): Promise<void> => {
      const response = await api.post<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
      }>("/auth/login", { mobile, password, rememberMe });

      if (response.data) {
        setAuth(response.data.accessToken, response.data.refreshToken);
        document.cookie = `auth_token=${response.data.accessToken}; path=/; max-age=${String(response.data.expiresIn)}; SameSite=Lax`;
        await fetchUser();
        queryClient.removeQueries({ queryKey: ["profile"] });
        queryClient.removeQueries({ queryKey: ["sidebar-profile"] });
      }
    },
    [setAuth, fetchUser, queryClient],
  );

  const register = useCallback(
    async (payload: RegisterPayload): Promise<void> => {
      const response = await api.post<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
      }>("/auth/register", payload);

      if (response.data) {
        setAuth(response.data.accessToken, response.data.refreshToken);
        document.cookie = `auth_token=${response.data.accessToken}; path=/; max-age=${String(response.data.expiresIn)}; SameSite=Lax`;
        await fetchUser();
        queryClient.removeQueries({ queryKey: ["profile"] });
        queryClient.removeQueries({ queryKey: ["sidebar-profile"] });
      }
    },
    [setAuth, fetchUser, queryClient],
  );

  const oauthRegister = useCallback(
    async (payload: OAuthRegisterPayload): Promise<void> => {
      const response = await api.post<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
      }>("/auth/complete-oauth-registration", payload);

      if (response.data) {
        setAuth(response.data.accessToken, response.data.refreshToken);
        document.cookie = `auth_token=${response.data.accessToken}; path=/; max-age=${String(response.data.expiresIn)}; SameSite=Lax`;
        await fetchUser();
        queryClient.removeQueries({ queryKey: ["profile"] });
        queryClient.removeQueries({ queryKey: ["sidebar-profile"] });
      }
    },
    [setAuth, fetchUser, queryClient],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      if (accessToken) {
        await api.post("/auth/logout");
      }
    } catch {
      // ignore errors on logout
    } finally {
      clearStore();
      document.cookie = "auth_token=; path=/; max-age=0";
      queryClient.clear();
    }
  }, [accessToken, clearStore, queryClient]);

  const refreshSession = useCallback(async (): Promise<void> => {
    if (!storedRefreshToken) {
      clearStore();
      return;
    }

    try {
      const response = await api.post<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
      }>("/auth/refresh-token", { refreshToken: storedRefreshToken });

      if (response.data) {
        setAuth(response.data.accessToken, response.data.refreshToken);
        document.cookie = `auth_token=${response.data.accessToken}; path=/; max-age=${String(response.data.expiresIn)}; SameSite=Lax`;
      }
    } catch {
      clearStore();
    }
  }, [storedRefreshToken, setAuth, clearStore]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        login,
        register,
        oauthRegister,
        logout,
        refreshSession,
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
