import type { UserSession } from "./user";

// Auth Request Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

// Auth Response Types
export interface AuthResponse {
  session: UserSession | null;
  user: UserSession["user"] | null;
}

export type LoginResponse = AuthResponse;

export interface RegisterResponse extends AuthResponse {
  emailSent?: boolean;
}
