import type { ValidationError } from "../types/error";

// Email validation
export const validateEmail = (email: string): ValidationError | null => {
  if (!email) {
    return {
      type: "VALIDATION_ERROR",
      code: "EMAIL_REQUIRED",
      message: "Email is required",
      field: "email",
      statusCode: 400,
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      type: "VALIDATION_ERROR",
      code: "EMAIL_INVALID",
      message: "Please provide a valid email address",
      field: "email",
      statusCode: 400,
    };
  }

  return null;
};

// Password validation
export const validatePassword = (password: string): ValidationError | null => {
  if (!password) {
    return {
      type: "VALIDATION_ERROR",
      code: "PASSWORD_REQUIRED",
      message: "Password is required",
      field: "password",
      statusCode: 400,
    };
  }

  if (password.length < 6) {
    return {
      type: "VALIDATION_ERROR",
      code: "PASSWORD_TOO_SHORT",
      message: "Password must be at least 6 characters long",
      field: "password",
      statusCode: 400,
    };
  }

  return null;
};

// Validate login request
export const validateLoginRequest = (
  email: string,
  password: string,
): ValidationError | null => {
  const emailError = validateEmail(email);
  if (emailError) return emailError;

  const passwordError = validatePassword(password);
  if (passwordError) return passwordError;

  return null;
};

// Validate register request
export const validateRegisterRequest = (
  email: string,
  password: string,
): ValidationError | null => {
  return validateLoginRequest(email, password); // Same validation for now
};

// Validate forgot password request
export const validateForgotPasswordRequest = (
  email: string,
): ValidationError | null => {
  return validateEmail(email);
};

// Validate reset password request
export const validateResetPasswordRequest = (
  token: string,
  password: string,
): ValidationError | null => {
  if (!token) {
    return {
      type: "VALIDATION_ERROR",
      code: "TOKEN_REQUIRED",
      message: "Reset token is required",
      field: "token",
      statusCode: 400,
    };
  }

  return validatePassword(password);
};
