import { prismaClient } from "~~/server/clients";
import { Style } from "@prisma/client";

export async function createAIPhoto(photoSessionId: string, style: Style) {
  return await prismaClient.aIPhoto.create({
    data: {
      photoSessionId,
      style,
      generatedUrl: "",
    },
  });
}

export async function updateAIPhotoUrl(id: string, generatedUrl: string) {
  return await prismaClient.aIPhoto.update({
    where: { id },
    data: { generatedUrl },
  });
}

export async function getAIPhotoById(aiPhotoId: string, userId: string) {
  try {
    const aiPhotos = await prismaClient.aIPhoto.findFirst({
      where: {
        id: aiPhotoId,
        photoSession: {
          event: {
            profile: {
              userId: userId,
              isDeleted: false,
            },
          },
        },
      },
      include: {
        photoSession: {
          select: {
            id: true,
            eventId: true,
          },
        },
      },
    });
    return aiPhotos;
  } catch (error) {
    console.error("Error fetching AI photos:", error);
    throw error;
  }
}

export async function getAIPhotosBySession(photoSessionId: string, userId: string) {
  try {
    const aiPhotos = await prismaClient.aIPhoto.findMany({
      where: {
        photoSessionId: photoSessionId,
        photoSession: {
          event: {
            profile: {
              userId: userId,
              isDeleted: false,
            },
          },
        },
      },
    });
    const styleOrder = Object.values(Style) as Style[];
    aiPhotos.sort((a, b) => styleOrder.indexOf(a.style) - styleOrder.indexOf(b.style));
    return aiPhotos;
  } catch (error) {
    console.error("Error fetching AI photos:", error);
    throw error;
  }
}
