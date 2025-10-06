import { prismaClient } from "~~/server/clients";
import type { SharedPhotoData } from "~~/server/types/share";

export async function createSharedPhoto(
  aiPhotoId: string,
  eventId: string,
  selectedUrl: string,
  qrCodeUrl: string,
  qrExpiresAt: Date,
): Promise<SharedPhotoData> {
  const sharedPhoto = await prismaClient.sharedPhoto.create({
    data: {
      aiPhotoId,
      eventId,
      selectedUrl,
      qrCodeUrl,
      qrExpiresAt,
    },
  });

  return {
    id: sharedPhoto.id,
    aiPhotoId: sharedPhoto.aiPhotoId,
    eventId: sharedPhoto.eventId,
    selectedUrl: sharedPhoto.selectedUrl,
    qrCodeUrl: sharedPhoto.qrCodeUrl,
    qrExpiresAt: sharedPhoto.qrExpiresAt,
    createdAt: sharedPhoto.createdAt,
  };
}

export async function getSharedPhotoById(shareId: string): Promise<{
  id: string;
  aiPhotoId: string;
  eventId: string;
  selectedUrl: string;
  qrCodeUrl: string;
  qrExpiresAt: Date;
  createdAt: Date;
  event: { id: string; name: string };
  aiPhoto: { id: string; style: string; generatedUrl: string };
} | null> {
  const sharedPhoto = await prismaClient.sharedPhoto.findFirst({
    where: {
      id: shareId,
    },
    include: {
      event: {
        select: {
          id: true,
          name: true,
        },
      },
      aiPhoto: {
        select: {
          id: true,
          style: true,
          generatedUrl: true,
        },
      },
    },
  });

  if (!sharedPhoto) {
    return null;
  }

  return sharedPhoto;
}

export async function getSharedPhotosByEvent(eventId: string): Promise<
  {
    id: string;
    aiPhotoId: string;
    eventId: string;
    selectedUrl: string;
    qrCodeUrl: string;
    qrExpiresAt: Date;
    createdAt: Date;
    event: { id: string; name: string };
    aiPhoto: { id: string; style: string; generatedUrl: string };
  }[]
> {
  const sharedPhotos = await prismaClient.sharedPhoto.findMany({
    where: { eventId },
    include: {
      event: {
        select: {
          id: true,
          name: true,
        },
      },
      aiPhoto: {
        select: {
          id: true,
          style: true,
          generatedUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return sharedPhotos;
}

export async function getSharedPhotoByAIPhoto(aiphotoId: string): Promise<{
  id: string;
  aiPhotoId: string;
  eventId: string;
  selectedUrl: string;
  qrCodeUrl: string;
  qrExpiresAt: Date;
  createdAt: Date;
  event: { id: string; name: string };
  aiPhoto: { id: string; style: string; generatedUrl: string };
} | null> {
  const sharedPhoto = await prismaClient.sharedPhoto.findFirst({
    where: { aiPhotoId: aiphotoId },
    include: {
      event: {
        select: {
          id: true,
          name: true,
        },
      },
      aiPhoto: {
        select: {
          id: true,
          style: true,
          generatedUrl: true,
        },
      },
    },
  });

  if (!sharedPhoto) {
    return null;
  }

  return sharedPhoto;
}

// export async function deleteSharedPhoto(shareId: string): Promise<void> {
//   await prismaClient.sharedPhoto.delete({
//     where: { id: shareId },
//   });
// }
