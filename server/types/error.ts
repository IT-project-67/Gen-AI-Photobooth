// Error Types
export interface ApiError {
  code: string;
  message: string;
  details?: string;
  statusCode?: number;
}

export interface AuthError extends ApiError {
  type: "AUTH_ERROR";
}

export interface ValidationError extends ApiError {
  type: "VALIDATION_ERROR";
  field?: string;
}
