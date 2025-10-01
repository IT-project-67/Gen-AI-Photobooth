import type { ApiResponse, Errors } from "~~/server/types/core";

type AiPhotoApi<T> = ApiResponse<T, Errors>;
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

interface AIPhotoFileResponse {
  url: string;
  expiresIn?: number;
}

interface ImageLoadStatus {
  [key: string]: {
    loading: boolean;
    error: string | null;
    url: string | null;
  };
}

export const useAiPhoto = () => {
  const imageStatus = ref<ImageLoadStatus>({});
  const getAIPhotosBySession = async (sessionId: string) => {
    try {
      const response = await $fetch<AiPhotoApi<AIPhotosBySessionResponse>>(
        `/api/v1/aiphoto/by-session?sessionId=${sessionId}`,
      );

      if (!response.success) {
        throw new Error(response.error?.message || "Failed to fetch AI photos");
      }

      return {
        data: response.data,
        error: null,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch AI photos";
      return {
        data: null,
        error: errorMessage,
      };
    }
  };

  const getAIPhotoById = async (aiPhotoId: string) => {
    try {
      const response = await $fetch<AiPhotoApi<AIPhotoByIdResponse>>(
        `/api/v1/aiphoto/by-id?aiPhotoId=${aiPhotoId}`,
      );

      if (!response.success) {
        throw new Error(response.error?.message || "Failed to fetch AI photo");
      }

      return {
        data: response.data,
        error: null,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch AI photo";
      return {
        data: null,
        error: errorMessage,
      };
    }
  };

  const getAIPhotoFile = async (aiPhotoId: string, expires: number = 600) => {
    try {
      const response = await $fetch<AiPhotoApi<AIPhotoFileResponse>>(
        `/api/v1/aiphoto/file?aiPhotoId=${aiPhotoId}&mode=signed&expires=${expires}`,
      );

      if (!response.success) {
        throw new Error(
          response.error?.message || "Failed to fetch AI photo file",
        );
      }

      return {
        data: response.data,
        error: null,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch AI photo file";
      return {
        data: null,
        error: errorMessage,
      };
    }
  };

  const downloadAIPhotoFile = async (aiPhotoId: string) => {
    try {
      const response = await fetch(
        `/api/v1/aiphoto/file?aiPhotoId=${aiPhotoId}&mode=blob`,
      );

      if (!response.ok) {
        throw new Error("Failed to download AI photo file");
      }

      const blob = await response.blob();
      return {
        data: blob,
        error: null,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to download AI photo file";
      return {
        data: null,
        error: errorMessage,
      };
    }
  };

  const getMultipleAIPhotoFiles = async (
    aiPhotoIds: string[],
    expires: number = 600,
  ) => {
    try {
      const promises = aiPhotoIds.map((id) => getAIPhotoFile(id, expires));
      const results = await Promise.all(promises);

      const successResults = results.filter((result) => result.data);
      const errorResults = results.filter((result) => result.error);

      return {
        data: successResults.map((result) => result.data!),
        errors: errorResults.map((result) => result.error),
        error:
          errorResults.length > 0
            ? `Failed to fetch ${errorResults.length} images`
            : null,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Multiple image fetch failed";
      return {
        data: [],
        errors: [],
        error: errorMessage,
      };
    }
  };

  const preloadImage = async (aiPhotoId: string, expires: number = 600) => {
    imageStatus.value[aiPhotoId] = {
      loading: true,
      error: null,
      url: null,
    };

    try {
      const { data, error } = await getAIPhotoFile(aiPhotoId, expires);

      if (error || !data) {
        throw new Error(error || "Failed to get image URL");
      }
      const img = new Image();
      img.onload = () => {
        imageStatus.value[aiPhotoId] = {
          loading: false,
          error: null,
          url: data.url,
        };
      };
      img.onerror = () => {
        imageStatus.value[aiPhotoId] = {
          loading: false,
          error: "Failed to get image URL",
          url: null,
        };
      };
      img.src = data.url;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to get image URL";
      imageStatus.value[aiPhotoId] = {
        loading: false,
        error: errorMessage,
        url: null,
      };
    }
  };

  const preloadMultipleImages = async (
    aiPhotoIds: string[],
    expires: number = 600,
  ) => {
    const promises = aiPhotoIds.map((id) => preloadImage(id, expires));
    await Promise.all(promises);
  };

  const getImageStatus = (aiPhotoId: string) => {
    return (
      imageStatus.value[aiPhotoId] || {
        loading: false,
        error: null,
        url: null,
      }
    );
  };

  const clearImageStatus = (aiPhotoId?: string) => {
    if (aiPhotoId) {
      delete imageStatus.value[aiPhotoId];
    } else {
      imageStatus.value = {};
    }
  };

  return {
    getAIPhotosBySession,
    getAIPhotoById,
    getAIPhotoFile,
    downloadAIPhotoFile,

    getMultipleAIPhotoFiles,
    preloadImage,
    preloadMultipleImages,

    imageStatus: readonly(imageStatus),
    getImageStatus,
    clearImageStatus,
  };
};
