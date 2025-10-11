import { prismaClient } from "~~/server/clients";

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

export const getPhotoSessionById = async (sessionId: string, userId: string) => {
  try {
    const photoSession = await prismaClient.photoSession.findFirst({
      where: {
        id: sessionId,
        event: {
          userId: userId,
          profile: {
            isDeleted: false,
          },
        },
      },
    });
    return photoSession;
  } catch (error) {
    console.error("Error fetching photo session:", error);
    throw error;
  }
};

export const updatePhotoSessionPhotoUrl = async (sessionId: string, photoUrl: string) => {
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
