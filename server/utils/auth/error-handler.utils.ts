import { ERROR_STATUS_MAP, type SupabaseAuthError } from '../../types/auth/auth-error.types'
import type { Errors, GenericError, CreateErrorObject } from '../../types/core/error.types'
import { STATUS_CODES } from '../../types/core/status.types'

// Handle Supabase Auth Errors
export const handleAuthError = (error: SupabaseAuthError | unknown): Errors => {
  // Type guard to check if error has expected properties
  const isSupabaseError = (err: unknown): err is SupabaseAuthError => {
    return typeof err === 'object' && err !== null
  }
  const supabaseError = isSupabaseError(error) ? error : {}
  
  const baseError: Errors = {
    code: supabaseError.error_code || supabaseError.code || 'UNKNOWN_ERROR',
    message: supabaseError.message || 'An authentication error occurred',
    statusCode: STATUS_CODES.BAD_REQUEST
  }
  
  // Map common Supabase error codes to user-friendly messages
  switch (supabaseError.error_code || supabaseError.code) {
    case 'invalid_credentials':
      return {
        ...baseError,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
        statusCode: ERROR_STATUS_MAP.INVALID_CREDENTIALS
      }
    case 'email_not_confirmed':
      return {
        ...baseError,
        code: 'EMAIL_NOT_CONFIRMED',
        message: 'Please confirm your email address',
        statusCode: ERROR_STATUS_MAP.EMAIL_NOT_CONFIRMED
      }
    case 'signup_disabled':
      return {
        ...baseError,
        code: 'SIGNUP_DISABLED',
        message: 'Sign up is currently disabled',
        statusCode: ERROR_STATUS_MAP.SIGNUP_DISABLED
      }
    case 'email_address_invalid':
      return {
        ...baseError,
        code: 'EMAIL_INVALID',
        message: 'Please provide a valid email address',
        statusCode: ERROR_STATUS_MAP.EMAIL_INVALID
      }
    case 'password_too_short':
      return {
        ...baseError,
        code: 'PASSWORD_TOO_SHORT',
        message: 'Password must be at least 6 characters long',
        statusCode: ERROR_STATUS_MAP.PASSWORD_TOO_SHORT
      }
    case 'user_already_registered':
    case 'email_address_already_registered':
      return {
        ...baseError,
        code: 'USER_ALREADY_EXISTS',
        message: 'This email is already registered. Please try logging in instead.',
        statusCode: ERROR_STATUS_MAP.USER_ALREADY_EXISTS
      }
    case 'invalid_token':
    case 'token_expired':
      return {
        ...baseError,
        code: 'INVALID_RESET_TOKEN',
        message: 'Invalid or expired reset token. Please request a new password reset.',
        statusCode: ERROR_STATUS_MAP.INVALID_RESET_TOKEN
      }
    case 'email_not_found':
      return {
        ...baseError,
        code: 'EMAIL_NOT_FOUND',
        message: 'No account found with this email address.',
        statusCode: ERROR_STATUS_MAP.EMAIL_NOT_FOUND
      }
    default:
      return baseError
  }
}

// Type guard for createError objects
const isCreateErrorObject = (err: unknown): err is CreateErrorObject => {
  if (typeof err !== 'object' || err === null) {
    return false
  }
  
  if (!('data' in err)) {
    return false
  }
  
  const data = (err as Record<string, unknown>).data
  if (typeof data !== 'object' || data === null) {
    return false
  }
  return 'error' in data
}

// Generic API error handler
export const handleApiError = (error: GenericError | unknown): Errors => {
  
  // Check if it's a Nuxt createError object
  if (isCreateErrorObject(error)) {
    // Extract error info from createError's data field
    if (error.data?.error) {
      const errorData = error.data.error
      return {
        code: errorData.code || 'INTERNAL_ERROR',
        message: errorData.message || 'An unexpected error occurred',
        statusCode: errorData.statusCode || 500
      }
    }
  }
  
  // Type guard for generic errors
  const isGenericError = (err: unknown): err is GenericError => {
    return typeof err === 'object' && err !== null && 'code' in err
  }
  
  const genericError = isGenericError(error) ? error : {}
  
  return {
    code: genericError.code || 'INTERNAL_ERROR',
    message: genericError.message || 'An unexpected error occurred',
    statusCode: genericError.statusCode || 500
  }
}
