// server/api/v1/profile/oauth.post.ts
import { createAuthClient } from "../../../clients/supabase.client";
import {
  getAllProfile,
  createProfile,
  restoreProfile,
} from "../../../model/profile.model";
import type { OAuthError } from "../../../types/profile/oauth.types";
import { ERROR_STATUS_MAP } from "../../../types/core/error-match.types";

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
