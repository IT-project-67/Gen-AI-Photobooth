import { ERROR_STATUS_MAP, type ApiResponse } from "~~/server/types/core";
import { createAuthClient } from "~~/server/clients";
import type { EventResponse } from "~~/server/types/event";
import { handleApiError } from "~~/server/utils/auth";
import { createErrorResponse, createSuccessResponse } from "~~/server/utils/core";
import { getEventsByProfile } from "~~/server/model";

export default defineEventHandler(async (event): Promise<ApiResponse<EventResponse[]>> => {
  try {
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

    const userEvents = await getEventsByProfile(user.id, "desc");
    const mapped: EventResponse[] = userEvents.map((ev) => ({
      id: ev.id,
      name: ev.name,
      logoUrl: ev.logoUrl,
      startDate: ev.startDate,
      endDate: ev.endDate,
      createdAt: ev.createdAt,
      updatedAt: ev.updatedAt,
    }));

    return createSuccessResponse(mapped, "Events fetched successfully");
  } catch (error) {
    const apiError = handleApiError(error);
    throw createError({
      statusCode: apiError.statusCode || ERROR_STATUS_MAP.INTERNAL_ERROR,
      statusMessage: apiError.message,
      data: createErrorResponse(apiError),
    });
  }
});
