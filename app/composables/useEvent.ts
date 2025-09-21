import type { ApiResponse } from "~~/server/types/core";
import { useSupabaseClient } from "#imports";
import type {
  EventResponse,
  LogoUploadResponse,
  SignedUrlResponse,
  EventListItem,
} from "~~/server/types/events";

export const useEvent = () => {
  const supabase = useSupabaseClient();
  const getAccessToken = async () => {
    const session = await supabase.auth.getSession();
    return session.data.session?.access_token ?? null;
  };

  const uploadEventLogo = async (eventId: string, file: File) => {
    const token = await getAccessToken();
    if (!token) throw new Error("No access token");
    if (!eventId) throw new Error("Missing eventId");

    const fd = new FormData();
    fd.append("eventId", eventId);
    fd.append("logo", file);

    for (const [key, value] of fd.entries()) {
      console.log(`${key}:`, value, typeof value);
    }

    const resp: ApiResponse<LogoUploadResponse> = await $fetch(
      "/api/v1/event/logo",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      },
    );
    return resp?.data ?? resp;
  };

  const getEventLogoBlob = async (eventId: string) => {
    const token = await getAccessToken();
    if (!token) throw new Error("No access token");
    if (!eventId) throw new Error("Missing eventId");

    const res = await fetch(
      `/api/v1/event/logo?eventId=${encodeURIComponent(eventId)}&mode=blob`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!res.ok)
      throw new Error(`Failed to fetch logo: ${res.status} ${res.statusText}`);
    return res.blob();
  };

  const getEventLogoSignedUrl = async (eventId: string, expiresIn = 600) => {
    const token = await getAccessToken();
    if (!token) throw new Error("No access token");
    if (!eventId) throw new Error("Missing eventId");

    const qs = new URLSearchParams({
      eventId,
      mode: "signed",
      expires: String(expiresIn),
    });
    const resp: ApiResponse<SignedUrlResponse> = await $fetch(
      `/api/v1/event/logo?${qs.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return resp?.data ?? resp;
  };

  const blobToUrl = (blob: Blob) => URL.createObjectURL(blob);

  const createEvent = async (eventData: {
    name: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    location?: string;
  }) => {
    const token = await getAccessToken();
    if (!token) throw new Error("No access token");

    const resp: ApiResponse<EventResponse> = await $fetch(
      "/api/v1/event/create",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: eventData,
      },
    );
    return resp?.data ?? resp;
  };

  const getUserEvents = async () => {
    const token = await getAccessToken();
    if (!token) throw new Error("No access token");

    const resp: ApiResponse<EventListItem[]> = await $fetch(
      "/api/v1/event/get-events-by-user",
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return resp?.data ?? resp;
  };

  const getEventById = async (eventId: string) => {
    const token = await getAccessToken();
    if (!token) throw new Error("No access token");

    const resp: ApiResponse<EventResponse> = await $fetch(
      `/api/v1/event/get-event-by-id?id=${encodeURIComponent(eventId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return resp?.data ?? resp;
  };

  return {
    getAccessToken,
    createEvent,
    uploadEventLogo,
    getEventLogoBlob,
    getEventLogoSignedUrl,
    getUserEvents,
    getEventById,
    blobToUrl,
  };
};
