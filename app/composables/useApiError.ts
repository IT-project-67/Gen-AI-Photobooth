import type { Errors } from "~~/server/types/core";

export const useApiError = () => {
  // Format error message for display
  const formatError = (error: Errors | string): string => {
    if (typeof error === "string") {
      return error;
    }
    return error.message || "An unexpected error occurred";
  };

  // Check if error is a validation error
  const isValidationError = (error: Errors): boolean => {
    return error.code?.includes("VALIDATION") || error.code?.includes("INVALID") || false;
  };

  // Check if error is an auth error
  const isAuthError = (error: Errors): boolean => {
    return error.code?.includes("AUTH") || error.code?.includes("CREDENTIALS") || false;
  };

  // Get user-friendly error message based on error code
  const getUserFriendlyMessage = (error: Errors): string => {
    switch (error.code) {
      case "EMAIL_REQUIRED":
        return "Please enter your email address";
      case "EMAIL_INVALID":
        return "Please enter a valid email address";
      case "PASSWORD_REQUIRED":
        return "Please enter your password";
      case "PASSWORD_TOO_SHORT":
        return "Password must be at least 6 characters long";
      case "INVALID_CREDENTIALS":
        return "Invalid email or password";
      case "EMAIL_NOT_CONFIRMED":
        return "Please check your email and confirm your account";
      case "SIGNUP_DISABLED":
        return "Registration is currently disabled";
      case "USER_ALREADY_EXISTS":
        return "This email is already registered. Please try logging in instead.";
      default:
        return error.message || "An unexpected error occurred";
    }
  };

  return {
    formatError,
    isValidationError,
    isAuthError,
    getUserFriendlyMessage,
  };
};
