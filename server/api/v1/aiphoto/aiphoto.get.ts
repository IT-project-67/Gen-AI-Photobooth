import { defineEventHandler, getQuery, createError, setHeader } from "h3";
import { createAdminClient } from "~~/server/clients";
import { requireAuth } from "~~/server/utils/auth";
import { ERROR_STATUS_MAP } from "~~/server/types/core";
import {
  createErrorResponse,
  createSuccessResponse,
} from "~~/server/utils/core";
import { getStorageBucket } from "~~/server/utils/storage/path.utils";
import { getAIPhotoById } from "~~/server/model";

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuth(event);
    const { aiPhotoId, mode, expires } = getQuery(event) as {
      aiPhotoId?: string;
      mode?: "blob" | "signed";
      expires?: string;
    };

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

    const aiPhoto = await getAIPhotoById(aiPhotoId, user.id);
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

    if (!aiPhoto.generatedUrl) {
      throw createError({
        statusCode: ERROR_STATUS_MAP.NOT_FOUND,
        statusMessage: "AI Photo file not found",
        data: createErrorResponse({
          type: "NOT_FOUND" as const,
          code: "FILE_NOT_FOUND",
          message: "AI Photo file not found in storage",
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
        .createSignedUrl(aiPhoto.generatedUrl, seconds);

      if (error || !data?.signedUrl) {
        throw createError({
          statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
          statusMessage: "Failed to create signed URL",
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
      .download(aiPhoto.generatedUrl);

    if (error || !data) {
      console.error("AI Photo download error:", error);
      throw createError({
        statusCode: ERROR_STATUS_MAP.NOT_FOUND,
        statusMessage: "AI Photo file not found",
        data: createErrorResponse({
          type: "NOT_FOUND" as const,
          code: "FILE_NOT_FOUND",
          message: "AI Photo file not found in storage",
          statusCode: ERROR_STATUS_MAP.NOT_FOUND,
        }),
      });
    }

    const arrayBuf = await data.arrayBuffer();
    const buf = Buffer.from(arrayBuf);

    setHeader(event, "Content-Type", "image/jpeg");
    setHeader(event, "Content-Length", buf.length);
    setHeader(
      event,
      "Content-Disposition",
      `inline; filename="${aiPhoto.style.toLowerCase()}.jpg"`,
    );
    setHeader(event, "Cache-Control", "public, max-age=3600");

    return buf;
  } catch (error) {
    console.error("Error fetching AI photo file:", error);
    throw error;
  }
});
