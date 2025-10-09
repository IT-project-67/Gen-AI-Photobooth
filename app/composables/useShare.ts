import type { ApiResponse, Errors } from "~~/server/types/core";
import type {
  CreateShareRequest,
  CreateShareResponse,
  GetShareResponse,
  GetSharesByEventResponse,
} from "~~/server/types/share";

type ShareApi<T> = ApiResponse<T, Errors>;

export interface Share {
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

export interface CreateShareData {
  shareId: string;
  qrCodeUrl: string;
  expiresAt: string;
  shareUrl: string;
}

export const useShare = () => {
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

  const createShare = async (
    shareData: CreateShareRequest,
  ): Promise<CreateShareData | null> => {
    try {
      isLoading.value = true;
      error.value = null;

      const headers = await getAuthHeaders();
      const response = await $fetch<ShareApi<CreateShareResponse>>(
        "/api/v1/share/create",
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: shareData,
        },
      );

      if (response.success && response.data) {
        return {
          shareId: response.data.shareId,
          qrCodeUrl: response.data.qrCodeUrl,
          expiresAt: response.data.expiresAt,
          shareUrl: response.data.shareUrl,
        };
      }
      throw new Error(response.error?.message || "Failed to create share");
    } catch (err: unknown) {
      console.error("Error creating share:", err);
      error.value = handleError(err, "Failed to create share");
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const getShareById = async (shareId: string): Promise<Share | null> => {
    try {
      isLoading.value = true;
      error.value = null;

      const headers = await getAuthHeaders();
      const response = await $fetch<ShareApi<GetShareResponse>>(
        `/api/v1/share/get-share-by-id?shareId=${encodeURIComponent(shareId)}`,
        {
          headers,
        },
      );

      if (response.success && response.data) {
        return {
          id: response.data.id,
          eventId: response.data.eventId,
          aiphotoId: response.data.aiphotoId,
          selectedUrl: response.data.selectedUrl,
          qrCodeUrl: response.data.qrCodeUrl,
          qrExpiresAt: response.data.qrExpiresAt,
          createdAt: response.data.createdAt,
          event: response.data.event,
          aiPhoto: response.data.aiPhoto,
        };
      }
      throw new Error(response.error?.message || "Failed to get share by ID");
    } catch (err: unknown) {
      console.error("Error getting share by ID:", err);
      error.value = handleError(err, "Failed to get share by ID");
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const getSharesByEvent = async (eventId: string): Promise<Share[]> => {
    try {
      isLoading.value = true;
      error.value = null;

      const headers = await getAuthHeaders();
      const response = await $fetch<ShareApi<GetSharesByEventResponse>>(
        `/api/v1/share/get-share-by-event?eventId=${encodeURIComponent(eventId)}`,
        {
          headers,
        },
      );

      if (response.success && response.data) {
        return response.data.shares.map((share) => ({
          id: share.id,
          eventId: share.eventId,
          aiphotoId: share.aiphotoId,
          selectedUrl: share.selectedUrl,
          qrCodeUrl: share.qrCodeUrl,
          qrExpiresAt: share.qrExpiresAt,
          createdAt: share.createdAt,
          event: share.event,
          aiPhoto: share.aiPhoto,
        }));
      }
      throw new Error(
        response.error?.message || "Failed to get shares by event",
      );
    } catch (err: unknown) {
      console.error("Error getting shares by event:", err);
      error.value = handleError(err, "Failed to get shares by event");
      return [];
    } finally {
      isLoading.value = false;
    }
  };

  const getQRCodeBlob = async (shareId: string): Promise<string | null> => {
    try {
      isLoading.value = true;
      error.value = null;

      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/v1/share/qr-code?shareId=${encodeURIComponent(shareId)}`,
        {
          headers,
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to get QR code: ${response.statusText}`);
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (err: unknown) {
      console.error("Error getting QR code blob:", err);
      error.value = handleError(err, "Failed to get QR code");
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const getQRCodeUrl = (qrCodeUrl: string): string => {
    if (qrCodeUrl.startsWith("http")) {
      return qrCodeUrl;
    }

    const config = useRuntimeConfig();
    return `${config.public.supabaseUrl}/storage/v1/object/public/${qrCodeUrl}`;
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
    createShare,
    getShareById,
    getSharesByEvent,
    getQRCodeBlob,
    getQRCodeUrl,
  };
};
