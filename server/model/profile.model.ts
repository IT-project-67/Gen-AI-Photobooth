import { prisma } from "../clients/prisma.client";

export const createProfile = async (userId: string) => {
  try {
    const profile = await prisma.profile.create({
      data: { userId },
    });
    return profile;
  } catch (error) {
    console.error("Error creating profile:", error);
    throw error;
  }
};

export const getProfileByUserId = async (userId: string) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: {
        userId,
        isDeleted: false,
      },
    });
    return profile;
  } catch (error) {
    console.error("Error fetching profile:", error);
    throw error;
  }
};

export const updateProfile = async (
  userId: string,
  data: { displayName?: string; organization?: string },
) => {
  try {
    // 只更新有变化的字段
    const updateData: { displayName?: string; organization?: string } = {};

    if (data.displayName !== undefined) {
      updateData.displayName = data.displayName;
    }
    if (data.organization !== undefined) {
      updateData.organization = data.organization;
    }

    const profile = await prisma.profile.update({
      where: {
        userId,
        isDeleted: false,
      },
      data: updateData,
    });
    return profile;
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
};

export const softDeleteProfile = async (userId: string) => {
  try {
    const profile = await prisma.profile.update({
      where: {
        userId,
        isDeleted: false,
      },
      data: {
        isDeleted: true,
      },
    });
    return profile;
  } catch (error) {
    console.error("Error soft deleting profile:", error);
    throw error;
  }
};

export const restoreProfile = async (userId: string) => {
  try {
    const profile = await prisma.profile.update({
      where: {
        userId,
        isDeleted: true,
      },
      data: {
        isDeleted: false,
      },
    });
    return profile;
  } catch (error) {
    console.error("Error restoring profile:", error);
    throw error;
  }
};
