export interface OAuthError extends Error {
  statusCode?: number;
  message: string;
}
