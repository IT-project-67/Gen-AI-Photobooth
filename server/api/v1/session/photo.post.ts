import { createAdminClient, prismaClient } from "~~/server/clients";
import { handleApiError, requireAuth } from "~~/server/utils/auth";
import {
  getPhotoSessionById,
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
import { config } from "~~/server/config";
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

      const ev = await prismaClient.event.findFirst({
        where: {
          id: eventId,
          userId: user.id,
          isDeleted: false,
        },
      });

      if (!ev) {
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

      const photoSession = await getPhotoSessionById(sessionId);
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
      const storageConfig = config();

      console.log(
        "Uploading photo for user:",
        user.id,
        "event:",
        eventId,
        "session:",
        sessionId,
      );
      console.log("File info:", {
        name: file.name,
        type: file.type,
        size: file.size,
      });
      console.log("Storage bucket:", storageConfig.STORAGE_BUCKET);

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

        console.log("Upload result:", uploadResult);
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
