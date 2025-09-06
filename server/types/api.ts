import type { ApiError } from "./error";

// Generic API Response
export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}
