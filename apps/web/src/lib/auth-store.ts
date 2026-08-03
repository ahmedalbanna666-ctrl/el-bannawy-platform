import { create } from "zustand";
import type { Permission, UserRole } from "@el-bannawy/shared";

interface AuthUser {
  id: string;
  fullName: string;
  mobileNumber: string | null;
  role: UserRole;
  status: string;
  gradeId?: string | null;
  educationalSystem?: string | null;
  effectivePermissions?: Permission[];
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setUser: (user: AuthUser) => void;
  setInitialized: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  setUser: (user: AuthUser): void => {
    set({ user, isAuthenticated: true });
  },
  setInitialized: (): void => {
    set({ isInitialized: true });
  },
  logout: (): void => {
    set({ user: null, isAuthenticated: false, isInitialized: true });
  },
}));
