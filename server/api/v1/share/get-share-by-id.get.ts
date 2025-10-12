import { defineEventHandler, getQuery, createError } from "h3";
import { handleApiError, requireAuth } from "~~/server/utils/auth";
import { getSharedPhotoById } from "~~/server/model";
import { ERROR_STATUS_MAP, type ErrorType, type ApiResponse } from "~~/server/types/core";
import { createErrorResponse, createSuccessResponse } from "~~/server/utils/core";
import type { GetShareResponse } from "~~/server/types/share";

export default defineEventHandler(async (event): Promise<ApiResponse<GetShareResponse>> => {
  try {
    const _user = await requireAuth(event);
    const { shareId } = getQuery(event) as { shareId: string };

    if (!shareId) {
      throw createError({
        statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
        statusMessage: "Share ID is required",
        data: createErrorResponse({
          type: "VALIDATION_ERROR" as ErrorType,
          code: "MISSING_SHARE_ID",
          message: "Share ID is required",
          statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
        }),
      });
    }

    const sharedPhoto = await getSharedPhotoById(shareId);
    if (!sharedPhoto) {
      throw createError({
        statusCode: ERROR_STATUS_MAP.NOT_FOUND,
        statusMessage: "Share not found",
        data: createErrorResponse({
          type: "NOT_FOUND" as ErrorType,
          code: "SHARE_NOT_FOUND",
          message: "Share not found",
          statusCode: ERROR_STATUS_MAP.NOT_FOUND,
        }),
      });
    }

    return createSuccessResponse(
      {
        id: sharedPhoto.id,
        eventId: sharedPhoto.eventId,
        aiphotoId: sharedPhoto.aiPhotoId,
        selectedUrl: sharedPhoto.selectedUrl,
        qrCodeUrl: sharedPhoto.qrCodeUrl,
        qrExpiresAt: sharedPhoto.qrExpiresAt.toISOString(),
        createdAt: sharedPhoto.createdAt.toISOString(),
        event: {
          id: sharedPhoto.event.id,
          name: sharedPhoto.event.name,
        },
        aiPhoto: {
          id: sharedPhoto.aiPhoto.id,
          style: sharedPhoto.aiPhoto.style,
          generatedUrl: sharedPhoto.aiPhoto.generatedUrl,
        },
      },
      "Share retrieved successfully",
    );
  } catch (error) {
    const apiError = handleApiError(error);
    throw createError({
      statusCode: apiError.statusCode || ERROR_STATUS_MAP.INTERNAL_ERROR,
      statusMessage: apiError.message,
      data: createErrorResponse(apiError),
    });
  }
});
