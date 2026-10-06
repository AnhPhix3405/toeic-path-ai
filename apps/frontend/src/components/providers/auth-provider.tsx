"use client";

import * as React from "react";
import { useAuthStore } from "@/stores/auth.store";
import { authService } from "@/services/auth.service";

export interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const setInitialized = useAuthStore((state) => state.setInitialized);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setUser = useAuthStore((state) => state.setUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  React.useEffect(() => {
    let isMounted = true;

    async function initAuthSession() {
      const currentToken = useAuthStore.getState().token;

      if (currentToken) {
        try {
          const profile = await authService.getProfile();
          if (isMounted) {
            setUser(profile);
          }
        } catch {
          if (isMounted) {
            clearAuth();
          }
        }
      }

      if (isMounted) {
        setInitialized(true);
        setLoading(false);
      }
    }

    if (!isInitialized) {
      initAuthSession();
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [isInitialized, setInitialized, setLoading, setUser, clearAuth]);

  return <>{children}</>;
}
