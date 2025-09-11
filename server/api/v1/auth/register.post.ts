import {
  createSuccessResponse,
  createErrorResponse,
} from "../../../utils/core/response.utils";
import {
  handleAuthError,
  handleApiError,
} from "../../../utils/auth/error-handler.utils";
import {
  createAuthClient,
  createAdminClient,
} from "../../../clients/supabase.client";
import { validateRegisterRequest } from "../../../utils/auth/validation.utils";
import type { RegisterResponse } from "../../../types/auth/response.types";
import type { ApiResponse } from "../../../types/core/api-response.types";
import type { RegisterRequest } from "../../../types/auth/request.types";
import { ERROR_STATUS_MAP } from "~~/server/types/auth/auth-error.types";

export default defineEventHandler(
  async (event): Promise<ApiResponse<RegisterResponse>> => {
    try {
      // Get request body
      const body = (await readBody(event)) as RegisterRequest;

      // Validate input
      const validationError = validateRegisterRequest(
        body.email,
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

      // Create Supabase clients
      const supabase = createAuthClient();
      const adminClient = createAdminClient();

      // Check if user already exists by trying to list users with email filter
      const { data: existingUsers } = await adminClient.auth.admin.listUsers();
      const existingUser = existingUsers.users.find(
        (user) => user.email === body.email,
      );

      // If user exists, return error
      if (existingUser) {
        const authError = {
          type: "AUTH_ERROR" as const,
          code: "USER_ALREADY_EXISTS",
          message:
            "This email is already registered. Please try logging in instead.",
          statusCode: 409,
        };
        throw createError({
          statusCode: 409,
          statusMessage: authError.message,
          data: createErrorResponse(authError),
        });
      }

      // Register user
      const { data, error } = await supabase.auth.signUp({
        email: body.email,
        password: body.password,
      });

      if (error) {
        const authError = handleAuthError(error);
        throw createError({
          statusCode: authError.statusCode || ERROR_STATUS_MAP.BAD_REQUEST,
          statusMessage: authError.message,
          data: createErrorResponse(authError),
        });
      }

      // Prepare response
      const registerResponse: RegisterResponse = {
        session: data.session
          ? {
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              expires_at: data.session.expires_at || 0,
              expires_in: data.session.expires_in || 0,
              token_type: data.session.token_type || "bearer",
              user: {
                id: data.user?.id || "",
                email: data.user?.email || "",
                email_confirmed_at: data.user?.email_confirmed_at || null,
                created_at: data.user?.created_at || new Date().toISOString(),
                updated_at: data.user?.updated_at || new Date().toISOString(),
              },
            }
          : null,
        user: data.user
          ? {
              id: data.user.id,
              email: data.user.email || "",
              email_confirmed_at: data.user.email_confirmed_at || null,
              created_at: data.user.created_at || new Date().toISOString(),
              updated_at: data.user.updated_at || new Date().toISOString(),
            }
          : null,
        emailSent: !data.session,
      };

      const message = data.session
        ? "Registration successful"
        : "Registration successful. Please check your email to confirm your account.";
      return createSuccessResponse(registerResponse, message);
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
