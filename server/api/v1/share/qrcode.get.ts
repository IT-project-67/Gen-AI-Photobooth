import { defineEventHandler, getQuery, createError, setHeader, send } from "h3";
import { handleApiError, requireAuth } from "~~/server/utils/auth";
import { getSharedPhotoById } from "~~/server/model";
import { getQRCodeFromStorage } from "~~/server/utils/share";
import {
  ERROR_STATUS_MAP,
  type ErrorType,
} from "~~/server/types/core";
import { createErrorResponse } from "~~/server/utils/core";

export default defineEventHandler(async (event) => {
  try {
    const _user = await requireAuth(event);
    const { shareId } = getQuery(event) as { shareId: string };

    if (!shareId) {
      throw createError({
        statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
        statusMessage: "Share ID is required",
        data: createErrorResponse({
          type: "VALIDATION_ERROR" as ErrorType,
          code: "MISSING_SHARE_ID",
          message: "Share ID is required",
          statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
        }),
      });
    }

    const sharedPhoto = await getSharedPhotoById(shareId);
    if (!sharedPhoto) {
      throw createError({
        statusCode: ERROR_STATUS_MAP.NOT_FOUND,
        statusMessage: "Share not found",
        data: createErrorResponse({
          type: "NOT_FOUND" as ErrorType,
          code: "SHARE_NOT_FOUND",
          message: "Share not found",
          statusCode: ERROR_STATUS_MAP.NOT_FOUND,
        }),
      });
    }

    if (sharedPhoto.qrExpiresAt < new Date()) {
      throw createError({
        statusCode: ERROR_STATUS_MAP.EXPIRED,
        statusMessage: "Share has expired",
        data: createErrorResponse({
          type: "EXPIRED" as ErrorType,
          code: "SHARE_EXPIRED",
          message: "This share has expired",
          statusCode: ERROR_STATUS_MAP.EXPIRED,
        }),
      });
    }

    const qrCodeBuffer = await getQRCodeFromStorage(sharedPhoto.qrCodeUrl);
    if (!qrCodeBuffer) {
      throw createError({
        statusCode: ERROR_STATUS_MAP.NOT_FOUND,
        statusMessage: "QR code not found",
        data: createErrorResponse({
          type: "NOT_FOUND" as ErrorType,
          code: "QR_CODE_NOT_FOUND",
          message: "QR code file not found in storage",
          statusCode: ERROR_STATUS_MAP.NOT_FOUND,
        }),
      });
    }

    setHeader(event, "Content-Type", "image/png");
    setHeader(event, "Cache-Control", "private, max-age=3600");
    setHeader(event, "Content-Disposition", 'inline; filename="qr-code.png"');

    return send(event, qrCodeBuffer);
  } catch (error) {
    const apiError = handleApiError(error);
    throw createError({
      statusCode: apiError.statusCode || ERROR_STATUS_MAP.INTERNAL_ERROR,
      statusMessage: apiError.message,
      data: createErrorResponse(apiError),
    });
  }
});
