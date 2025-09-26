import { defineEventHandler, getQuery, createError, setHeader, send } from "h3";
import { createAdminClient, prismaClient } from "~~/server/clients";
import { handleApiError, requireAuth } from "~~/server/utils/auth";
import { ERROR_STATUS_MAP, ErrorType } from "~~/server/types/core";
import {
  createErrorResponse,
  createSuccessResponse,
} from "~~/server/utils/core";
import { getStorageBucket } from "~~/server/utils/storage/path.utils";

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuth(event);
    const { eventId, mode, expires } = getQuery(event) as {
      eventId?: string;
      mode?: "blob" | "signed";
      expires?: string;
    };

    if (!eventId) {
      throw createError({
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
        statusMessage: "Missing eventId",
        data: createErrorResponse({
          type: "VALIDATION_ERROR" as const,
          code: "MISSING_EVENT_ID",
          message: "Missing required field: eventId",
          statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
        }),
      });
    }

    const ev = await prismaClient.event.findUnique({ where: { id: eventId } });
    if (!ev || ev.isDeleted) {
      throw createError({
        statusCode: ERROR_STATUS_MAP.NOT_FOUND,
        statusMessage: "Event not found",
        data: createErrorResponse({
          type: ErrorType.NOT_FOUND,
          code: "EVENT_NOT_FOUND",
          message: "Event not found",
          statusCode: ERROR_STATUS_MAP.NOT_FOUND,
        }),
      });
    }
    if (ev.userId !== user.id) {
      throw createError({
        statusCode: ERROR_STATUS_MAP.FORBIDDEN,
        statusMessage: "Forbidden",
        data: createErrorResponse({
          type: ErrorType.FORBIDDEN,
          code: "ACCESS_DENIED",
          message: "Access denied to this event",
          statusCode: ERROR_STATUS_MAP.FORBIDDEN,
        }),
      });
    }
    if (!ev.logoUrl) {
      throw createError({
        statusCode: ERROR_STATUS_MAP.NOT_FOUND,
        statusMessage: "Logo not set",
        data: createErrorResponse({
          type: ErrorType.NOT_FOUND,
          code: "LOGO_NOT_FOUND",
          message: "Logo not set for this event",
          statusCode: ERROR_STATUS_MAP.NOT_FOUND,
        }),
      });
    }

    const supabase = createAdminClient();
    const bucket = getStorageBucket();

    if (mode === "signed") {
      const seconds = Math.min(Math.max(Number(expires) || 600, 10), 3600);
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(ev.logoUrl, seconds);

      if (error || !data?.signedUrl) {
        throw createError({
          statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
          statusMessage: "Failed to sign URL",
          data: createErrorResponse({
            type: "SERVER_ERROR" as const,
            code: "SIGNED_URL_ERROR",
            message: error?.message || "Failed to create signed URL",
            statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
          }),
        });
      }
      return createSuccessResponse(
        {
          url: data.signedUrl,
          expiresIn: seconds,
        },
        "Signed URL created successfully",
      );
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .download(ev.logoUrl);

    if (error || !data) {
      console.error("Logo download error:", error);
      throw createError({
        statusCode: ERROR_STATUS_MAP.NOT_FOUND,
        statusMessage: "Logo not found",
        data: createErrorResponse({
          type: ErrorType.NOT_FOUND,
          code: "LOGO_NOT_FOUND",
          message: "Logo file not found in storage",
          statusCode: ERROR_STATUS_MAP.NOT_FOUND,
        }),
      });
    }

    const arrayBuf = await data.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    setHeader(event, "Content-Type", data.type || "application/octet-stream");
    setHeader(event, "Cache-Control", "private, max-age=60");
    setHeader(event, "Content-Disposition", 'inline; filename="logo"');
    return send(event, buf);
  } catch (error) {
    const apiError = handleApiError(error);
    throw createError({
      statusCode: apiError.statusCode || ERROR_STATUS_MAP.INTERNAL_ERROR,
      statusMessage: apiError.message,
      data: createErrorResponse(apiError),
    });
  }
});
