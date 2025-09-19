import {
  createSuccessResponse,
  createErrorResponse,
} from "../../../utils/core/response.utils";
import {
  handleAuthError,
  handleApiError,
} from "../../../utils/auth/error-handler.utils";
import { validateResetPasswordRequest } from "../../../utils/auth/validation.utils";
import type { ResetPasswordResponse } from "../../../types/auth/response.types";
import type { ResetPasswordRequest } from "../../../types/auth/request.types";
import type { ApiResponse } from "../../../types/core/api-response.types";
import { ERROR_STATUS_MAP } from "~~/server/types/core/error-match.types";
import { createAuthClient } from "../../../clients/supabase.client";

export default defineEventHandler(
  async (event): Promise<ApiResponse<ResetPasswordResponse>> => {
    try {
      // Get request body
      const body = (await readBody(event)) as ResetPasswordRequest;

      // Validate input
      const validationError = validateResetPasswordRequest(
        body.access_token,
        body.refresh_token,
        body.password,
      );
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

      // For password reset, we need to set the session first using the token
      const { data: sessionData, error: sessionError } =
        await supabase.auth.setSession({
          access_token: body.access_token,
          refresh_token: body.refresh_token,
        });

      if (sessionError) {
        const authError = handleAuthError(sessionError);
        throw createError({
          statusCode: authError.statusCode || ERROR_STATUS_MAP.AUTH_ERROR,
          statusMessage: authError.message,
          data: createErrorResponse(authError),
        });
      }

      if (!sessionData.user) {
        const err = {
          code: "SESSION_ERROR",
          message: "Auth provider returned no user for recovery session",
          statusCode: ERROR_STATUS_MAP.SESSION_ERROR,
        };
        throw createError({
          statusCode: ERROR_STATUS_MAP.SESSION_ERROR,
          statusMessage: "Auth provider returned no user for recovery session",
          data: createErrorResponse(err),
        });
      }

      // Now update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: body.password,
      });

      if (updateError) {
        const authError = handleAuthError(updateError);
        throw createError({
          statusCode: authError.statusCode || ERROR_STATUS_MAP.UPDATE_ERROR,
          statusMessage: authError.message,
          data: createErrorResponse(authError),
        });
      }

      // Prepare response
      const response: ResetPasswordResponse = {
        message:
          "Password has been successfully reset. You can now log in with your new password.",
      };
      return createSuccessResponse(response, "Password reset successful");
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
