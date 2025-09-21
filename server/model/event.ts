import { prisma } from "~~/server/clients/prisma.client";
import type { CreateEventParams } from "~~/server/types/events/model.types";

export const createEvent = async ({
  name,
  profileId,
  logoUrl,
  startDate,
  endDate,
}: CreateEventParams) => {
  try {
    const newEvent = await prisma.event.create({
      data: {
        name: name,
        userId: profileId,
        logoUrl: logoUrl || null,
        startDate: startDate,
        endDate: endDate,
      },
    });
    return newEvent;
  } catch (error) {
    console.error("Error creating event:", error);
    throw error;
  }
};

export const getEventById = async (id: string) => {
  try {
    const targetEvent = await prisma.event.findUnique({
      where: { id },
    });
    return targetEvent;
  } catch (error) {
    console.error("Error fetching event:", error);
    throw error;
  }
};

export const getEventsByProfileId = async (profileId: string) => {
  try {
    const targetEvent = await prisma.event.findMany({
      where: { userId: profileId },
    });
    return targetEvent;
  } catch (error) {
    console.error("Error fetching events:", error);
    throw error;
  }
};
