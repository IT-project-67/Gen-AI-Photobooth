import type { ApiResponse } from "../types/api";
import type { ApiError } from "../types/error";

// Create success response
export const createSuccessResponse = <T>(
  data?: T,
  message?: string,
): ApiResponse<T> => {
  return {
    success: true,
    data,
    message,
  };
};

// Create error response (using never as default since error responses don't have data)
export const createErrorResponse = <T = never>(
  error: ApiError,
): ApiResponse<T> => {
  return {
    success: false,
    error,
  };
};
