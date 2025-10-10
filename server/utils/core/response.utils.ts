import type { ApiResponse, Errors } from "~~/server/types/core";

// Create success response
export const createSuccessResponse = <T>(data?: T, message?: string): ApiResponse<T> => {
  return {
    success: true,
    data,
    message,
  };
};

// Create error response (using never as default since error responses don't have data)
export const createErrorResponse = <T = never>(error: Errors): ApiResponse<T> => {
  return {
    success: false,
    error,
  };
};
