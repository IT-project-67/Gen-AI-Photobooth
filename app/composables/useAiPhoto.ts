import type { ApiResponse } from "~~/server/types/core";

interface AIPhoto {
  id: string;
  style: string;
  storageUrl: string;
  createdAt: string;
  updatedAt: string;
}

interface AIPhotosBySessionResponse {
  sessionId: string;
  eventId: string;
  photos: AIPhoto[];
}

interface AIPhotoByIdResponse {
  id: string;
  style: string;
  storageUrl: string;
  sessionId: string;
  eventId: string;
  createdAt: string;
  updatedAt: string;
}

export const useAiPhoto = () => {
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const supabase = useSupabaseClient();

  const getAccessToken = async () => {
    const session = await supabase.auth.getSession();
    return session.data.session?.access_token ?? null;
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

  const getSessionAiPhotos = async (sessionId: string): Promise<AIPhotosBySessionResponse | null> => {
    try {
      isLoading.value = true;
      error.value = null;

      const token = await getAccessToken();
      if (!token) throw new Error("No access token");

      const response: ApiResponse<AIPhotosBySessionResponse> = await $fetch(
        `/api/v1/aiphoto/by-session?sessionId=${sessionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      return response?.data ?? null;
    } catch (err: unknown) {
      console.error("Error getting AI photos by session:", err);
      error.value = handleError(err, "Failed to get AI photos");
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const getAiPhotoById = async (aiPhotoId: string): Promise<AIPhotoByIdResponse | null> => {
    try {
      isLoading.value = true;
      error.value = null;

      const token = await getAccessToken();
      if (!token) throw new Error("No access token");

      const response: ApiResponse<AIPhotoByIdResponse> = await $fetch(
        `/api/v1/aiphoto/by-id?aiPhotoId=${aiPhotoId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      return response?.data ?? null;
    } catch (err: unknown) {
      console.error("Error getting AI photo by ID:", err);
      error.value = handleError(err, "Failed to get AI photo");
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const getAiPhotoFile = async (aiPhotoId: string): Promise<string | null> => {
    try {
      isLoading.value = true;
      error.value = null;

      const token = await getAccessToken();
      if (!token) throw new Error("No access token");

      const response = await fetch(
        `/api/v1/aiphoto/file?aiPhotoId=${aiPhotoId}&mode=blob`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get AI photo file: ${response.statusText}`);
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (err: unknown) {
      console.error("Error getting AI photo file:", err);
      error.value = handleError(err, "Failed to get AI photo file");
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const getAiPhotoUrl = (storageUrl: string): string => {
    const config = useRuntimeConfig();
    return `${config.public.supabaseUrl}/storage/v1/object/public/${config.public.storageBucket}/${storageUrl}`;
  };

  return {
    isLoading: readonly(isLoading),
    error: readonly(error),
    getSessionAiPhotos,
    getAiPhotoById,
    getAiPhotoFile,
    getAiPhotoUrl,
  };
};
