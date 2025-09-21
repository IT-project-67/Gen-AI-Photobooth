import type { CreateEventResponse } from "./../../../types/events/response.types";
import type { ApiResponse } from "~~/server/types/core/api-response.types";
import { handleApiError } from "~~/server/utils/auth/error-handler.utils";
import { ERROR_STATUS_MAP } from "~~/server/types/core/error-match.types";
import {
  createErrorResponse,
  createSuccessResponse,
} from "~~/server/utils/core/response.utils";
import { createAuthClient } from "~~/server/clients/supabase.client";
import { prisma } from "~~/server/clients/prisma.client";
import type { CreateEventRequest } from "~~/server/types/events/request.types";

export default defineEventHandler(
  async (event): Promise<ApiResponse<CreateEventResponse>> => {
    try {
      const body = await readBody<CreateEventRequest>(event);
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
      if (!body?.name) {
        throw createError({
          statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
          statusMessage: "Missing required field: name",
          data: createErrorResponse({
            type: "VALIDATION_ERROR" as const,
            code: "MISSING_REQUIRED_FIELD",
            message: "Missing required field: name",
            statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
          }),
        });
      }
      if (!body?.startDate) {
        throw createError({
          statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
          statusMessage: "Missing required field: startDate",
          data: createErrorResponse({
            type: "VALIDATION_ERROR" as const,
            code: "MISSING_REQUIRED_FIELD",
            message: "Missing required field: startDate",
            statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
          }),
        });
      }
      if (!body?.endDate) {
        throw createError({
          statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
          statusMessage: "Missing required field: endDate",
          data: createErrorResponse({
            type: "VALIDATION_ERROR" as const,
            code: "MISSING_REQUIRED_FIELD",
            message: "Missing required field: endDate",
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

      const newEvent = await prisma.event.create({
        data: {
          userId: user.id,
          name: body.name,
          startDate: new Date(body.startDate),
          endDate: new Date(body.endDate),
          logoUrl: null,
        },
      });

      if (!newEvent.startDate || !newEvent.endDate) {
        throw createError({
          statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
          statusMessage: "Invariant violated: startDate/endDate is null",
          data: createErrorResponse({
            code: "INVARIANT_VIOLATION",
            message: "startDate/endDate should never be null after creation",
            statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
          }),
        });
      }

      return createSuccessResponse(
        {
          id: newEvent.id,
          name: newEvent.name,
          logoUrl: newEvent.logoUrl,
          startDate: newEvent.startDate,
          endDate: newEvent.endDate,
          createdAt: newEvent.createdAt,
          updatedAt: newEvent.updatedAt,
        },
        "Event created successfully",
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
