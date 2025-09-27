import { prismaClient } from "~~/server/clients/prisma.client";

export const createPhotoSession = async (eventId: string) => {
  try {
    const photoSession = await prismaClient.photoSession.create({
      data: {
        eventId,
      },
    });
    return photoSession;
  } catch (error) {
    console.error("Error creating photo session:", error);
    throw error;
  }
};

export const getPhotoSessionById = async (sessionId: string) => {
  try {
    const photoSession = await prismaClient.photoSession.findUnique({
      where: {
        id: sessionId,
      },
    });
    return photoSession;
  } catch (error) {
    console.error("Error fetching photo session:", error);
    throw error;
  }
};

export const updatePhotoSessionPhotoUrl = async (
  sessionId: string,
  photoUrl: string,
) => {
  try {
    const photoSession = await prismaClient.photoSession.update({
      where: {
        id: sessionId,
      },
      data: {
        photoUrl,
      },
    });
    return photoSession;
  } catch (error) {
    console.error("Error updating photo session photo URL:", error);
    throw error;
  }
};
