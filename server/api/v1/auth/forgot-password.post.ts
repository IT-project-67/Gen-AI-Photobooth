import { ERROR_STATUS_MAP, type ApiResponse } from "~~/server/types/core";
import { createAuthClient } from "~~/server/clients";
import {
  createSuccessResponse,
  createErrorResponse,
} from "~~/server/utils/core";
import {
  handleAuthError,
  handleApiError,
  validateForgotPasswordRequest,
} from "~~/server/utils/auth";
import type {
  ForgotPasswordResponse,
  ForgotPasswordRequest,
} from "~~/server/types/auth";

export default defineEventHandler(
  async (event): Promise<ApiResponse<ForgotPasswordResponse>> => {
    try {
      // Get request body
      const body = (await readBody(event)) as ForgotPasswordRequest;

      // Validate input
      const validationError = validateForgotPasswordRequest(body.email);
      if (validationError) {
        throw createError({
          statusCode:
            validationError.statusCode || ERROR_STATUS_MAP.VALIDATION_ERROR,
          statusMessage: validationError.message,
          data: createErrorResponse(validationError),
        });
      }

      // Create Supabase client
      const supabase = createAuthClient();

      // Send password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(body.email, {
        redirectTo: `${getRequestURL(event).origin}/resetPassword`,
      });

      if (error) {
        const authError = handleAuthError(error);
        throw createError({
          statusCode: authError.statusCode || ERROR_STATUS_MAP.BAD_REQUEST,
          statusMessage: authError.message,
          data: createErrorResponse(authError),
        });
      }

      // Always return success message for security (don't reveal if email exists)
      const response: ForgotPasswordResponse = {
        message:
          "If an account with this email exists, you will receive a password reset link.",
      };
      return createSuccessResponse(response, "Password reset email sent");
    } catch (error) {
      const apiError = handleApiError(error);
      throw createError({
        statusCode: apiError.statusCode || ERROR_STATUS_MAP.INTERNAL_ERROR,
        statusMessage: apiError.message,
        data: createErrorResponse(apiError),
      });
    }
  },
);
