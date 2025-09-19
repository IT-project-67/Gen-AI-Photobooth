import { handleApiError } from "../../../utils/auth/error-handler.utils";
import { ERROR_STATUS_MAP } from "../../../types/auth/auth-error.types";
import {
  createErrorResponse,
  createSuccessResponse,
} from "../../../utils/core/response.utils";
import { createAuthClient } from "../../../clients/supabase.client";
import { getValidProfile } from "../../../model/profile.model";
import type { ApiResponse } from "../../../types/core/api-response.types";

interface ProfileResponse {
  userId: string;
  displayName?: string | null;
  organization?: string | null;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

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
