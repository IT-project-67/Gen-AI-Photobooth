import { defineEventHandler, readMultipartFormData, createError } from "h3";
import { createAdminClient } from "~~/server/clients";
import { handleApiError, requireAuth } from "~~/server/utils/auth";
import type { LogoUploadResponse } from "~~/server/types/event";
import { updateEventLogoUrl, getEventById } from "~~/server/model";
import { ERROR_STATUS_MAP, ErrorType, type ApiResponse } from "~~/server/types/core";
import { createErrorResponse, createSuccessResponse } from "~~/server/utils/core";
import { normalizeFilePart, validateFileOrThrow } from "~~/server/utils/storage/validation.utils";
import { uploadLogo } from "~~/server/utils/storage";
import { config } from "~~/server/config";

export default defineEventHandler(async (event): Promise<ApiResponse<LogoUploadResponse>> => {
  try {
    const user = await requireAuth(event);
    const form = await readMultipartFormData(event);
    if (!form) {
      throw createError({
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
        statusMessage: "No form data",
        data: createErrorResponse({
          type: "VALIDATION_ERROR" as const,
          code: "MISSING_FORM_DATA",
          message: "No form data provided",
          statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
        }),
      });
    }

    let eventId = "";
    let logoFilePart = null;

    for (const f of form) {
      if (f.name === "eventId") {
        if (typeof f.data === "string") {
          eventId = f.data;
        } else if (Buffer.isBuffer(f.data)) {
          eventId = f.data.toString("utf8");
        } else if (f.data) {
          eventId = String(f.data);
        }
      }
      if (f.name === "logo" && f.filename && f.data?.length) {
        logoFilePart = f;
      }
    }

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

    if (!logoFilePart) {
      throw createError({
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
        statusMessage: "No logo file",
        data: createErrorResponse({
          type: "VALIDATION_ERROR" as const,
          code: "MISSING_LOGO_FILE",
          message: "No logo file provided",
          statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
        }),
      });
    }

    const file = normalizeFilePart(logoFilePart);
    if (!file) {
      throw createError({
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
        statusMessage: "Invalid file data",
        data: createErrorResponse({
          type: "VALIDATION_ERROR" as const,
          code: "INVALID_FILE_DATA",
          message: "Invalid file data provided",
          statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
        }),
      });
    }

    validateFileOrThrow(file);

    const userEvent = await getEventById(eventId, user.id);
    if (!userEvent) {
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

    const supabase = createAdminClient();
    const runtimeConfig = useRuntimeConfig();
    const storageConfig = config();

    let uploadResult;
    try {
      uploadResult = await uploadLogo(
        supabase,
        file,
        user.id,
        eventId,
        runtimeConfig.public.supabaseUrl,
        storageConfig.STORAGE_BUCKET,
      );
    } catch (uploadError) {
      console.error("Upload error:", uploadError);
      throw uploadError;
    }

    await updateEventLogoUrl(eventId, uploadResult.path);

    return createSuccessResponse(
      {
        eventId,
        logoUrl: uploadResult.path,
        fileInfo: { name: file.name, type: file.type, size: file.size },
      },
      "Logo uploaded successfully",
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
