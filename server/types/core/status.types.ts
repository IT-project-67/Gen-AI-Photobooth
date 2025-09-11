export const STATUS_CODES = {
    // Success
    OK: 200,
    CREATED: 201,
  
    // Client Error
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
  
    // Server Error
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503
} as const
export type StatusCode = typeof STATUS_CODES[keyof typeof STATUS_CODES]
