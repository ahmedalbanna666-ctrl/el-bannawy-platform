import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthUser {
  id: string;
  fullName: string;
  mobileNumber: string | null;
  role: string;
  status: string;
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

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      setAuth: (accessToken: string, refreshToken: string): void => {
        set({ accessToken, refreshToken, isAuthenticated: true });
        try {
          localStorage.setItem("accessToken", accessToken);
        } catch {
          // SSR guard
        }
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
        try {
          localStorage.removeItem("accessToken");
        } catch {
          // SSR guard
        }
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
