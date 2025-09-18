import { createAuthClient } from '../../../clients/supabase.client'
import { handleApiError } from '../../../utils/auth/error-handler.utils'
import { createSuccessResponse, createErrorResponse } from '../../../utils/core/response.utils'
import { softDeleteProfile } from '../../../model/profile.model'
import type { ApiResponse } from '../../../types/core/api-response.types'
import { ERROR_STATUS_MAP } from '../../../types/auth/auth-error.types'

interface ProfileResponse {
  userId: string
  displayName?: string | null
  organization?: string | null
  createdAt: string
  updatedAt: string
  isDeleted: boolean
}

export default defineEventHandler(async (event): Promise<ApiResponse<ProfileResponse>> => {
  try {
    const authHeader = getHeader(event, "authorization")
    const token = authHeader?.split(" ")[1]

    if (!authHeader || !token) {
      throw createError({
        statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
        statusMessage: "Missing authorization header",
        data: createErrorResponse({
          type: "AUTH_ERROR" as const,
          code: "AUTH_ERROR",
          message: "Missing authorization header",
          statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
        }),
      })
    }

    const supabase = createAuthClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      const error = handleApiError(authError)
      throw createError({
        statusCode: error.statusCode || ERROR_STATUS_MAP.AUTH_ERROR,
        statusMessage: error.message,
        data: createErrorResponse(error),
      })
    }

    const deletedProfile = await softDeleteProfile(user.id)

    const profileResponse = {
      userId: deletedProfile.userId,
      displayName: deletedProfile.displayName,
      organization: deletedProfile.organization,
      createdAt: deletedProfile.createdAt.toISOString(),
      updatedAt: deletedProfile.updatedAt.toISOString(),
      isDeleted: deletedProfile.isDeleted,
    }

    return createSuccessResponse(profileResponse, "Profile deleted successfully")

  } catch (error) {
    const apiError = handleApiError(error)
    throw createError({
      statusCode: apiError.statusCode || ERROR_STATUS_MAP.INTERNAL_ERROR,
      statusMessage: apiError.message,
      data: createErrorResponse(apiError),
    })
  }
})