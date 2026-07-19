import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Permission, UserRole } from "@el-bannawy/shared";

interface AuthUser {
  id: string;
  fullName: string;
  mobileNumber: string | null;
  role: UserRole;
  status: string;
  effectivePermissions?: Permission[];
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setAuth: (accessToken: string, refreshToken: string) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
}

/** Safe accessor that returns null on the server. */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return useAuthStore.getState().accessToken;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      setAuth: (accessToken: string, refreshToken: string): void => {
        set({ accessToken, refreshToken, isAuthenticated: true });
      },
      setUser: (user: AuthUser): void => {
        set({ user });
      },
      logout: (): void => {
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: "el-bannawy-auth",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
