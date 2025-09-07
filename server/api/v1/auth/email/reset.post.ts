import { createAuthClient } from "../../../../utils/authClient";
import {
  handleAuthError,
  handleApiError,
} from "../../../../utils/errorHandler";
import { validateResetPasswordRequest } from "../../../../utils/validation";
import {
  createSuccessResponse,
  createErrorResponse,
} from "../../../../utils/response";
import type {
  ResetPasswordRequest,
  ResetPasswordResponse,
} from "../../../../types/auth";
import type { ApiResponse } from "../../../../types/api";

export default defineEventHandler(
  async (event): Promise<ApiResponse<ResetPasswordResponse>> => {
    try {
      // Get request body
      const body = (await readBody(event)) as ResetPasswordRequest;

      console.log("Reset password request:", {
        token: body.token ? `${body.token.substring(0, 20)}...` : "No token",
        passwordLength: body.password?.length || 0,
      });

      // Validate input
      const validationError = validateResetPasswordRequest(
        body.token,
        body.password,
      );
      if (validationError) {
        console.log("Validation error:", validationError);
        return createErrorResponse(validationError);
      }

      // Create Supabase client
      const supabase = createAuthClient();

      // For password reset, we need to set the session first using the token
      const { data: sessionData, error: sessionError } =
        await supabase.auth.setSession({
          access_token: body.token,
          refresh_token: body.token, // For recovery, we can use the same token
        });

      if (sessionError) {
        console.log("Session error:", sessionError);
        const authError = handleAuthError(sessionError);
        return createErrorResponse(authError);
      }

      console.log("Session set successfully:", sessionData);

      // Now update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: body.password,
      });

      if (updateError) {
        console.log("Update password error:", updateError);
        const authError = handleAuthError(updateError);
        return createErrorResponse(authError);
      }

      console.log("Password updated successfully");

      // Prepare response
      const response: ResetPasswordResponse = {
        message:
          "Password has been successfully reset. You can now log in with your new password.",
      };
      return createSuccessResponse(response, "Password reset successful");
    } catch (error) {
      const apiError = handleApiError(error);
      return createErrorResponse(apiError);
    }
  },
);
