import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthStore, AuthState } from "@/types/auth";
import type { UserProfile } from "@/types/api";

function setAuthCookies(token: string, role: string) {
  if (typeof document !== "undefined") {
    // 7 days expiration
    const maxAge = 7 * 24 * 60 * 60;
    document.cookie = `auth_token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    document.cookie = `user_role=${encodeURIComponent(role)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }
}

function clearAuthCookies() {
  if (typeof document !== "undefined") {
    document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    document.cookie = "user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  }
}

const initialState: AuthState = {
  user: null,
  token: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,
  isInitialized: false,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      ...initialState,

      setAuth: (user: UserProfile, token: string) => {
        setAuthCookies(token, user.role);
        set({
          user,
          token,
          role: user.role,
          isAuthenticated: true,
          isLoading: false,
          isInitialized: true,
        });
      },

      setUser: (user: UserProfile) => {
        if (typeof document !== "undefined") {
          document.cookie = `user_role=${encodeURIComponent(user.role)}; path=/; max-age=604800; SameSite=Lax`;
        }
        set({
          user,
          role: user.role,
        });
      },

      setToken: (token: string) => {
        set({ token });
      },

      clearAuth: () => {
        clearAuthCookies();
        set({
          user: null,
          token: null,
          role: null,
          isAuthenticated: false,
          isLoading: false,
          isInitialized: true,
        });
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },

      setInitialized: (isInitialized: boolean) => {
        set({ isInitialized });
      },
    }),
    {
      name: "toeic-path-auth-storage",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      })),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
