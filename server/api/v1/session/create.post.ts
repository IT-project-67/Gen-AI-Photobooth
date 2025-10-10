import { handleApiError, requireAuth } from "~~/server/utils/auth";
import { createPhotoSession, getEventById } from "~~/server/model";
import { ERROR_STATUS_MAP, type ErrorType, type ApiResponse } from "~~/server/types/core";
import { createErrorResponse, createSuccessResponse } from "~~/server/utils/core";
import type { SessionRequest, SessionResponse } from "~~/server/types/session";

export default defineEventHandler(async (event): Promise<ApiResponse<SessionResponse>> => {
  try {
    const user = await requireAuth(event);
    const body = await readBody(event);

    if (!body || !body.eventId) {
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

    const { eventId } = body as SessionRequest;
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

    const photoSession = await createPhotoSession(eventId);
    return createSuccessResponse(
      {
        sessionId: photoSession.id,
        eventId: photoSession.eventId,
        createdAt: photoSession.createdAt.toISOString(),
      },
      "Session created successfully",
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
