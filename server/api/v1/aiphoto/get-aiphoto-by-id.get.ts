import { defineEventHandler, getQuery, createError } from "h3";
import { requireAuth } from "~~/server/utils/auth";
import { ERROR_STATUS_MAP } from "~~/server/types/core";
import {
  createErrorResponse,
  createSuccessResponse,
} from "~~/server/utils/core";
import { getAIPhotosById } from "~~/server/model";

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuth(event);
    const { aiPhotoId } = getQuery(event) as { aiPhotoId?: string };

    if (!aiPhotoId) {
      throw createError({
        statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
        statusMessage: "AI Photo ID is required",
        data: createErrorResponse({
          type: "VALIDATION_ERROR" as const,
          code: "MISSING_AI_PHOTO_ID",
          message: "AI Photo ID is required",
          statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
        }),
      });
    }

    const aiPhoto = await getAIPhotosById(aiPhotoId, user.id);
    if (!aiPhoto) {
      throw createError({
        statusCode: ERROR_STATUS_MAP.NOT_FOUND,
        statusMessage: "AI Photo not found",
        data: createErrorResponse({
          type: "NOT_FOUND" as const,
          code: "AI_PHOTO_NOT_FOUND",
          message: "AI Photo not found or access denied",
          statusCode: ERROR_STATUS_MAP.NOT_FOUND,
        }),
      });
    }

    return createSuccessResponse(
      {
        id: aiPhoto.id,
        style: aiPhoto.style,
        storageUrl: aiPhoto.generatedUrl,
        sessionId: aiPhoto.photoSession.id,
        eventId: aiPhoto.photoSession.eventId,
        createdAt: aiPhoto.createdAt.toISOString(),
        updatedAt: aiPhoto.updatedAt.toISOString(),
      },
      "AI photo retrieved successfully",
    );
  } catch (error) {
    console.error("Error fetching AI photo by ID:", error);
    throw error;
  }
});
