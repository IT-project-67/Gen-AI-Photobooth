// Generic API Response
export interface ApiResponse<T = void, E = unknown> {
  success: boolean;
  data?: T;
  error?: E;
  message?: string;
}
