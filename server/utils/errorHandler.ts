import type { AuthError, ApiError } from "../types/error";

// Supabase error interface
interface SupabaseAuthError {
  error_code?: string;
  code?: string;
  message?: string;
  status?: number;
}

// Handle Supabase Auth Errors
export const handleAuthError = (
  error: SupabaseAuthError | unknown,
): AuthError => {
  console.error("Auth error:", error);

  // Type guard to check if error has expected properties
  const isSupabaseError = (err: unknown): err is SupabaseAuthError => {
    return typeof err === "object" && err !== null;
  };

  const supabaseError = isSupabaseError(error) ? error : {};

  const baseError: AuthError = {
    type: "AUTH_ERROR",
    code: supabaseError.error_code || supabaseError.code || "UNKNOWN_ERROR",
    message: supabaseError.message || "An authentication error occurred",
    statusCode: 400,
  };

  // Map common Supabase error codes to user-friendly messages
  switch (supabaseError.error_code || supabaseError.code) {
    case "invalid_credentials":
      return {
        ...baseError,
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
        statusCode: 401,
      };
    case "email_not_confirmed":
      return {
        ...baseError,
        code: "EMAIL_NOT_CONFIRMED",
        message: "Please confirm your email address",
        statusCode: 400,
      };
    case "signup_disabled":
      return {
        ...baseError,
        code: "SIGNUP_DISABLED",
        message: "Sign up is currently disabled",
        statusCode: 403,
      };
    case "email_address_invalid":
      return {
        ...baseError,
        code: "INVALID_EMAIL",
        message: "Please provide a valid email address",
        statusCode: 400,
      };
    case "password_too_short":
      return {
        ...baseError,
        code: "PASSWORD_TOO_SHORT",
        message: "Password must be at least 6 characters long",
        statusCode: 400,
      };
    case "user_already_registered":
    case "email_address_already_registered":
      return {
        ...baseError,
        code: "USER_ALREADY_EXISTS",
        message:
          "This email is already registered. Please try logging in instead.",
        statusCode: 409,
      };
    case "invalid_token":
    case "token_expired":
      return {
        ...baseError,
        code: "INVALID_RESET_TOKEN",
        message:
          "Invalid or expired reset token. Please request a new password reset.",
        statusCode: 400,
      };
    case "email_not_found":
      return {
        ...baseError,
        code: "EMAIL_NOT_FOUND",
        message: "No account found with this email address.",
        statusCode: 404,
      };
    default:
      return baseError;
  }
};

// Generic error interface
interface GenericError {
  code?: string;
  message?: string;
  statusCode?: number;
}

// Generic API error handler
export const handleApiError = (error: GenericError | unknown): ApiError => {
  console.error("API error:", error);

  // Type guard for generic errors
  const isGenericError = (err: unknown): err is GenericError => {
    return typeof err === "object" && err !== null;
  };

  const genericError = isGenericError(error) ? error : {};

  return {
    code: genericError.code || "INTERNAL_ERROR",
    message: genericError.message || "An unexpected error occurred",
    statusCode: genericError.statusCode || 500,
  };
};
