import { defineEventHandler, getQuery, createError } from "h3";
import { requireAuth } from "~~/server/utils/auth";
import { ERROR_STATUS_MAP } from "~~/server/types/core";
import {
  createErrorResponse,
  createSuccessResponse,
} from "~~/server/utils/core";
import { getAIPhotosBySession, getPhotoSessionById } from "~~/server/model";

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuth(event);
    const { sessionId } = getQuery(event) as { sessionId?: string };

    if (!sessionId) {
      throw createError({
        statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
        statusMessage: "Session ID is required",
        data: createErrorResponse({
          type: "VALIDATION_ERROR" as const,
          code: "MISSING_SESSION_ID",
          message: "Session ID is required",
          statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
        }),
      });
    }

    const photoSession = await getPhotoSessionById(sessionId, user.id);
    if (!photoSession) {
      throw createError({
        statusCode: ERROR_STATUS_MAP.NOT_FOUND,
        statusMessage: "Session not found",
        data: createErrorResponse({
          type: "NOT_FOUND" as const,
          code: "SESSION_NOT_FOUND",
          message: "Session not found or access denied",
          statusCode: ERROR_STATUS_MAP.NOT_FOUND,
        }),
      });
    }
    const aiPhotos = await getAIPhotosBySession(sessionId, user.id);

    return createSuccessResponse(
      {
        sessionId: photoSession.id,
        eventId: photoSession.eventId,
        photos: aiPhotos.map((photo) => ({
          id: photo.id,
          style: photo.style,
          storageUrl: photo.generatedUrl,
          createdAt: photo.createdAt.toISOString(),
          updatedAt: photo.updatedAt.toISOString(),
        })),
      },
      "AI photos retrieved successfully",
    );
  } catch (error) {
    console.error("Error fetching AI photos by session:", error);
    throw error;
  }
});

