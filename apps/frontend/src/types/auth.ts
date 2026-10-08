import type { UserProfile, UserRole, AuthTokens } from "./api";

export interface LoginDto {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterDto {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface MessageResponseDto {
  message: string;
}

export interface RegisterResponseData {
  id: string;
  email: string;
  role: UserRole;
  status: string;
  profile: {
    fullName: string;
    avatarUrl: string | null;
    bio: string | null;
  };
  createdAt: string;
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
