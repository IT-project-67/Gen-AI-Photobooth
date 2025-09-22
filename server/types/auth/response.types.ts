import type { UserSession } from "~~/server/types/domain";

// Auth Response Types
export interface AuthResponse {
  session: UserSession | null;
  user: UserSession["user"] | null;
}

export type LoginResponse = AuthResponse;

export interface RegisterResponse extends AuthResponse {
  emailSent?: boolean;
  isRecovered?: boolean;
}

// Forgot Password Types
export interface ForgotPasswordResponse {
  message: string;
}

// Reset Password Types
export interface ResetPasswordResponse {
  message: string;
}
