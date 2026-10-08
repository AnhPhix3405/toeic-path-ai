export type UserRole = "student" | "teacher" | "admin" | "guest";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
  statusCode: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedData<T> {
  items: T[];
  meta: PaginationMeta;
}

export type PaginatedResponse<T> = ApiResponse<PaginatedData<T>>;

export interface ApiError {
  message: string;
  statusCode: number;
  errorCode?: string;
  details?: Record<string, string[]> | unknown;
  timestamp?: string;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  targetScore?: number;
  createdAt: string;
}

export interface HealthStatusResponse {
  status: "ok" | "error";
  uptime: number;
  version: string;
  timestamp: string;
  services?: {
    database?: "connected" | "disconnected";
    redis?: "connected" | "disconnected";
  };
}

export type Gender = "male" | "female" | "other";

export interface PersonalProfile {
  fullName: string;
  avatarUrl: string | null;
  birthday: string | null;
  gender: Gender | null;
  bio: string | null;
}

export interface ProfileResponse {
  userId: string;
  email: string;
  role: UserRole;
  profile: PersonalProfile;
  updatedAt: string;
}

export interface UpdateMyProfileDto {
  fullName?: string;
  birthday?: string | null;
  gender?: Gender | null;
  bio?: string | null;
}
