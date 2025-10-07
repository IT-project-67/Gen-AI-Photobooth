import { handleApiError, requireAuth } from "~~/server/utils/auth";
import { getEventById, getSharedPhotosByEvent } from "~~/server/model";
import {
  ERROR_STATUS_MAP,
  type ErrorType,
  type ApiResponse,
} from "~~/server/types/core";
import {
  createErrorResponse,
  createSuccessResponse,
} from "~~/server/utils/core";
import type { GetSharesByEventResponse } from "~~/server/types/share";

export default defineEventHandler(
  async (event): Promise<ApiResponse<GetSharesByEventResponse>> => {
    try {
      const user = await requireAuth(event);
      const { eventId } = getQuery(event) as { eventId: string };

      if (!eventId) {
        throw createError({
          statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
          statusMessage: "Event ID is required",
          data: createErrorResponse({
            type: "VALIDATION_ERROR" as ErrorType,
            code: "MISSING_EVENT_ID",
            message: "Event ID is required",
            statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
          }),
        });
      }

      const userEvent = await getEventById(eventId, user.id);
      if (!userEvent) {
        throw createError({
          statusCode: ERROR_STATUS_MAP.NOT_FOUND,
          statusMessage: "Event not found",
          data: createErrorResponse({
            type: "NOT_FOUND" as ErrorType,
            code: "EVENT_NOT_FOUND",
            message: "Event not found or access denied",
            statusCode: ERROR_STATUS_MAP.NOT_FOUND,
          }),
        });
      }

      const sharedPhotos = await getSharedPhotosByEvent(eventId);
      const shares = sharedPhotos.map((sharedPhoto) => ({
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
      }));

      return createSuccessResponse({ shares }, "Shares retrieved successfully");
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
