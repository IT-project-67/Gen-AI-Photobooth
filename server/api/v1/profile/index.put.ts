import { createAuthClient } from "../../../clients/supabase.client";
import { handleApiError } from "../../../utils/auth/error-handler.utils";
import {
  createSuccessResponse,
  createErrorResponse,
} from "../../../utils/core/response.utils";
import { updateProfile } from "../../../model/profile.model";
import type { ApiResponse } from "../../../types/core/api-response.types";
import { ERROR_STATUS_MAP } from "../../../types/core/error-match.types";
import type {
  UpdateProfileRequest,
  ProfileResponse,
} from "../../../types/profile/profile.types";

export default defineEventHandler(
  async (event): Promise<ApiResponse<ProfileResponse>> => {
    try {
      const authHeader = getHeader(event, "authorization");
      const token = authHeader?.split(" ")[1];

      if (!authHeader || !token) {
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

      const body = (await readBody(event)) as UpdateProfileRequest;

      if (!body.displayName && !body.organization) {
        throw createError({
          statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
          statusMessage:
            "At least one field (displayName or organization) must be provided",
          data: createErrorResponse({
            type: "VALIDATION_ERROR" as const,
            code: "VALIDATION_ERROR",
            message:
              "At least one field (displayName or organization) must be provided",
            statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
          }),
        });
      }

      if (body.displayName !== undefined && body.displayName.length > 100) {
        throw createError({
          statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
          statusMessage: "Display name must be less than 100 characters",
          data: createErrorResponse({
            type: "VALIDATION_ERROR" as const,
            code: "VALIDATION_ERROR",
            message: "Display name must be less than 100 characters",
            statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
          }),
        });
      }

      if (body.organization !== undefined && body.organization.length > 100) {
        throw createError({
          statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
          statusMessage: "Organization must be less than 100 characters",
          data: createErrorResponse({
            type: "VALIDATION_ERROR" as const,
            code: "VALIDATION_ERROR",
            message: "Organization must be less than 100 characters",
            statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
          }),
        });
      }

      const updatedProfile = await updateProfile(user.id, {
        displayName: body.displayName,
        organization: body.organization,
      });

      const profileResponse = {
        userId: updatedProfile.userId,
        displayName: updatedProfile.displayName,
        organization: updatedProfile.organization,
        createdAt: updatedProfile.createdAt.toISOString(),
        updatedAt: updatedProfile.updatedAt.toISOString(),
        isDeleted: updatedProfile.isDeleted,
      };

      return createSuccessResponse(
        profileResponse,
        "Profile updated successfully",
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
