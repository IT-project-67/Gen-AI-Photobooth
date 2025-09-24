import { getAllProfile, createProfile, restoreProfile } from "~~/server/model";
import type { OAuthError } from "~~/server/types/profile";
import { ERROR_STATUS_MAP } from "~~/server/types/core";
import { createAuthClient } from "~~/server/clients";

export default defineEventHandler(async (event) => {
  try {
    const authHeader = getHeader(event, "authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) {
      throw createError({
        statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
        statusMessage: "Missing authorization token",
      });
    }

    const supabase = createAuthClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw createError({
        statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
        statusMessage: "Invalid token",
      });
    }

    const existingProfile = await getAllProfile(user.id);

    if (!existingProfile) {
      const displayName =
        user.user_metadata?.displayName ||
        user.user_metadata?.full_name ||
        "user";
      const newProfile = await createProfile(user.id, displayName);
      return {
        success: true,
        profile: newProfile,
        message: "Profile created successfully",
      };
    } else if (existingProfile.isDeleted) {
      restoreProfile(existingProfile.userId);
      return {
        success: false,
        profile: existingProfile,
        message: "Profile recovered successfully",
      };
    }
  } catch (error: unknown) {
    throw createError({
      statusCode:
        (error as OAuthError)?.statusCode || ERROR_STATUS_MAP.INTERNAL_ERROR,
      statusMessage:
        error instanceof Error
          ? error.message
          : "OAuth profile creation failed",
    });
  }
});
