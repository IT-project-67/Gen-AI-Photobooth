import { handleApiError, requireAuth } from "~~/server/utils/auth";
import {
  ERROR_STATUS_MAP,
  type ErrorType,
  type ApiResponse,
} from "~~/server/types/core";
import {
  createErrorResponse,
  createSuccessResponse,
} from "~~/server/utils/core";
import { prismaClient } from "~~/server/clients";
import type { SessionGetResponse } from "~~/server/types/session";

export default defineEventHandler(
  async (event): Promise<ApiResponse<SessionGetResponse>> => {
    try {
      const user = await requireAuth(event);
      const query = getQuery(event);
      const sessionId = query.sessionId as string;

      if (!sessionId) {
        throw createError({
          statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
          statusMessage: "Session ID is required",
          data: createErrorResponse({
            type: "VALIDATION_ERROR" as ErrorType,
            code: "MISSING_SESSION_ID",
            message: "Session ID is required",
            statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
          }),
        });
      }

      // Get session and verify user access in one query
      const photoSession = await prismaClient.photoSession.findFirst({
        where: {
          id: sessionId,
          event: {
            userId: user.id,
            isDeleted: false,
          },
        },
      });

      console.log("Session query result:", photoSession);

      if (!photoSession) {
        throw createError({
          statusCode: ERROR_STATUS_MAP.NOT_FOUND,
          statusMessage: "Session not found",
          data: createErrorResponse({
            type: "NOT_FOUND" as ErrorType,
            code: "SESSION_NOT_FOUND",
            message: "Session not found or access denied",
            statusCode: ERROR_STATUS_MAP.NOT_FOUND,
          }),
        });
      }

      return createSuccessResponse(
        {
          id: photoSession.id,
          eventId: photoSession.eventId,
          photoUrl: photoSession.photoUrl || undefined,
          createdAt: photoSession.createdAt.toISOString(),
          updatedAt: photoSession.updatedAt.toISOString(),
        },
        "Session retrieved successfully",
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
