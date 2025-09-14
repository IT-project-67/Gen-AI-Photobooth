import {
  createSuccessResponse,
  createErrorResponse,
} from "../../../utils/core/response.utils";
import {
  handleAuthError,
  handleApiError,
} from "../../../utils/auth/error-handler.utils";
import { validateForgotPasswordRequest } from "../../../utils/auth/validation.utils";
import type { ForgotPasswordResponse } from "../../../types/auth/response.types";
import type { ForgotPasswordRequest } from "../../../types/auth/request.types";
import type { ApiResponse } from "../../../types/core/api-response.types";
import { ERROR_STATUS_MAP } from "~~/server/types/auth/auth-error.types";
import { createAuthClient } from "../../../clients/supabase.client";

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
