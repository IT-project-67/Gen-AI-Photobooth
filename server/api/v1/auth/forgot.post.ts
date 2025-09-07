import { createAuthClient } from "../../../utils/authClient";
import { handleAuthError, handleApiError } from "../../../utils/errorHandler";
import { validateForgotPasswordRequest } from "../../../utils/validation";
import {
  createSuccessResponse,
  createErrorResponse,
} from "../../../utils/response";
import type {
  ForgotPasswordRequest,
  ForgotPasswordResponse,
} from "../../../types/auth";
import type { ApiResponse } from "../../../types/api";

export default defineEventHandler(
  async (event): Promise<ApiResponse<ForgotPasswordResponse>> => {
    try {
      // Get request body
      const body = (await readBody(event)) as ForgotPasswordRequest;

      // Validate input
      const validationError = validateForgotPasswordRequest(body.email);
      if (validationError) {
        return createErrorResponse(validationError);
      }

      // Create Supabase client
      const supabase = createAuthClient();

      // Send password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(body.email, {
        redirectTo: `${getRequestURL(event).origin}/reset-password`,
      });

      if (error) {
        const authError = handleAuthError(error);
        return createErrorResponse(authError);
      }

      // Always return success message for security (don't reveal if email exists)
      const response: ForgotPasswordResponse = {
        message:
          "If an account with this email exists, you will receive a password reset link.",
      };

      return createSuccessResponse(response, "Password reset email sent");
    } catch (error) {
      const apiError = handleApiError(error);
      return createErrorResponse(apiError);
    }
  },
);
