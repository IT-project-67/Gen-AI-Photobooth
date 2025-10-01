import { prismaClient } from "~~/server/clients";
import type { Style } from "@prisma/client";

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

export async function getAIPhotosBySession(photoSessionId: string) {
  return await prismaClient.aIPhoto.findMany({
    where: { photoSessionId },
    orderBy: { createdAt: "asc" },
  });
}
