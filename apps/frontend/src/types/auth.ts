import type { UserProfile, UserRole, AuthTokens } from "./api";

export interface LoginDto {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterDto {
  email: string;
  password: string;
  fullName: string;
  targetScore?: number;
}

export interface AuthResponseData {
  user: UserProfile;
  tokens: AuthTokens;
}

export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface AuthState {
  user: UserProfile | null;
  token: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
}

export interface AuthActions {
  setAuth: (user: UserProfile, token: string) => void;
  setUser: (user: UserProfile) => void;
  setToken: (token: string) => void;
  clearAuth: () => void;
  setLoading: (isLoading: boolean) => void;
  setInitialized: (isInitialized: boolean) => void;
}

export type AuthStore = AuthState & AuthActions;
