// Auth Request Types
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
}

// Forgot Password Types
export interface ForgotPasswordRequest {
  email: string
}

// Reset Password Types
export interface ResetPasswordRequest {
  access_token: string
  refresh_token: string
  password: string
}