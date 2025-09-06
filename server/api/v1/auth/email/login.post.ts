import { createAuthClient } from "../../../../utils/authClient";
import {
  handleAuthError,
  handleApiError,
} from "../../../../utils/errorHandler";
import { validateLoginRequest } from "../../../../utils/validation";
import {
  createSuccessResponse,
  createErrorResponse,
} from "../../../../utils/response";
import type { LoginRequest, LoginResponse } from "../../../../types/auth";
import type { ApiResponse } from "../../../../types/api";

export default defineEventHandler(
  async (event): Promise<ApiResponse<LoginResponse>> => {
    try {
      // Get request body
      const body = (await readBody(event)) as LoginRequest;

      // Validate input
      const validationError = validateLoginRequest(body.email, body.password);
      if (validationError) {
        return createErrorResponse(validationError);
      }

      // Create Supabase client
      const supabase = createAuthClient();

      // Sign in user
      const { data, error } = await supabase.auth.signInWithPassword({
        email: body.email,
        password: body.password,
      });

      if (error) {
        const authError = handleAuthError(error);
        return createErrorResponse(authError);
      }

      if (!data.session || !data.user) {
        return createErrorResponse({
          code: "LOGIN_FAILED",
          message: "Login failed. Please try again.",
          statusCode: 400,
        });
      }

      // Prepare response
      const loginResponse: LoginResponse = {
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at || 0,
          expires_in: data.session.expires_in || 0,
          token_type: data.session.token_type || "bearer",
          user: {
            id: data.user.id,
            email: data.user.email || "",
            email_confirmed_at: data.user.email_confirmed_at || null,
            created_at: data.user.created_at || new Date().toISOString(),
            updated_at: data.user.updated_at || new Date().toISOString(),
          },
        },
        user: {
          id: data.user.id,
          email: data.user.email || "",
          email_confirmed_at: data.user.email_confirmed_at || null,
          created_at: data.user.created_at || new Date().toISOString(),
          updated_at: data.user.updated_at || new Date().toISOString(),
        },
      };

      return createSuccessResponse(loginResponse, "Login successful");
    } catch (error) {
      const apiError = handleApiError(error);
      return createErrorResponse(apiError);
    }
  },
);
