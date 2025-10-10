import { handleApiError, requireAuth } from "~~/server/utils/auth";
import {
  getEventById,
  getAIPhotoById,
  createSharedPhoto,
  getSharedPhotoByAIPhoto,
} from "~~/server/model";
import { ERROR_STATUS_MAP, type ErrorType, type ApiResponse } from "~~/server/types/core";
import { createErrorResponse, createSuccessResponse } from "~~/server/utils/core";
import { generateAndUploadQRCode } from "~~/server/utils/share";
import type { CreateShareRequest, CreateShareResponse } from "~~/server/types/share";

export default defineEventHandler(async (event): Promise<ApiResponse<CreateShareResponse>> => {
  try {
    const user = await requireAuth(event);
    const body = await readBody<CreateShareRequest>(event);

    if (!body.eventId) {
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

    if (!body.aiphotoId) {
      throw createError({
        statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
        statusMessage: "AI Photo ID is required",
        data: createErrorResponse({
          type: "VALIDATION_ERROR" as ErrorType,
          code: "MISSING_AIPHOTO_ID",
          message: "AI Photo ID is required",
          statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
        }),
      });
    }

    const expiresInSeconds = body.expiresInSeconds || 7 * 24 * 60 * 60;
    const userEvent = await getEventById(body.eventId, user.id);
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

    const aiPhoto = await getAIPhotoById(body.aiphotoId, user.id);
    if (!aiPhoto || aiPhoto.photoSession.eventId !== body.eventId) {
      throw createError({
        statusCode: ERROR_STATUS_MAP.NOT_FOUND,
        statusMessage: "AI Photo not found",
        data: createErrorResponse({
          type: "NOT_FOUND" as ErrorType,
          code: "AIPHOTO_NOT_FOUND",
          message: "AI Photo not found or access denied",
          statusCode: ERROR_STATUS_MAP.NOT_FOUND,
        }),
      });
    }

    const existingShare = await getSharedPhotoByAIPhoto(body.aiphotoId);
    if (existingShare) {
      if (existingShare.qrExpiresAt > new Date()) {
        let qrCodeUrl = existingShare.qrCodeUrl;

        if (!qrCodeUrl || qrCodeUrl.trim() === "") {
          const { generateAndUploadQRCode } = await import("~~/server/utils/share");
          qrCodeUrl = await generateAndUploadQRCode(
            aiPhoto.generatedUrl,
            user.id,
            body.eventId,
            aiPhoto.photoSessionId,
            expiresInSeconds,
          );

          const { prismaClient } = await import("~~/server/clients/prisma.client");
          await prismaClient.sharedPhoto.update({
            where: { id: existingShare.id },
            data: { qrCodeUrl: qrCodeUrl },
          });
        }

        const { createSignedUrlForAIPhoto } = await import("~~/server/utils/share");
        const shareUrl = await createSignedUrlForAIPhoto(aiPhoto.generatedUrl, expiresInSeconds);

        return createSuccessResponse(
          {
            shareId: existingShare.id,
            qrCodeUrl: qrCodeUrl,
            expiresAt: existingShare.qrExpiresAt.toISOString(),
            shareUrl,
          },
          "Share already exists",
        );
      }
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const sharedPhoto = await createSharedPhoto(
      body.aiphotoId,
      body.eventId,
      aiPhoto.generatedUrl,
      "",
      expiresAt,
    );

    const qrCodePath = await generateAndUploadQRCode(
      aiPhoto.generatedUrl,
      user.id,
      body.eventId,
      aiPhoto.photoSessionId,
      expiresInSeconds,
    );

    const { prismaClient } = await import("~~/server/clients/prisma.client");
    await prismaClient.sharedPhoto.update({
      where: { id: sharedPhoto.id },
      data: { qrCodeUrl: qrCodePath },
    });

    const { createSignedUrlForAIPhoto } = await import("~~/server/utils/share");
    const shareUrl = await createSignedUrlForAIPhoto(aiPhoto.generatedUrl, expiresInSeconds);

    return createSuccessResponse(
      {
        shareId: sharedPhoto.id,
        qrCodeUrl: qrCodePath,
        expiresAt: expiresAt.toISOString(),
        shareUrl,
      },
      "Share created successfully",
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
