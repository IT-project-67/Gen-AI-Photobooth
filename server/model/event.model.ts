import type { EventStruct } from "~~/server/types/event/model.types";
import { prismaClient } from "~~/server/clients/prisma.client";

export const createEvent = async ({ name, userId, logoUrl, startDate, endDate }: EventStruct) => {
  try {
    const newEvent = await prismaClient.event.create({
      data: {
        name: name,
        userId: userId,
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

export const getEventById = async (id: string, userId: string) => {
  try {
    const targetEvent = await prismaClient.event.findFirst({
      where: {
        id,
        userId: userId,
        profile: {
          isDeleted: false,
        },
      },
    });
    return targetEvent;
  } catch (error) {
    console.error("Error fetching event:", error);
    throw error;
  }
};

export const getEventsByProfile = async (userId: string, order: "asc" | "desc" = "desc") => {
  try {
    const targetEvent = await prismaClient.event.findMany({
      where: {
        userId: userId,
        profile: {
          isDeleted: false,
        },
      },
      orderBy: { createdAt: order },
    });
    return targetEvent;
  } catch (error) {
    console.error("Error fetching events:", error);
    throw error;
  }
};

export const updateEventLogoUrl = async (eventId: string, logoUrl: string) => {
  try {
    const updatedEvent = await prismaClient.event.update({
      where: { id: eventId },
      data: { logoUrl },
    });
    return updatedEvent;
  } catch (error) {
    console.error("Error updating event logo URL:", error);
    throw error;
  }
};
