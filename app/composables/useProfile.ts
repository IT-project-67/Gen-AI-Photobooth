import type { ApiResponse } from "~~/server/types/core";

export interface ProfileData {
  userId: string;
  displayName: string | null;
  organization: string | null;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

export interface EventListItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SharedPhotoItem {
  id: string;
  eventId: string;
  aiphotoId: string;
  selectedUrl: string;
  qrCodeUrl: string;
  qrExpiresAt: string;
  createdAt: string;
  event: {
    id: string;
    name: string;
  };
  aiPhoto: {
    id: string;
    style: string;
    generatedUrl: string;
  };
}

export interface PaginatedPhotosResult {
  photos: SharedPhotoItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export const useProfile = () => {
  const profile = ref<ProfileData | null>(null);
  const events = ref<EventListItem[]>([]);
  const sharedPhotos = ref<SharedPhotoItem[]>([]);
  const blobUrls = ref(new Map<string, string>());
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const supabase = useSupabaseClient();

  const getAccessToken = async (): Promise<string | null> => {
    const session = await supabase.auth.getSession();
    return session.data.session?.access_token ?? null;
  };

  const handleError = (err: unknown, defaultMessage: string): string => {
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    return defaultMessage;
  };

  const getProfile = async (): Promise<ProfileData | null> => {
    try {
      isLoading.value = true;
      error.value = null;

      const token = await getAccessToken();
      if (!token) throw new Error("No access token");

      const response: ApiResponse<ProfileData> = await $fetch(
        "/api/v1/profile",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response?.data) {
        profile.value = response.data;
        return response.data;
      }
      return null;
    } catch (err: unknown) {
      console.error("Error getting profile:", err);
      error.value = handleError(err, "Failed to get profile");
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const updateDisplayName = async (displayName: string): Promise<boolean> => {
    try {
      isLoading.value = true;
      error.value = null;

      const token = await getAccessToken();
      if (!token) throw new Error("No access token");

      const response: ApiResponse<ProfileData> = await $fetch(
        "/api/v1/profile",
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: { displayName },
        },
      );

      if (response?.data) {
        profile.value = response.data;
        return true;
      }
      return false;
    } catch (err: unknown) {
      console.error("Error updating displayName:", err);
      error.value = handleError(err, "Failed to update display name");
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const updateOrganization = async (
    organization: string,
  ): Promise<boolean> => {
    try {
      isLoading.value = true;
      error.value = null;

      const token = await getAccessToken();
      if (!token) throw new Error("No access token");

      const response: ApiResponse<ProfileData> = await $fetch(
        "/api/v1/profile",
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: { organization },
        },
      );

      if (response?.data) {
        profile.value = response.data;
        return true;
      }
      return false;
    } catch (err: unknown) {
      console.error("Error updating organization:", err);
      error.value = handleError(err, "Failed to update organization");
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const updateProfile = async (
    displayName?: string,
    organization?: string,
  ): Promise<boolean> => {
    try {
      isLoading.value = true;
      error.value = null;

      const token = await getAccessToken();
      if (!token) throw new Error("No access token");

      const body: { displayName?: string; organization?: string } = {};
      if (displayName !== undefined) body.displayName = displayName;
      if (organization !== undefined) body.organization = organization;

      if (Object.keys(body).length === 0) {
        throw new Error("At least one field must be provided");
      }

      const response: ApiResponse<ProfileData> = await $fetch(
        "/api/v1/profile",
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body,
        },
      );

      if (response?.data) {
        profile.value = response.data;
        return true;
      }
      return false;
    } catch (err: unknown) {
      console.error("Error updating profile:", err);
      error.value = handleError(err, "Failed to update profile");
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const getUserEvents = async (): Promise<EventListItem[]> => {
    try {
      isLoading.value = true;
      error.value = null;

      const token = await getAccessToken();
      if (!token) throw new Error("No access token");

      const response: ApiResponse<EventListItem[]> = await $fetch(
        "/api/v1/event/get-events-by-user",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response?.data) {
        events.value = response.data;
        return response.data;
      }
      return [];
    } catch (err: unknown) {
      console.error("Error getting user events:", err);
      error.value = handleError(err, "Failed to get events");
      return [];
    } finally {
      isLoading.value = false;
    }
  };

  const getEventSharedPhotos = async (
    eventId: string,
    page: number = 1,
    pageSize: number = 8,
  ): Promise<PaginatedPhotosResult> => {
    try {
      isLoading.value = true;
      error.value = null;

      const token = await getAccessToken();
      if (!token) throw new Error("No access token");

      const response: ApiResponse<{ shares: SharedPhotoItem[] }> = await $fetch(
        `/api/v1/share/get-shares-by-event?eventId=${encodeURIComponent(eventId)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response?.data?.shares) {
        const allShares = response.data.shares;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedShares = allShares.slice(startIndex, endIndex);

        sharedPhotos.value = paginatedShares;

        const totalPages = Math.ceil(allShares.length / pageSize);

        return {
          photos: paginatedShares,
          total: allShares.length,
          page,
          pageSize,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        };
      }

      return {
        photos: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      };
    } catch (err: unknown) {
      console.error("Error getting event shared photos:", err);
      error.value = handleError(err, "Failed to get shared photos");
      return {
        photos: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      };
    } finally {
      isLoading.value = false;
    }
  };

  const fetchPhotoBlobs = async (
    aiPhotoIds: string[],
  ): Promise<Map<string, string>> => {
    try {
      isLoading.value = true;
      error.value = null;

      const token = await getAccessToken();
      if (!token) throw new Error("No access token");
      const promises = aiPhotoIds.map(async (aiPhotoId) => {
        if (blobUrls.value.has(aiPhotoId)) {
          return { aiPhotoId, blobUrl: blobUrls.value.get(aiPhotoId)! };
        }

        try {
          const response = await fetch(
            `/api/v1/aiphoto/aiphoto?aiPhotoId=${encodeURIComponent(aiPhotoId)}&mode=blob`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );

          if (!response.ok) {
            throw new Error(`Failed to fetch photo: ${response.statusText}`);
          }

          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);

          return { aiPhotoId, blobUrl };
        } catch (err) {
          console.error(`Error fetching photo ${aiPhotoId}:`, err);
          return { aiPhotoId, blobUrl: null };
        }
      });

      const results = await Promise.all(promises);

      results.forEach(({ aiPhotoId, blobUrl }) => {
        if (blobUrl) {
          blobUrls.value.set(aiPhotoId, blobUrl);
        }
      });

      return blobUrls.value;
    } catch (err: unknown) {
      console.error("Error fetching photo blobs:", err);
      error.value = handleError(err, "Failed to fetch photos");
      return blobUrls.value;
    } finally {
      isLoading.value = false;
    }
  };

  const clearAllBlobUrls = (): void => {
    blobUrls.value.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    blobUrls.value.clear();
  };

  const clearBlobUrls = (aiPhotoIds: string[]): void => {
    aiPhotoIds.forEach((aiPhotoId) => {
      const url = blobUrls.value.get(aiPhotoId);
      if (url) {
        URL.revokeObjectURL(url);
        blobUrls.value.delete(aiPhotoId);
      }
    });
  };

  const getPhotoBlobUrl = (aiPhotoId: string): string | null => {
    return blobUrls.value.get(aiPhotoId) ?? null;
  };

  onUnmounted(() => {
    clearAllBlobUrls();
  });

  return {
    profile: readonly(profile),
    events: readonly(events),
    sharedPhotos: readonly(sharedPhotos),
    blobUrls: readonly(blobUrls),
    isLoading: readonly(isLoading),
    error: readonly(error),
    getProfile,
    updateDisplayName,
    updateOrganization,
    updateProfile,
    getUserEvents,
    getEventSharedPhotos,
    fetchPhotoBlobs,
    getPhotoBlobUrl,
    clearAllBlobUrls,
    clearBlobUrls,
  };
};


