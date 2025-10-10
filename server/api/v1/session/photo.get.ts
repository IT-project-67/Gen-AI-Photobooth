import { defineEventHandler, getQuery, createError, setHeader, send } from "h3";
import { createAdminClient } from "~~/server/clients";
import { getPhotoSessionById } from "~~/server/model";
import { handleApiError, requireAuth } from "~~/server/utils/auth";
import { ERROR_STATUS_MAP, type ErrorType } from "~~/server/types/core";
import { createErrorResponse } from "~~/server/utils/core";
import { getStorageBucket } from "~~/server/utils/storage/path.utils";

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuth(event);
    const { sessionId, mode, expires } = getQuery(event) as {
      sessionId: string;
      mode?: "blob" | "signed";
      expires?: string;
    };

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

    const photoSession = await getPhotoSessionById(sessionId, user.id);
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

    if (!photoSession.photoUrl) {
      throw createError({
        statusCode: ERROR_STATUS_MAP.NOT_FOUND,
        statusMessage: "No photo found",
        data: createErrorResponse({
          type: "NOT_FOUND" as ErrorType,
          code: "PHOTO_NOT_FOUND",
          message: "No photo found for this session",
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
        .createSignedUrl(photoSession.photoUrl, seconds);

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

    const { data, error } = await supabase.storage.from(bucket).download(photoSession.photoUrl);

    if (error || !data) {
      console.error("Photo download error:", error);
      throw createError({
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
        statusMessage: "Failed to download photo",
        data: createErrorResponse({
          type: "SERVER_ERROR" as const,
          code: "DOWNLOAD_ERROR",
          message: error?.message || "Failed to download photo",
          statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
        }),
      });
    }
    const arrayBuf = await data.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    setHeader(event, "Content-Type", data.type || "application/octet-stream");
    setHeader(event, "Cache-Control", "private, max-age=60");
    setHeader(event, "Content-Disposition", 'inline; filename="photo"');
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
