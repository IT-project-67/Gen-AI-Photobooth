export interface SessionData {
  id: string;
  eventId: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PhotoUploadResponse {
  sessionId: string;
  photoUrl: string;
  fileInfo: {
    name: string;
    type: string;
    size: number;
  };
}

export const usePhoto = () => {
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const supabase = useSupabaseClient();

  const getAuthHeaders = async () => {
    const {
      data: { session: authSession },
    } = await supabase.auth.getSession();
    if (!authSession?.access_token) {
      throw new Error("No valid session found");
    }
    return {
      Authorization: `Bearer ${authSession.access_token}`,
    };
  };

  const createPhotoSession = async (
    eventId: string,
  ): Promise<SessionData | null> => {
    try {
      isLoading.value = true;
      error.value = null;

      console.log("Creating session with eventId:", eventId);

      const headers = await getAuthHeaders();
      const response = await $fetch("/api/v1/session/create", {
        method: "POST",
        headers,
        body: {
          eventId,
        },
      });

      console.log("Session create response:", response);

      if (response.success && response.data) {
        const sessionData = {
          id: response.data.sessionId,
          eventId: response.data.eventId,
          photoUrl: undefined,
          createdAt: response.data.createdAt,
          updatedAt: response.data.createdAt,
        };
        console.log("Converted session data:", sessionData);
        return sessionData;
      }
      throw new Error("Failed to create session");
    } catch (err: unknown) {
      console.error("Error creating session:", err);
      error.value = handleError(err, "Failed to create session");
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const getPhotoSession = async (
    sessionId: string,
  ): Promise<SessionData | null> => {
    try {
      isLoading.value = true;
      error.value = null;

      const headers = await getAuthHeaders();
      const response = await $fetch(
        `/api/v1/session/get?sessionId=${sessionId}`,
        {
          headers,
        },
      );

      if (response.success && response.data) {
        return response.data;
      }
      throw new Error("Failed to get session");
    } catch (err: unknown) {
      console.error("Error getting session:", err);
      error.value = handleError(err, "Failed to get session");
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const uploadPhoto = async (
    eventId: string,
    sessionId: string,
    photoFile: File,
  ): Promise<PhotoUploadResponse | null> => {
    try {
      isLoading.value = true;
      error.value = null;

      const headers = await getAuthHeaders();
      const formData = new FormData();
      formData.append("eventId", eventId);
      formData.append("sessionId", sessionId);
      formData.append("photoFile", photoFile);

      const response = await $fetch("/api/v1/session/photo", {
        method: "POST",
        headers,
        body: formData,
      });

      if (response.success && response.data) {
        return response.data;
      }
      throw new Error("Failed to upload photo");
    } catch (err: unknown) {
      console.error("Error uploading photo:", err);
      error.value = handleError(err, "Failed to upload photo");
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const dataUrlToFile = (dataUrl: string, filename: string): File => {
    const [header = "", body] = dataUrl.split(",");
    if (!body) throw new Error("Invalid data URL: missing data part");

    const mime = header.match(/data:(.*?)(;|$)/i)?.[1] || "image/jpeg";

    const binary = atob(body);
    const len = binary.length;
    const u8 = new Uint8Array(len);
    for (let i = 0; i < len; i++) u8[i] = binary.charCodeAt(i);

    return new File([u8], filename, { type: mime });
  };

  const getPhotoUrl = (photoUrl: string): string => {
    const config = useRuntimeConfig();
    return `${config.public.supabaseUrl}/storage/v1/object/public/Test/${photoUrl}`;
  };

  const getPhotoFile = async (sessionId: string): Promise<string | null> => {
    try {
      isLoading.value = true;
      error.value = null;

      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/v1/session/photo?sessionId=${sessionId}&mode=blob`,
        {
          headers,
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to get photo: ${response.statusText}`);
      }
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (err: unknown) {
      console.error("Error getting photo file:", err);
      error.value = handleError(err, "Failed to get photo file");
      return null;
    } finally {
      isLoading.value = false;
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
    createPhotoSession,
    getPhotoSession,
    uploadPhoto,
    dataUrlToFile,
    getPhotoUrl,
    getPhotoFile,
  };
};
