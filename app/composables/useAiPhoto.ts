import type { ApiResponse, Errors } from "~~/server/types/core";

type AiPhotoApi<T> = ApiResponse<T, Errors>;

export interface AIPhoto {
  id: string;
  style: string;
  storageUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIPhotoSession {
  sessionId: string;
  eventId: string;
  photos: AIPhoto[];
}

export interface AIPhotoDetail {
  id: string;
  style: string;
  storageUrl: string;
  sessionId: string;
  eventId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SignedUrlResponse {
  url: string;
  expiresIn: number;
}

export const useAiPhoto = () => {
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const getAuthHeaders = async () => {
    const supabase = useSupabaseClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      throw new Error("Not authenticated");
    }
    return {
      Authorization: `Bearer ${token}`,
    };
  };

  const getSessionAiPhotos = async (sessionId: string): Promise<AIPhotoSession | null> => {
    try {
      isLoading.value = true;
      error.value = null;

      const headers = await getAuthHeaders();
      const response = await $fetch<AiPhotoApi<AIPhotoSession>>(
        `/api/v1/aiphoto/get-aiphotos-by-session?sessionId=${sessionId}`,
        {
          headers,
        },
      );

      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error?.message || "Failed to get AI photos by session");
    } catch (err: unknown) {
      console.error("Error getting AI photos by session:", err);
      error.value = handleError(err, "Failed to get AI photos by session");
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const getAiPhotoById = async (aiPhotoId: string): Promise<AIPhotoDetail | null> => {
    try {
      isLoading.value = true;
      error.value = null;

      const headers = await getAuthHeaders();
      const response = await $fetch<AiPhotoApi<AIPhotoDetail>>(
        `/api/v1/aiphoto/get-aiphoto-by-id?aiPhotoId=${aiPhotoId}`,
        {
          headers,
        },
      );

      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error?.message || "Failed to get AI photo by ID");
    } catch (err: unknown) {
      console.error("Error getting AI photo by ID:", err);
      error.value = handleError(err, "Failed to get AI photo by ID");
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const getAiPhotoBlob = async (aiPhotoId: string): Promise<string | null> => {
    try {
      isLoading.value = true;
      error.value = null;

      const headers = await getAuthHeaders();
      const response = await fetch(`/api/v1/aiphoto/aiphoto?aiPhotoId=${aiPhotoId}&mode=blob`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to get AI photo blob: ${response.statusText}`);
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (err: unknown) {
      console.error("Error getting AI photo blob:", err);
      error.value = handleError(err, "Failed to get AI photo blob");
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const getAiPhotoSignedUrl = async (
    aiPhotoId: string,
    expires: number = 3600,
  ): Promise<SignedUrlResponse | null> => {
    try {
      isLoading.value = true;
      error.value = null;

      const headers = await getAuthHeaders();
      const response = await $fetch<AiPhotoApi<SignedUrlResponse>>(
        `/api/v1/aiphoto/aiphoto?aiPhotoId=${aiPhotoId}&mode=signed&expires=${expires}`,
        {
          headers,
        },
      );

      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error?.message || "Failed to get AI photo signed URL");
    } catch (err: unknown) {
      console.error("Error getting AI photo signed URL:", err);
      error.value = handleError(err, "Failed to get AI photo signed URL");
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const getAiPhotosBlobs = async (aiPhotos: AIPhoto[]): Promise<{ [key: string]: string }> => {
    const blobUrls: { [key: string]: string } = {};

    try {
      const promises = aiPhotos.map(async (photo) => {
        const blobUrl = await getAiPhotoBlob(photo.id);
        if (blobUrl) {
          blobUrls[photo.id] = blobUrl;
        }
      });

      await Promise.all(promises);
      return blobUrls;
    } catch (err: unknown) {
      console.error("Error getting AI photos blobs:", err);
      error.value = handleError(err, "Failed to get AI photos blobs");
      return blobUrls;
    }
  };

  const handleError = (err: unknown, defaultMessage: string): string => {
    if (err instanceof Error) {
      return err.message;
    }
    if (typeof err === "string") {
      return err;
    }
    return defaultMessage;
  };

  return {
    isLoading: readonly(isLoading),
    error: readonly(error),
    getSessionAiPhotos,
    getAiPhotoById,
    getAiPhotoBlob,
    getAiPhotoSignedUrl,
    getAiPhotosBlobs,
  };
};
