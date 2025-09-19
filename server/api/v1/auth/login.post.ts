import {
  createSuccessResponse,
  createErrorResponse,
} from "../../../utils/core/response.utils";
import {
  handleAuthError,
  handleApiError,
} from "../../../utils/auth/error-handler.utils";
import { validateLoginRequest } from "../../../utils/auth/validation.utils";
import type { ApiResponse } from "../../../types/core/api-response.types";
import type { LoginResponse } from "../../../types/auth/response.types";
import { ERROR_STATUS_MAP } from "../../../types/core/error-match.types";
import type { LoginRequest } from "../../../types/auth/request.types";
import { createAuthClient } from "../../../clients/supabase.client";
import { createProfile, getAllProfile } from "../../../model/profile.model";

export default defineEventHandler(
  async (event): Promise<ApiResponse<LoginResponse>> => {
    try {
      // Get request body
      const body = (await readBody(event)) as LoginRequest;

      // Validate input
      const validationError = validateLoginRequest(body.email, body.password);
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

      // Sign in user
      const { data, error } = await supabase.auth.signInWithPassword({
        email: body.email,
        password: body.password,
      });

      if (error) {
        const authError = handleAuthError(error);
        throw createError({
          statusCode:
            authError.statusCode || ERROR_STATUS_MAP.INVALID_CREDENTIALS,
          statusMessage: authError.message,
          data: createErrorResponse(authError),
        });
      }

      if (!data.session || !data.user) {
        throw createError({
          statusCode: ERROR_STATUS_MAP.LOGIN_FAILED,
          statusMessage: "Login failed. Please try again.",
          data: createErrorResponse({
            code: "LOGIN_FAILED",
            message: "Login failed. Please try again.",
            statusCode: ERROR_STATUS_MAP.LOGIN_FAILED,
          }),
        });
      }

      const existingProfile = await getAllProfile(data.user.id);
      if (!existingProfile) {
        await createProfile(data.user.id);
      } else if (existingProfile.isDeleted) {
        throw createError({
          statusCode: ERROR_STATUS_MAP.DELETED_USER,
          statusMessage:
            "The user has been deleted, please re-register to retrieve the account.",
          data: createErrorResponse({
            code: "FORBIDDEN",
            message:
              "The user has been deleted, please re-register to retrieve the account.",
            statusCode: ERROR_STATUS_MAP.DELETED_USER,
          }),
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
      throw createError({
        statusCode: apiError.statusCode || ERROR_STATUS_MAP.INTERNAL_ERROR,
        statusMessage: apiError.message,
        data: createErrorResponse(apiError),
      });
    }
  },
);
