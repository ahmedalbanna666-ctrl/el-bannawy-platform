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

interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  oauthTokens: OAuthTokens | null;
  setUser: (user: AuthUser) => void;
  setInitialized: () => void;
  setOAuthTokens: (tokens: OAuthTokens) => void;
  getOAuthAccessToken: () => string | null;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  oauthTokens: null,
  setUser: (user: AuthUser): void => {
    set({ user, isAuthenticated: true });
  },
  setInitialized: (): void => {
    set({ isInitialized: true });
  },
  setOAuthTokens: (tokens: OAuthTokens): void => {
    set({ oauthTokens: tokens });
  },
  getOAuthAccessToken: (): string | null => {
    const { oauthTokens } = get();
    if (!oauthTokens) return null;
    if (Date.now() / 1000 > oauthTokens.expiresAt) return null;
    return oauthTokens.accessToken;
  },
  logout: (): void => {
    set({ user: null, isAuthenticated: false, isInitialized: true, oauthTokens: null });
  },
}));
