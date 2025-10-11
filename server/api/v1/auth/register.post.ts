import { defineEventHandler, readBody, createError } from "h3";
import type { RegisterResponse, RegisterRequest } from "~~/server/types/auth";
import { ERROR_STATUS_MAP, type ApiResponse } from "~~/server/types/core";
import { createAuthClient, createAdminClient } from "~~/server/clients";
import { getAllProfile, restoreProfile } from "~~/server/model";
import { createSuccessResponse, createErrorResponse } from "~~/server/utils/core";
import { handleAuthError, handleApiError, validateRegisterRequest } from "~~/server/utils/auth";

export default defineEventHandler(async (event): Promise<ApiResponse<RegisterResponse>> => {
  try {
    // Get request body
    const body = (await readBody(event)) as RegisterRequest;

    // Validate input
    const validationError = validateRegisterRequest(body.email, body.password);
    if (validationError) {
      throw createError({
        statusCode: validationError.statusCode || ERROR_STATUS_MAP.VALIDATION_ERROR,
        statusMessage: validationError.message,
        data: createErrorResponse(validationError),
      });
    }

    // Create Supabase clients
    const supabase = createAuthClient();
    const adminClient = createAdminClient();

    // Check if user already exists by trying to list users with email filter
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers.users.find((user) => user.email === body.email);

    let shouldRestore = false;
    let existingUserId = null;
    // If user exists, return error
    if (existingUser) {
      try {
        const existingProfile = await getAllProfile(existingUser.id);

        if (existingProfile && existingProfile.isDeleted) {
          shouldRestore = true;
          existingUserId = existingUser.id;
        } else {
          const authError = {
            type: "AUTH_ERROR" as const,
            code: "USER_ALREADY_EXISTS",
            message: "This email is already registered. Please try logging in instead.",
            statusCode: ERROR_STATUS_MAP.USER_ALREADY_EXISTS,
          };
          throw createError({
            statusCode: ERROR_STATUS_MAP.USER_ALREADY_EXISTS,
            statusMessage: authError.message,
            data: createErrorResponse(authError),
          });
        }
      } catch (error) {
        const apiError = handleApiError(error);
        throw createError({
          statusCode: apiError.statusCode || ERROR_STATUS_MAP.INTERNAL_ERROR,
          statusMessage: apiError.message,
          data: createErrorResponse(apiError),
        });
      }
    }

    // Register user
    let data, error;
    if (shouldRestore) {
      // For deleted accounts, restore profile and return success
      try {
        const { error: updateError } = await adminClient.auth.admin.updateUserById(
          existingUserId!,
          {
            password: body.password,
          },
        );

        if (updateError) {
          throw createError({
            statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
            statusMessage: "Failed to update password for account recovery. Please try again.",
            data: createErrorResponse({
              type: "AUTH_ERROR" as const,
              code: "UPDATE_PASSWORD_FAILED",
              message: "Failed to update password for account recovery. Please try again.",
              statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
            }),
          });
        }

        // Restore the profile
        await restoreProfile(existingUserId!);

        // Return success message for account recovery
        const registerResponse: RegisterResponse = {
          session: null,
          user: {
            id: existingUser!.id,
            email: existingUser!.email || "",
            email_confirmed_at: existingUser!.email_confirmed_at,
            created_at: existingUser!.created_at || new Date().toISOString(),
            updated_at: existingUser!.updated_at || new Date().toISOString(),
          },
          emailSent: false,
          isRecovered: true,
        };

        return createSuccessResponse(
          registerResponse,
          "Account recovered successfully! Please login to continue.",
        );
      } catch (restoreError) {
        console.error("Failed to restore profile:", restoreError);
        throw createError({
          statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
          statusMessage: "Failed to restore account. Please try again.",
          data: createErrorResponse({
            type: "AUTH_ERROR" as const,
            code: "RESTORE_FAILED",
            message: "Failed to restore account. Please try again.",
            statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
          }),
        });
      }
    } else {
      // Register new user
      const { data: registerData, error: registerError } = await supabase.auth.signUp({
        email: body.email,
        password: body.password,
      });

      data = registerData;
      error = registerError;
    }

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
});
