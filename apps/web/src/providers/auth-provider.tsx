"use client";

import { createContext, useContext, useEffect, type ReactNode, useCallback } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api-client";

interface AuthContextValue {
  isAuthenticated: boolean;
  user: {
    id: string;
    fullName: string;
    mobileNumber: string;
    role: string;
    status: string;
  } | null;
  login: (mobile: string, password: string) => Promise<void>;
  register: (fullName: string, mobile: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const {
    accessToken,
    refreshToken,
    user,
    isAuthenticated,
    setAuth,
    setUser,
    logout: clearStore,
  } = useAuthStore();

  const fetchUser = useCallback(async (): Promise<void> => {
    try {
      const response = await api.get<{
        id: string;
        fullName: string;
        mobileNumber: string;
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

  useEffect(() => {
    if (accessToken && !user) {
      void fetchUser();
    }
  }, [accessToken, user, fetchUser]);

  const login = useCallback(
    async (mobile: string, password: string): Promise<void> => {
      const response = await api.post<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
      }>("/auth/login", { mobile, password });

      if (response.data) {
        setAuth(response.data.accessToken, response.data.refreshToken);
        await fetchUser();
      }
    },
    [setAuth, fetchUser],
  );

  const register = useCallback(
    async (
      fullName: string,
      mobile: string,
      password: string,
      confirmPassword: string,
    ): Promise<void> => {
      await api.post("/auth/register", {
        fullName,
        mobile,
        password,
        confirmPassword,
      });
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      if (accessToken) {
        await api.delete("/auth/logout");
      }
    } catch {
      // ignore errors on logout
    } finally {
      clearStore();
    }
  }, [accessToken, clearStore]);

  const refreshSession = useCallback(async (): Promise<void> => {
    if (!refreshToken) {
      clearStore();
      return;
    }

    try {
      const response = await api.post<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
      }>("/auth/refresh-token", { refreshToken });

      if (response.data) {
        setAuth(response.data.accessToken, response.data.refreshToken);
      }
    } catch {
      clearStore();
    }
  }, [refreshToken, setAuth, clearStore]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        login,
        register,
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
