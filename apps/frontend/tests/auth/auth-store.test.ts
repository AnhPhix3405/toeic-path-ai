import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "@/stores/auth.store";
import type { UserProfile } from "@/types/api";

describe("useAuthStore", () => {
  const mockUser: UserProfile = {
    id: "user-123",
    email: "student@toeicpath.ai",
    fullName: "Nguyễn Văn Học Viên",
    role: "student",
    createdAt: "2026-10-06T00:00:00.000Z",
  };

  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it("has correct initial state after clearAuth", () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.role).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("sets user and token when setAuth is called", () => {
    useAuthStore.getState().setAuth(mockUser, "mock-access-token-123");

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.token).toBe("mock-access-token-123");
    expect(state.role).toBe("student");
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it("updates user profile via setUser without altering token", () => {
    useAuthStore.getState().setAuth(mockUser, "mock-access-token-123");

    const updatedUser: UserProfile = {
      ...mockUser,
      fullName: "Nguyễn Văn Đã Đổi Tên",
      targetScore: 850,
    };

    useAuthStore.getState().setUser(updatedUser);

    const state = useAuthStore.getState();
    expect(state.user?.fullName).toBe("Nguyễn Văn Đã Đổi Tên");
    expect(state.user?.targetScore).toBe(850);
    expect(state.token).toBe("mock-access-token-123");
  });

  it("clears all authentication data on clearAuth", () => {
    useAuthStore.getState().setAuth(mockUser, "mock-access-token-123");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    useAuthStore.getState().clearAuth();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.role).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});
