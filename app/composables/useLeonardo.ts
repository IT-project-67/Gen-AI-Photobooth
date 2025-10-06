import type { ApiResponse, Errors } from "~~/server/types/core";

type LeonardoApi<T> = ApiResponse<T, Errors>;
interface LeonardoGenerateRequest {
  image: File;
  eventId: string;
  sessionId: string;
}

interface LeonardoGenerateResponse {
  imageId: string;
  sessionId: string;
  eventId: string;
  images: Array<{
    aiPhotoId: string;
    style: string;
    storageUrl: string;
    publicUrl: string;
    generationId: string;
  }>;
}

interface GenerationStatus {
  isGenerating: boolean;
  progress: number;
  currentStep: string;
  error: string | null;
}

export const useLeonardo = () => {
  const status = ref<GenerationStatus>({
    isGenerating: false,
    progress: 0,
    currentStep: "",
    error: null,
  });

  const generateImages = async (request: LeonardoGenerateRequest) => {
    try {
      status.value = {
        isGenerating: true,
        progress: 0,
        currentStep: "Prepare",
        error: null,
      };

      const supabase = useSupabaseClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const formData = new FormData();
      formData.append("image", request.image);
      formData.append("eventId", request.eventId);
      formData.append("sessionId", request.sessionId);

      status.value.currentStep = "Uploading";
      status.value.progress = 20;

      const response = await $fetch<LeonardoApi<LeonardoGenerateResponse>>(
        "/api/v1/leonardo/generate",
        {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.success) {
        throw new Error(response.error?.message || "Failed to generate images");
      }

      status.value = {
        isGenerating: false,
        progress: 100,
        currentStep: "Complete",
        error: null,
      };

      return {
        data: response.data,
        error: null,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to generate images";

      status.value = {
        isGenerating: false,
        progress: 0,
        currentStep: "",
        error: errorMessage,
      };

      return {
        data: null,
        error: errorMessage,
      };
    }
  };

  const resetStatus = () => {
    status.value = {
      isGenerating: false,
      progress: 0,
      currentStep: "",
      error: null,
    };
  };

  return {
    status: readonly(status),
    generateImages,
    resetStatus,
  };
};
