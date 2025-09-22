import { ERROR_STATUS_MAP, type ApiResponse } from "~~/server/types/core";
import { createAuthClient, prismaClient } from "~~/server/clients";
import type { EventResponse } from "~~/server/types/events";
import { handleApiError } from "~~/server/utils/auth";
import {
  createErrorResponse,
  createSuccessResponse,
} from "~~/server/utils/core";

export default defineEventHandler(
  async (event): Promise<ApiResponse<EventResponse | null>> => {
    try {
      const query = getQuery(event);
      const eventId = query.id as string;
      const authHeader = getHeader(event, "authorization");
      const token = authHeader?.split(" ")[1];

      if (!authHeader) {
        throw createError({
          statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
          statusMessage: "Missing authorization header",
          data: createErrorResponse({
            type: "AUTH_ERROR",
            code: "AUTH_ERROR",
            message: "Missing authorization header",
            statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
          }),
        });
      }
      if (!eventId) {
        throw createError({
          statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
          statusMessage: "Missing required field: id",
          data: createErrorResponse({
            type: "VALIDATION_ERROR",
            code: "MISSING_REQUIRED_FIELD",
            message: "Missing required field: id",
            statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
          }),
        });
      }

      const supabase = createAuthClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token);
      if (authError || !user) {
        const e = handleApiError(authError);
        throw createError({
          statusCode: e.statusCode || ERROR_STATUS_MAP.AUTH_ERROR,
          statusMessage: e.message,
          data: createErrorResponse(e),
        });
      }

      const ev = await prismaClient.event.findUnique({
        where: { id: eventId },
      });
      if (!ev || ev.isDeleted || ev.userId !== user.id) {
        return createSuccessResponse(null, "Event not found");
      }

      return createSuccessResponse(
        {
          id: ev.id,
          name: ev.name,
          logoUrl: ev.logoUrl,
          startDate: ev.startDate,
          endDate: ev.endDate,
          createdAt: ev.createdAt,
          updatedAt: ev.updatedAt,
        },
        "Event fetched successfully",
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
