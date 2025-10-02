import { createAdminClient } from "~~/server/clients";
import { handleApiError, requireAuth } from "~~/server/utils/auth";
import {
  getPhotoSessionById,
  getEventById,
  updatePhotoSessionPhotoUrl,
} from "~~/server/model";
import {
  ERROR_STATUS_MAP,
  type ErrorType,
  type ApiResponse,
} from "~~/server/types/core";
import {
  createErrorResponse,
  createSuccessResponse,
} from "~~/server/utils/core";
import {
  normalizeFilePart,
  validateFileOrThrow,
} from "~~/server/utils/storage/validation.utils";
import { uploadPhoto } from "~~/server/utils/storage";
import type { PhotoUploadResponse } from "~~/server/types/session";

export default defineEventHandler(
  async (event): Promise<ApiResponse<PhotoUploadResponse>> => {
    try {
      const user = await requireAuth(event);
      const form = await readMultipartFormData(event);

      if (!form || form.length === 0) {
        throw createError({
          statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
          statusMessage: "No form data provided",
          data: createErrorResponse({
            type: "VALIDATION_ERROR" as ErrorType,
            code: "MISSING_FORM_DATA",
            message: "No form data provided",
            statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
          }),
        });
      }

      let eventId: string | undefined;
      let sessionId: string | undefined;
      let photoFilePart: FilePart | undefined;

      for (const field of form) {
        if (field.name === "eventId" && field.data) {
          eventId = field.data.toString();
        } else if (field.name === "sessionId" && field.data) {
          sessionId = field.data.toString();
        } else if (field.name === "photoFile") {
          photoFilePart = field;
        }
      }

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

      if (!photoFilePart) {
        throw createError({
          statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
          statusMessage: "Photo file is required",
          data: createErrorResponse({
            type: "VALIDATION_ERROR" as ErrorType,
            code: "MISSING_PHOTO_FILE",
            message: "Photo file is required",
            statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
          }),
        });
      }

      const file = normalizeFilePart(photoFilePart);
      if (!file) {
        throw createError({
          statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
          statusMessage: "Invalid photo file",
          data: createErrorResponse({
            type: "VALIDATION_ERROR" as ErrorType,
            code: "INVALID_PHOTO_FILE",
            message: "Invalid photo file",
            statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
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
            type: "NOT_FOUND" as ErrorType,
            code: "EVENT_NOT_FOUND",
            message: "Event not found or access denied",
            statusCode: ERROR_STATUS_MAP.NOT_FOUND,
          }),
        });
      }

      const photoSession = await getPhotoSessionById(sessionId, user.id);
      if (!photoSession || photoSession.eventId !== eventId) {
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

      const supabase = createAdminClient();
      const runtimeConfig = useRuntimeConfig();

      let uploadResult;
      try {
        uploadResult = await uploadPhoto(
          supabase,
          file,
          user.id,
          eventId,
          sessionId,
          "photo",
          runtimeConfig.public.supabaseUrl,
        );
      } catch (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      await updatePhotoSessionPhotoUrl(sessionId, uploadResult.path);

      return createSuccessResponse(
        {
          sessionId,
          photoUrl: uploadResult.path,
          fileInfo: { name: file.name, type: file.type, size: file.size },
        },
        "Photo uploaded successfully",
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
