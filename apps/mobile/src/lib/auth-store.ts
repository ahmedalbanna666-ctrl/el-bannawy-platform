import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const API_BASE = "http://10.0.2.2:4000/api/v1";

interface User {
  id: string;
  fullName: string;
  mobileNumber: string;
  role: string;
  isActive: boolean;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (mobile: string, password: string) => Promise<void>;
  register: (data: { fullName: string; mobile: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,

      login: async (mobile, password) => {
        const response = await fetch(`${API_BASE}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mobile, password }),
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.message ?? "Login failed");

        set({
          accessToken: json.data.accessToken,
          refreshToken: json.data.refreshToken,
          user: json.data.user,
          isAuthenticated: true,
        });
      },

      register: async (data) => {
        const response = await fetch(`${API_BASE}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.message ?? "Registration failed");
      },

      logout: () => {
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        });
      },

      refreshSession: async () => {
        const { refreshToken } = get();
        if (!refreshToken) throw new Error("No refresh token");

        const response = await fetch(`${API_BASE}/auth/refresh-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.message ?? "Token refresh failed");

        set({
          accessToken: json.data.accessToken,
          refreshToken: json.data.refreshToken,
        });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
