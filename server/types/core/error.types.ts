import type { ErrorCode } from "../auth/auth-error.types";
import type { StatusCode } from "./status.types";

// Error Types
export const ErrorType = {
  AUTH_ERROR: "AUTH_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  BUSINESS_ERROR: "BUSINESS_ERROR",
  SERVER_ERROR: "SERVER_ERROR",
} as const;
export type ErrorType = (typeof ErrorType)[keyof typeof ErrorType];

// Error Types Interface
export interface Errors {
  type?: ErrorType;
  code: ErrorCode | string;
  message: string;
  statusCode: number | StatusCode;
  details?: unknown;
}

// Generic error interface
export interface GenericError {
  code?: string;
  message?: string;
  statusCode?: number;
}

// Define the structure of Nuxt createError objects
export interface CreateErrorObject {
  data?: {
    error?: {
      code?: string;
      message?: string;
      statusCode?: number;
    };
  };
}

// Define H3 error-like interface
export interface H3Error {
  statusCode?: number;
  statusMessage?: string;
}
