import { ERROR_STATUS_MAP } from "~~/server/types/core";
import type { Errors } from "~~/server/types/core";

// Email validation
export const validateEmail = (email: string): Errors | null => {
  if (!email) {
    return {
      code: "EMAIL_REQUIRED",
      message: "Email is required",
      statusCode: ERROR_STATUS_MAP.EMAIL_REQUIRED,
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      code: "EMAIL_INVALID",
      message: "Please provide a valid email address",
      statusCode: ERROR_STATUS_MAP.EMAIL_INVALID,
    };
  }
  return null;
};

// Password validation
export const validatePassword = (password: string): Errors | null => {
  if (!password) {
    return {
      code: "PASSWORD_REQUIRED",
      message: "Password is required",
      statusCode: ERROR_STATUS_MAP.PASSWORD_REQUIRED,
    };
  }

  if (password.length < 6) {
    return {
      code: "PASSWORD_TOO_SHORT",
      message: "Password must be at least 6 characters long",
      statusCode: ERROR_STATUS_MAP.PASSWORD_TOO_SHORT,
    };
  }
  return null;
};

// Validate login request
export const validateLoginRequest = (email: string, password: string): Errors | null => {
  const emailError = validateEmail(email);
  if (emailError) return emailError;
  const passwordError = validatePassword(password);
  if (passwordError) return passwordError;
  return null;
};

// Validate register request
export const validateRegisterRequest = (email: string, password: string): Errors | null => {
  return validateLoginRequest(email, password); // Same validation for now
};

// Validate forgot password request
export const validateForgotPasswordRequest = (email: string): Errors | null => {
  return validateEmail(email);
};

// Validate reset password request
export const validateResetPasswordRequest = (
  access_token: string,
  refresh_token: string,
  password: string,
): Errors | null => {
  if (!access_token && !refresh_token) {
    return {
      code: "TOKENS_REQUIRED",
      message: "Reset tokens are required",
      statusCode: ERROR_STATUS_MAP.TOKENS_REQUIRED,
    };
  }

  if (!access_token) {
    return {
      code: "ACCESS_TOKEN_REQUIRED",
      message: "Reset access token is required",
      statusCode: ERROR_STATUS_MAP.ACCESS_TOKEN_REQUIRED,
    };
  }

  if (!refresh_token) {
    return {
      code: "REFRESH_TOKEN_REQUIRED",
      message: "Reset refresh token is required",
      statusCode: ERROR_STATUS_MAP.REFRESH_TOKEN_REQUIRED,
    };
  }

  return validatePassword(password);
};
