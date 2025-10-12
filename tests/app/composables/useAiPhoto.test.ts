import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { mockGetSession, mockFetch } from "~/tests/app/jest.setup";

const mockCreateObjectURL = jest.fn(() => "blob:test");

global.URL.createObjectURL = mockCreateObjectURL as never;

describe("useAiPhoto Composable", () => {
  let useAiPhoto: typeof import("~/app/composables/useAiPhoto").useAiPhoto;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    try {
      const module = await import("~/app/composables/useAiPhoto");
      useAiPhoto = module.useAiPhoto;
    } catch (error) {
      console.error("Failed to import useAiPhoto:", error);
      throw error;
    }
  });

  it("should create composable instance", () => {
    try {
      const composable = useAiPhoto();

      expect(composable).toBeDefined();
      expect(composable.isLoading).toBeDefined();
      expect(composable.error).toBeDefined();
    } catch (error) {
      console.error("Test error:", error);
      throw error;
    }
  });

  it("should initialize with default values", () => {
    const composable = useAiPhoto();

    expect(composable.isLoading.value).toBe(false);
    expect(composable.error.value).toBeNull();
  });

  it("should have all required methods", () => {
    const composable = useAiPhoto();

    expect(typeof composable.getSessionAiPhotos).toBe("function");
    expect(typeof composable.getAiPhotoById).toBe("function");
    expect(typeof composable.getAiPhotoBlob).toBe("function");
    expect(typeof composable.getAiPhotoSignedUrl).toBe("function");
    expect(typeof composable.getAiPhotosBlobs).toBe("function");
  });

  it("should fetch session AI photos successfully", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "test-token-123",
        },
      },
    } as never);

    const mockData = {
      sessionId: "session-123",
      eventId: "event-123",
      photos: [],
    };

    mockFetch.mockResolvedValue({
      success: true,
      data: mockData,
    } as never);

    const composable = useAiPhoto();
    const result = await composable.getSessionAiPhotos("session-123");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/aiphoto/get-aiphotos-by-session?sessionId=session-123",
      expect.objectContaining({
        headers: {
          Authorization: "Bearer test-token-123",
        },
      })
    );
    expect(result).toEqual(mockData);
  });

  it("should handle authentication error", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: null,
      },
    } as never);

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const composable = useAiPhoto();
    const result = await composable.getSessionAiPhotos("session-123");

    expect(result).toBeNull();
    expect(composable.error.value).toBe("Not authenticated");

    consoleErrorSpy.mockRestore();
  });

  it("should handle API error response", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "test-token-123",
        },
      },
    } as never);

    mockFetch.mockResolvedValue({
      success: false,
      error: {
        message: "Session not found",
      },
    } as never);

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const composable = useAiPhoto();
    const result = await composable.getSessionAiPhotos("session-123");

    expect(result).toBeNull();
    expect(composable.error.value).toBe("Session not found");

    consoleErrorSpy.mockRestore();
  });

  it("should handle fetch blob successfully", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "test-token-123",
        },
      },
    } as never);

    const mockBlob = new Blob(["test"], { type: "image/jpeg" });
    const mockBlobFn = jest.fn(() => Promise.resolve(mockBlob));
    const mockResponse = {
      ok: true,
      blob: mockBlobFn,
    };

    mockFetch.mockResolvedValue(mockResponse as never);
    mockCreateObjectURL.mockReturnValue("blob:http://localhost/test");

    const composable = useAiPhoto();
    const result = await composable.getAiPhotoBlob("photo-123");

    expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
    expect(result).toBe("blob:http://localhost/test");
  });

  it("should fetch signed URL successfully", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
            access_token: "test-token-123",
        },
      },
    } as never);

    const mockData = {
      url: "https://signed-url.com",
      expiresIn: 3600,
    };

    mockFetch.mockResolvedValue({
      success: true,
      data: mockData,
    } as never);

    const composable = useAiPhoto();
    const result = await composable.getAiPhotoSignedUrl("photo-123");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/aiphoto/aiphoto?aiPhotoId=photo-123&mode=signed&expires=3600",
      expect.any(Object)
    );
    expect(result).toEqual(mockData);
  });

  it("should handle multiple photo blobs", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "test-token-123",
        },
      },
    } as never);

    const mockBlob1 = new Blob(["test1"]);
    const mockBlobFn1 = jest.fn(() => Promise.resolve(mockBlob1));

    const mockBlob2 = new Blob(["test2"]);
    const mockBlobFn2 = jest.fn(() => Promise.resolve(mockBlob2));

    mockFetch
      .mockResolvedValueOnce({ ok: true, blob: mockBlobFn1 } as never)
      .mockResolvedValueOnce({ ok: true, blob: mockBlobFn2 } as never);

    mockCreateObjectURL
      .mockReturnValueOnce("blob:1")
      .mockReturnValueOnce("blob:2");

    const composable = useAiPhoto();
    const result = await composable.getAiPhotosBlobs([
      { id: "photo-1" },
      { id: "photo-2" },
    ] as never);

    expect(result).toEqual({
      "photo-1": "blob:1",
      "photo-2": "blob:2",
    });
  });

  it("should fetch AI photo by ID successfully", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "test-token-123",
        },
      },
    } as never);

    const mockData = {
      id: "photo-123",
      style: "REALISTIC",
      storageUrl: "photos/photo-123.jpg",
      sessionId: "session-123",
      eventId: "event-123",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    mockFetch.mockResolvedValue({
      success: true,
      data: mockData,
    } as never);

    const composable = useAiPhoto();
    const result = await composable.getAiPhotoById("photo-123");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/aiphoto/get-aiphoto-by-id?aiPhotoId=photo-123",
      expect.any(Object)
    );
    expect(result).toEqual(mockData);
  });

  it("should handle getAiPhotoById error", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "test-token-123",
        },
      },
    } as never);

    mockFetch.mockResolvedValue({
      success: false,
      error: {
        message: "Photo not found",
      },
    } as never);

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const composable = useAiPhoto();
    const result = await composable.getAiPhotoById("photo-123");

    expect(result).toBeNull();
    expect(composable.error.value).toBe("Photo not found");

    consoleErrorSpy.mockRestore();
  });

  it("should handle getAiPhotoBlob HTTP error", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "test-token-123",
        },
      },
    } as never);

    mockFetch.mockResolvedValue({
      ok: false,
      statusText: "Internal Server Error",
    } as never);

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const composable = useAiPhoto();
    const result = await composable.getAiPhotoBlob("photo-123");

    expect(result).toBeNull();
    expect(composable.error.value).toBe("Failed to get AI photo blob: Internal Server Error");

    consoleErrorSpy.mockRestore();
  });

  it("should handle getAiPhotoSignedUrl error", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "test-token-123",
        },
      },
    } as never);

    mockFetch.mockResolvedValue({
      success: false,
      error: {
        message: "Photo expired",
      },
    } as never);

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const composable = useAiPhoto();
    const result = await composable.getAiPhotoSignedUrl("photo-123");

    expect(result).toBeNull();
    expect(composable.error.value).toBe("Photo expired");

    consoleErrorSpy.mockRestore();
  });

  it("should handle string error in handleError", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "test-token-123",
        },
      },
    } as never);

    mockFetch.mockRejectedValue("String error message" as never);

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const composable = useAiPhoto();
    await composable.getSessionAiPhotos("session-123");

    expect(composable.error.value).toBe("String error message");

    consoleErrorSpy.mockRestore();
  });

  it("should handle unknown error type", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "test-token-123",
        },
      },
    } as never);

    mockFetch.mockRejectedValue({ code: 500, details: "Unknown" } as never);

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const composable = useAiPhoto();
    await composable.getSessionAiPhotos("session-123");

    expect(composable.error.value).toBe("Failed to get AI photos by session");

    consoleErrorSpy.mockRestore();
  });

  it("should handle getAiPhotosBlobs returning partial results on error", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: null,
      },
    } as never);

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const composable = useAiPhoto();
    const result = await composable.getAiPhotosBlobs([{ id: "photo-1" }] as never);

    expect(result).toEqual({});
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("should handle partial blob success in getAiPhotosBlobs", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "test-token-123",
        },
      },
    } as never);

    const mockBlob1 = new Blob(["test1"]);
    const mockBlobFn1 = jest.fn(() => Promise.resolve(mockBlob1));

    mockFetch
      .mockResolvedValueOnce({ ok: true, blob: mockBlobFn1 } as never)
      .mockResolvedValueOnce({ ok: false, statusText: "Error" } as never);

    mockCreateObjectURL.mockReturnValueOnce("blob:1");

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const composable = useAiPhoto();
    const result = await composable.getAiPhotosBlobs([
      { id: "photo-1" },
      { id: "photo-2" },
    ] as never);

    expect(result).toEqual({
      "photo-1": "blob:1",
    });

    consoleErrorSpy.mockRestore();
  });
});



