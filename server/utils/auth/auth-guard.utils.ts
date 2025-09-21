import { ERROR_STATUS_MAP, type H3Error } from "~~/server/types/core";
import { createAuthClient } from "~~/server/clients/supabase.client";
import type { UserData } from "~~/server/types/domain";
import { handleAuthError } from "./error-handler.utils";
import type { H3Event } from "h3";

// Extend H3Event context to include user
declare module "h3" {
  interface H3EventContext {
    user?: UserData;
  }
}

// Middleware to verify authentication
export const requireAuth = async (event: H3Event): Promise<UserData> => {
  const authHeader = getHeader(event, "authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw createError({
      statusCode: 401,
      statusMessage: "Missing or invalid authorization header",
    });
  }

  const token = authHeader.substring(7);
  try {
    const supabase = createAuthClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      const authError = handleAuthError(error);
      throw createError({
        statusCode: authError.statusCode || 401,
        statusMessage: authError.message,
      });
    }

    const userData: UserData = {
      id: user.id,
      email: user.email || "",
      email_confirmed_at: user.email_confirmed_at || null,
      created_at: user.created_at || new Date().toISOString(),
      updated_at: user.updated_at || new Date().toISOString(),
    };

    // Add user to event context
    event.context.user = userData;

    return userData;
  } catch (error: unknown) {
    // Type guard to check if error has H3 error structure
    const isH3Error = (err: unknown): err is H3Error => {
      return typeof err === "object" && err !== null && "statusCode" in err;
    };

    // If it's an H3 error with statusCode, re-throw it
    if (isH3Error(error) && error.statusCode) {
      throw error;
    }

    // For all other errors, create a generic auth error
    throw createError({
      statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
      statusMessage: "Invalid or expired token",
    });
  }
};

// Optional auth middleware (doesn't throw error if not authenticated)
export const optionalAuth = async (
  event: H3Event,
): Promise<UserData | null> => {
  try {
    return await requireAuth(event);
  } catch {
    return null;
  }
};
