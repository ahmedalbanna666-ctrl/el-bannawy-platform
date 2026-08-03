import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "./auth-store";

describe("auth-store", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isInitialized: false,
    });
  });

  it("starts unauthenticated", () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.isInitialized).toBe(false);
  });

  it("setUser sets user and marks authenticated", () => {
    useAuthStore.getState().setUser({
      id: "user-1",
      fullName: "Test User",
      mobileNumber: "01000000000",
      role: "STUDENT",
      status: "ACTIVE",
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.fullName).toBe("Test User");
    expect(state.user?.role).toBe("STUDENT");
  });

  it("setInitialized marks initialization complete", () => {
    expect(useAuthStore.getState().isInitialized).toBe(false);
    useAuthStore.getState().setInitialized();
    expect(useAuthStore.getState().isInitialized).toBe(true);
  });

  it("logout clears user and marks not authenticated", () => {
    useAuthStore.getState().setUser({
      id: "user-1",
      fullName: "Test User",
      mobileNumber: null,
      role: "TEACHER",
      status: "ACTIVE",
    });

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.isInitialized).toBe(true);
  });

  it("setUser stores effectivePermissions", () => {
    useAuthStore.getState().setUser({
      id: "user-1",
      fullName: "Admin",
      mobileNumber: null,
      role: "ADMINISTRATOR",
      status: "ACTIVE",
      effectivePermissions: ["users.view", "users.edit"],
    });

    const state = useAuthStore.getState();
    expect(state.user?.effectivePermissions).toEqual(["users.view", "users.edit"]);
  });

  it("logout clears effectivePermissions", () => {
    useAuthStore.getState().setUser({
      id: "user-1",
      fullName: "Admin",
      mobileNumber: null,
      role: "ADMINISTRATOR",
      status: "ACTIVE",
      effectivePermissions: ["users.view"],
    });

    useAuthStore.getState().logout();
    expect(useAuthStore.getState().user?.effectivePermissions).toBeUndefined();
  });
});
