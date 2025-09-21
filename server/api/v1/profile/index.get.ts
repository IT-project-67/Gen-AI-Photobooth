import { ERROR_STATUS_MAP, type ApiResponse } from "~~/server/types/core";
import type { ProfileResponse } from "~~/server/types/profile";
import { handleApiError } from "~~/server/utils/auth";
import { createAuthClient } from "~~/server/clients";
import { getValidProfile } from "~~/server/model";
import {
  createErrorResponse,
  createSuccessResponse,
} from "~~/server/utils/core";

export default defineEventHandler(
  async (event): Promise<ApiResponse<ProfileResponse>> => {
    try {
      const authHeader = getHeader(event, "authorization");
      const token = authHeader?.split(" ")[1];

      if (!authHeader) {
        throw createError({
          statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
          statusMessage: "Missing authorization header",
          data: createErrorResponse({
            type: "AUTH_ERROR" as const,
            code: "AUTH_ERROR",
            message: "Missing authorization header",
            statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
          }),
        });
      }

      const supabase = createAuthClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token);

      if (authError || !user) {
        const error = handleApiError(authError);
        throw createError({
          statusCode: error.statusCode || ERROR_STATUS_MAP.AUTH_ERROR,
          statusMessage: error.message,
          data: createErrorResponse(error),
        });
      }

      const profile = await getValidProfile(user.id);

      if (!profile) {
        throw createError({
          statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
          statusMessage: "User profile not found",
          data: createErrorResponse({
            type: "AUTH_ERROR" as const,
            code: "PROFILE_NOT_FOUND",
            message: "User profile not found",
            statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
          }),
        });
      }

      const profileResponse = {
        userId: profile.userId,
        displayName: profile.displayName,
        organization: profile.organization,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
        isDeleted: profile.isDeleted,
      };

      return createSuccessResponse(
        profileResponse,
        "Profile retrieved successfully",
      );
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
