import { createAdminClient, prismaClient } from "~~/server/clients";
import { handleApiError, requireAuth } from "~~/server/utils/auth";
import type { LogoUploadResponse } from "~~/server/types/events";
import { config } from "~~/server/config";
import {
  allowedType,
  allowedExts,
  MAX_FILE_SIZE,
} from "~~/server/types/storage";
import {
  ERROR_STATUS_MAP,
  ErrorType,
  type ApiResponse,
} from "~~/server/types/core";
import {
  createErrorResponse,
  createSuccessResponse,
} from "~~/server/utils/core";

export default defineEventHandler(
  async (event): Promise<ApiResponse<LogoUploadResponse>> => {
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
      let file: {
        name: string;
        type: string;
        data: Buffer;
        size: number;
      } | null = null;
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
          let type = f.type;
          if (!type) {
            const ext = (f.filename.split(".").pop() || "").toLowerCase();
            const mimeMap: Record<string, string> = {
              png: "image/png",
              jpg: "image/jpeg",
              jpeg: "image/jpeg",
              webp: "image/webp",
              svg: "image/svg+xml",
              ico: "image/x-icon",
            };
            type = mimeMap[ext] || "image/jpeg";
          }
          const data = Buffer.isBuffer(f.data) ? f.data : Buffer.from(f.data);
          file = { name: f.filename, type, data, size: data.length };
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
      if (!file) {
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

      const ev = await prismaClient.event.findUnique({
        where: { id: eventId },
      });
      const supabase = createAdminClient();
      const ext = file.name.split(".").pop();
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
      if (!allowedType.includes(file.type)) {
        throw createError({
          statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
          statusMessage: "Invalid file type",
          data: createErrorResponse({
            type: "VALIDATION_ERROR" as const,
            code: "INVALID_FILE_TYPE",
            message:
              "Invalid file type. Only JPEG, JPG, PNG, WebP, SVG, and ICO are allowed",
            statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
          }),
        });
      }
      if (file.size > MAX_FILE_SIZE) {
        throw createError({
          statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
          statusMessage: "File too large",
          data: createErrorResponse({
            type: "VALIDATION_ERROR" as const,
            code: "FILE_TOO_LARGE",
            message: "File too large. Maximum size is 5MB",
            statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
          }),
        });
      }
      if (!ext) {
        throw createError({
          statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
          statusMessage: "Invalid file name",
          data: createErrorResponse({
            type: "VALIDATION_ERROR" as const,
            code: "INVALID_FILE_NAME",
            message:
              "File must have a valid extension (png, jpg, jpeg, webp, svg, ico)",
            statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
          }),
        });
      }

      const extLower = ext.toLowerCase();
      if (!allowedExts.includes(extLower)) {
        throw createError({
          statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
          statusMessage: "Invalid file extension",
          data: createErrorResponse({
            type: "VALIDATION_ERROR" as const,
            code: "INVALID_FILE_EXTENSION",
            message: `Invalid file extension. Allowed: ${allowedExts.join(", ")}`,
            statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
          }),
        });
      }

      const path = `Logo/${user.id}/${eventId}/logo.${extLower}`;
      const { error } = await supabase.storage
        .from(config().STORAGE_BUCKET)
        .upload(path, file.data, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        throw createError({
          statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
          statusMessage: "Upload failed",
          data: createErrorResponse({
            type: "SERVER_ERROR" as const,
            code: "STORAGE_UPLOAD_ERROR",
            message: error.message,
            statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
          }),
        });
      }

      await prismaClient.event.update({
        where: { id: eventId },
        data: { logoUrl: path },
      });

      return createSuccessResponse(
        {
          eventId,
          logoUrl: path,
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
  },
);
