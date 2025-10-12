import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { mockGetSession, mockFetch } from "~/tests/app/jest.setup";

// Mock URL.createObjectURL
const mockCreateObjectURL = jest.fn(() => "blob:http://localhost/test-blob");
global.URL.createObjectURL = mockCreateObjectURL as never;

// Mock useRuntimeConfig
const mockRuntimeConfig = {
  public: {
    supabaseUrl: "https://test.supabase.co",
  },
};
global.useRuntimeConfig = jest.fn(() => mockRuntimeConfig) as never;

describe("useShare Composable", () => {
  let useShare: typeof import("~/app/composables/useShare").useShare;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();

    // Reset mocks to default state
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "test-access-token",
        },
      },
    } as never);

    mockCreateObjectURL.mockReturnValue("blob:http://localhost/test-blob");

    try {
      const module = await import("~/app/composables/useShare");
      useShare = module.useShare;
    } catch (error) {
      console.error("Failed to import useShare:", error);
      throw error;
    }
  });

  describe("Composable Structure", () => {
    it("should create composable instance", () => {
      const composable = useShare();

      expect(composable).toBeDefined();
      expect(composable.isLoading).toBeDefined();
      expect(composable.error).toBeDefined();
      expect(typeof composable.createShare).toBe("function");
      expect(typeof composable.getShareById).toBe("function");
      expect(typeof composable.getSharesByEvent).toBe("function");
      expect(typeof composable.getQRCodeBlob).toBe("function");
      expect(typeof composable.getQRCodeUrl).toBe("function");
    });

    it("should have all required methods", () => {
      const composable = useShare();

      expect(typeof composable.createShare).toBe("function");
      expect(typeof composable.getShareById).toBe("function");
      expect(typeof composable.getSharesByEvent).toBe("function");
      expect(typeof composable.getQRCodeBlob).toBe("function");
      expect(typeof composable.getQRCodeUrl).toBe("function");
    });

    it("should have readonly state properties", () => {
      const composable = useShare();

      expect(composable.isLoading).toBeDefined();
      expect(composable.error).toBeDefined();
      expect(composable.isLoading.value).toBe(false);
      expect(composable.error.value).toBeNull();
    });
  });

  describe("Initial State", () => {
    it("should initialize with default values", () => {
      const composable = useShare();

      expect(composable.isLoading.value).toBe(false);
      expect(composable.error.value).toBeNull();
    });
  });

  describe("createShare", () => {
    it("should create share successfully", async () => {
      const shareData = {
        eventId: "event-123",
        aiphotoId: "aiphoto-456",
      };

      const mockResponse = {
        success: true,
        data: {
          shareId: "share-123",
          qrCodeUrl: "qrcodes/qr-123.png",
          expiresAt: "2024-12-31T23:59:59Z",
          shareUrl: "https://example.com/share/share-123",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useShare();
      const result = await composable.createShare(shareData);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/share/create",
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer test-access-token",
            "Content-Type": "application/json",
          },
          body: shareData,
        }),
      );
      expect(result).toEqual({
        shareId: "share-123",
        qrCodeUrl: "qrcodes/qr-123.png",
        expiresAt: "2024-12-31T23:59:59Z",
        shareUrl: "https://example.com/share/share-123",
      });
      expect(composable.isLoading.value).toBe(false);
      expect(composable.error.value).toBeNull();
    });

    it("should handle authentication error", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: null,
        },
      } as never);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();
      const result = await composable.createShare({
        eventId: "event-123",
        aiphotoId: "aiphoto-456",
      });

      expect(result).toBeNull();
      expect(composable.error.value).toBe("Not authenticated");
      expect(composable.isLoading.value).toBe(false);

      consoleErrorSpy.mockRestore();
    });

    it("should handle session without access token", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {},
        },
      } as never);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();
      const result = await composable.createShare({
        eventId: "event-123",
        aiphotoId: "aiphoto-456",
      });

      expect(result).toBeNull();
      expect(composable.error.value).toBe("Not authenticated");

      consoleErrorSpy.mockRestore();
    });

    it("should handle API error response with success false", async () => {
      const mockResponse = {
        success: false,
        error: {
          message: "Event not found",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();
      const result = await composable.createShare({
        eventId: "event-123",
        aiphotoId: "aiphoto-456",
      });

      expect(result).toBeNull();
      expect(composable.error.value).toBe("Event not found");

      consoleErrorSpy.mockRestore();
    });

    it("should handle API error without message", async () => {
      const mockResponse = {
        success: false,
        error: {},
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();
      const result = await composable.createShare({
        eventId: "event-123",
        aiphotoId: "aiphoto-456",
      });

      expect(result).toBeNull();
      expect(composable.error.value).toBe("Failed to create share");

      consoleErrorSpy.mockRestore();
    });

    it("should handle API response without data", async () => {
      const mockResponse = {
        success: true,
        data: null,
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();
      const result = await composable.createShare({
        eventId: "event-123",
        aiphotoId: "aiphoto-456",
      });

      expect(result).toBeNull();
      expect(composable.error.value).toBe("Failed to create share");

      consoleErrorSpy.mockRestore();
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network timeout") as never);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();
      const result = await composable.createShare({
        eventId: "event-123",
        aiphotoId: "aiphoto-456",
      });

      expect(result).toBeNull();
      expect(composable.error.value).toBe("Network timeout");
      expect(composable.isLoading.value).toBe(false);

      consoleErrorSpy.mockRestore();
    });

    it("should handle string error", async () => {
      mockFetch.mockRejectedValue("String error" as never);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();
      const result = await composable.createShare({
        eventId: "event-123",
        aiphotoId: "aiphoto-456",
      });

      expect(result).toBeNull();
      expect(composable.error.value).toBe("String error");

      consoleErrorSpy.mockRestore();
    });

    it("should handle unknown error type", async () => {
      mockFetch.mockRejectedValue({ code: 500 } as never);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();
      const result = await composable.createShare({
        eventId: "event-123",
        aiphotoId: "aiphoto-456",
      });

      expect(result).toBeNull();
      expect(composable.error.value).toBe("Failed to create share");

      consoleErrorSpy.mockRestore();
    });

    it("should set loading state during operation", async () => {
      const mockResponse = {
        success: true,
        data: {
          shareId: "share-123",
          qrCodeUrl: "qrcodes/qr-123.png",
          expiresAt: "2024-12-31T23:59:59Z",
          shareUrl: "https://example.com/share/share-123",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useShare();

      const promise = composable.createShare({
        eventId: "event-123",
        aiphotoId: "aiphoto-456",
      });

      expect(composable.isLoading.value).toBe(true);

      await promise;

      expect(composable.isLoading.value).toBe(false);
    });
  });

  describe("getShareById", () => {
    it("should get share by ID successfully", async () => {
      const mockResponse = {
        success: true,
        data: {
          id: "share-123",
          eventId: "event-456",
          aiphotoId: "aiphoto-789",
          selectedUrl: "photos/selected.jpg",
          qrCodeUrl: "qrcodes/qr-123.png",
          qrExpiresAt: "2024-12-31T23:59:59Z",
          createdAt: "2024-01-01T00:00:00Z",
          event: {
            id: "event-456",
            name: "Test Event",
          },
          aiPhoto: {
            id: "aiphoto-789",
            style: "REALISTIC",
            generatedUrl: "photos/generated.jpg",
          },
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useShare();
      const result = await composable.getShareById("share-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/share/get-share-by-id?shareId=share-123",
        expect.objectContaining({
          headers: {
            Authorization: "Bearer test-access-token",
          },
        }),
      );
      expect(result).toEqual({
        id: "share-123",
        eventId: "event-456",
        aiphotoId: "aiphoto-789",
        selectedUrl: "photos/selected.jpg",
        qrCodeUrl: "qrcodes/qr-123.png",
        qrExpiresAt: "2024-12-31T23:59:59Z",
        createdAt: "2024-01-01T00:00:00Z",
        event: {
          id: "event-456",
          name: "Test Event",
        },
        aiPhoto: {
          id: "aiphoto-789",
          style: "REALISTIC",
          generatedUrl: "photos/generated.jpg",
        },
      });
      expect(composable.isLoading.value).toBe(false);
      expect(composable.error.value).toBeNull();
    });

    it("should handle authentication error", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: null,
        },
      } as never);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();
      const result = await composable.getShareById("share-123");

      expect(result).toBeNull();
      expect(composable.error.value).toBe("Not authenticated");

      consoleErrorSpy.mockRestore();
    });

    it("should handle API error response", async () => {
      const mockResponse = {
        success: false,
        error: {
          message: "Share not found",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();
      const result = await composable.getShareById("share-123");

      expect(result).toBeNull();
      expect(composable.error.value).toBe("Share not found");

      consoleErrorSpy.mockRestore();
    });

    it("should handle API error without message", async () => {
      const mockResponse = {
        success: false,
        error: {},
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();
      const result = await composable.getShareById("share-123");

      expect(result).toBeNull();
      expect(composable.error.value).toBe("Failed to get share by ID");

      consoleErrorSpy.mockRestore();
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValue(new Error("Connection failed") as never);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();
      const result = await composable.getShareById("share-123");

      expect(result).toBeNull();
      expect(composable.error.value).toBe("Connection failed");

      consoleErrorSpy.mockRestore();
    });

    it("should handle special characters in shareId", async () => {
      const mockResponse = {
        success: true,
        data: {
          id: "share-special-123",
          eventId: "event-456",
          aiphotoId: "aiphoto-789",
          selectedUrl: "photos/selected.jpg",
          qrCodeUrl: "qrcodes/qr-123.png",
          qrExpiresAt: "2024-12-31T23:59:59Z",
          createdAt: "2024-01-01T00:00:00Z",
          event: {
            id: "event-456",
            name: "Test Event",
          },
          aiPhoto: {
            id: "aiphoto-789",
            style: "REALISTIC",
            generatedUrl: "photos/generated.jpg",
          },
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useShare();
      await composable.getShareById("share-special-123");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("share-special-123"),
        expect.any(Object),
      );
    });

    it("should handle empty shareId", async () => {
      const mockResponse = {
        success: true,
        data: {
          id: "",
          eventId: "event-456",
          aiphotoId: "aiphoto-789",
          selectedUrl: "photos/selected.jpg",
          qrCodeUrl: "qrcodes/qr-123.png",
          qrExpiresAt: "2024-12-31T23:59:59Z",
          createdAt: "2024-01-01T00:00:00Z",
          event: {
            id: "event-456",
            name: "Test Event",
          },
          aiPhoto: {
            id: "aiphoto-789",
            style: "REALISTIC",
            generatedUrl: "photos/generated.jpg",
          },
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useShare();
      const result = await composable.getShareById("");

      expect(result).toBeDefined();
    });

    it("should throw error with default message when error.message is undefined", async () => {
      const mockResponse = {
        success: false,
        error: {
          code: 500,
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();

      try {
        await composable.getShareById("share-123");
      } catch {
        // This should not throw, it catches internally
      }

      expect(composable.error.value).toBe("Failed to get share by ID");

      consoleErrorSpy.mockRestore();
    });

    it("should handle error with empty message string", async () => {
      const mockResponse = {
        success: false,
        error: {
          message: "",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();
      const result = await composable.getShareById("share-123");

      expect(result).toBeNull();
      expect(composable.error.value).toBe("Failed to get share by ID");

      consoleErrorSpy.mockRestore();
    });

    it("should handle success false without error object", async () => {
      const mockResponse = {
        success: false,
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();
      const result = await composable.getShareById("share-123");

      expect(result).toBeNull();
      expect(composable.error.value).toBe("Failed to get share by ID");

      consoleErrorSpy.mockRestore();
    });
  });

  describe("getSharesByEvent", () => {
    it("should get shares by event successfully", async () => {
      const mockResponse = {
        success: true,
        data: {
          shares: [
            {
              id: "share-1",
              eventId: "event-123",
              aiphotoId: "aiphoto-1",
              selectedUrl: "photos/selected-1.jpg",
              qrCodeUrl: "qrcodes/qr-1.png",
              qrExpiresAt: "2024-12-31T23:59:59Z",
              createdAt: "2024-01-01T00:00:00Z",
              event: {
                id: "event-123",
                name: "Test Event",
              },
              aiPhoto: {
                id: "aiphoto-1",
                style: "REALISTIC",
                generatedUrl: "photos/generated-1.jpg",
              },
            },
            {
              id: "share-2",
              eventId: "event-123",
              aiphotoId: "aiphoto-2",
              selectedUrl: "photos/selected-2.jpg",
              qrCodeUrl: "qrcodes/qr-2.png",
              qrExpiresAt: "2024-12-31T23:59:59Z",
              createdAt: "2024-01-02T00:00:00Z",
              event: {
                id: "event-123",
                name: "Test Event",
              },
              aiPhoto: {
                id: "aiphoto-2",
                style: "REALISTIC",
                generatedUrl: "photos/generated-2.jpg",
              },
            },
          ],
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useShare();
      const result = await composable.getSharesByEvent("event-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/share/get-share-by-event?eventId=event-123",
        expect.objectContaining({
          headers: {
            Authorization: "Bearer test-access-token",
          },
        }),
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("share-1");
      expect(result[1].id).toBe("share-2");
      expect(composable.isLoading.value).toBe(false);
      expect(composable.error.value).toBeNull();
    });

    it("should handle authentication error", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: null,
        },
      } as never);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();
      const result = await composable.getSharesByEvent("event-123");

      expect(result).toEqual([]);
      expect(composable.error.value).toBe("Not authenticated");

      consoleErrorSpy.mockRestore();
    });

    it("should handle API error response", async () => {
      const mockResponse = {
        success: false,
        error: {
          message: "Event not found",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();
      const result = await composable.getSharesByEvent("event-123");

      expect(result).toEqual([]);
      expect(composable.error.value).toBe("Event not found");

      consoleErrorSpy.mockRestore();
    });

    it("should handle empty shares array", async () => {
      const mockResponse = {
        success: true,
        data: {
          shares: [],
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useShare();
      const result = await composable.getSharesByEvent("event-123");

      expect(result).toEqual([]);
      expect(composable.error.value).toBeNull();
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error") as never);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();
      const result = await composable.getSharesByEvent("event-123");

      expect(result).toEqual([]);
      expect(composable.error.value).toBe("Network error");

      consoleErrorSpy.mockRestore();
    });

    it("should handle large number of shares", async () => {
      const shares = Array.from({ length: 100 }, (_, i) => ({
        id: `share-${i}`,
        eventId: "event-123",
        aiphotoId: `aiphoto-${i}`,
        selectedUrl: `photos/selected-${i}.jpg`,
        qrCodeUrl: `qrcodes/qr-${i}.png`,
        qrExpiresAt: "2024-12-31T23:59:59Z",
        createdAt: "2024-01-01T00:00:00Z",
        event: {
          id: "event-123",
          name: "Test Event",
        },
        aiPhoto: {
          id: `aiphoto-${i}`,
          style: "REALISTIC",
          generatedUrl: `photos/generated-${i}.jpg`,
        },
      }));

      const mockResponse = {
        success: true,
        data: {
          shares,
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useShare();
      const result = await composable.getSharesByEvent("event-123");

      expect(result).toHaveLength(100);
      expect(result[0].id).toBe("share-0");
      expect(result[99].id).toBe("share-99");
    });

    it("should throw error with default message when error.message is undefined", async () => {
      const mockResponse = {
        success: false,
        error: {
          code: 404,
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();

      try {
        await composable.getSharesByEvent("event-123");
      } catch {
        // This should not throw, it catches internally
      }

      expect(composable.error.value).toBe("Failed to get shares by event");

      consoleErrorSpy.mockRestore();
    });

    it("should handle error with empty message string", async () => {
      const mockResponse = {
        success: false,
        error: {
          message: "",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();
      const result = await composable.getSharesByEvent("event-123");

      expect(result).toEqual([]);
      expect(composable.error.value).toBe("Failed to get shares by event");

      consoleErrorSpy.mockRestore();
    });

    it("should handle success false without error object", async () => {
      const mockResponse = {
        success: false,
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();
      const result = await composable.getSharesByEvent("event-123");

      expect(result).toEqual([]);
      expect(composable.error.value).toBe("Failed to get shares by event");

      consoleErrorSpy.mockRestore();
    });
  });

  describe("getQRCodeBlob", () => {
    it("should get QR code blob successfully", async () => {
      const mockBlob = new Blob(["qr code data"], { type: "image/png" });
      const mockBlobFn = jest.fn(() => Promise.resolve(mockBlob));
      const mockResponse = {
        ok: true,
        blob: mockBlobFn,
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useShare();
      const result = await composable.getQRCodeBlob("share-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/share/qrcode?shareId=share-123",
        expect.objectContaining({
          headers: {
            Authorization: "Bearer test-access-token",
          },
        }),
      );
      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(result).toBe("blob:http://localhost/test-blob");
      expect(composable.isLoading.value).toBe(false);
      expect(composable.error.value).toBeNull();
    });

    it("should handle authentication error", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: null,
        },
      } as never);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();
      const result = await composable.getQRCodeBlob("share-123");

      expect(result).toBeNull();
      expect(composable.error.value).toBe("Not authenticated");

      consoleErrorSpy.mockRestore();
    });

    it("should handle response not ok - 404", async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: "Not Found",
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();
      const result = await composable.getQRCodeBlob("share-123");

      expect(result).toBeNull();
      expect(composable.error.value).toBe("Failed to get QR code: Not Found");

      consoleErrorSpy.mockRestore();
    });

    it("should handle response not ok - 500", async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();
      const result = await composable.getQRCodeBlob("share-123");

      expect(result).toBeNull();
      expect(composable.error.value).toBe("Failed to get QR code: Internal Server Error");

      consoleErrorSpy.mockRestore();
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network timeout") as never);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();
      const result = await composable.getQRCodeBlob("share-123");

      expect(result).toBeNull();
      expect(composable.error.value).toBe("Network timeout");

      consoleErrorSpy.mockRestore();
    });

    it("should handle empty blob", async () => {
      const mockBlob = new Blob([], { type: "image/png" });
      const mockBlobFn = jest.fn(() => Promise.resolve(mockBlob));
      const mockResponse = {
        ok: true,
        blob: mockBlobFn,
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useShare();
      const result = await composable.getQRCodeBlob("share-123");

      expect(result).toBe("blob:http://localhost/test-blob");
    });

    it("should handle special characters in shareId", async () => {
      const mockBlob = new Blob(["qr code data"], { type: "image/png" });
      const mockBlobFn = jest.fn(() => Promise.resolve(mockBlob));
      const mockResponse = {
        ok: true,
        blob: mockBlobFn,
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useShare();
      await composable.getQRCodeBlob("share-special-123");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("share-special-123"),
        expect.any(Object),
      );
    });
  });

  describe("getQRCodeUrl", () => {
    it("should return qrCodeUrl directly if it starts with http", () => {
      const qrCodeUrl = "http://example.com/qr-code.png";

      const composable = useShare();
      const result = composable.getQRCodeUrl(qrCodeUrl);

      expect(result).toBe(qrCodeUrl);
    });

    it("should return qrCodeUrl directly if it starts with https", () => {
      const qrCodeUrl = "https://example.com/qr-code.png";

      const composable = useShare();
      const result = composable.getQRCodeUrl(qrCodeUrl);

      expect(result).toBe(qrCodeUrl);
    });

    it("should construct full URL from storage path", () => {
      const qrCodeUrl = "qrcodes/qr-123.png";

      const composable = useShare();
      const result = composable.getQRCodeUrl(qrCodeUrl);

      expect(result).toBe("https://test.supabase.co/storage/v1/object/public/qrcodes/qr-123.png");
    });

    it("should handle qrCodeUrl with leading slash", () => {
      const qrCodeUrl = "/qrcodes/qr-123.png";

      const composable = useShare();
      const result = composable.getQRCodeUrl(qrCodeUrl);

      expect(result).toBe("https://test.supabase.co/storage/v1/object/public//qrcodes/qr-123.png");
    });

    it("should handle empty qrCodeUrl", () => {
      const qrCodeUrl = "";

      const composable = useShare();
      const result = composable.getQRCodeUrl(qrCodeUrl);

      expect(result).toBe("https://test.supabase.co/storage/v1/object/public/");
    });

    it("should handle qrCodeUrl with special characters", () => {
      const qrCodeUrl = "qrcodes/qr code (1).png";

      const composable = useShare();
      const result = composable.getQRCodeUrl(qrCodeUrl);

      expect(result).toContain("qr code (1).png");
    });

    it("should handle qrCodeUrl with nested path", () => {
      const qrCodeUrl = "events/event-123/qrcodes/qr-456.png";

      const composable = useShare();
      const result = composable.getQRCodeUrl(qrCodeUrl);

      expect(result).toBe(
        "https://test.supabase.co/storage/v1/object/public/events/event-123/qrcodes/qr-456.png",
      );
    });
  });

  describe("State Management", () => {
    it("should manage isLoading state correctly for createShare", async () => {
      const mockResponse = {
        success: true,
        data: {
          shareId: "share-123",
          qrCodeUrl: "qrcodes/qr-123.png",
          expiresAt: "2024-12-31T23:59:59Z",
          shareUrl: "https://example.com/share/share-123",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useShare();
      expect(composable.isLoading.value).toBe(false);

      const promise = composable.createShare({
        eventId: "event-123",
        aiphotoId: "aiphoto-456",
      });

      expect(composable.isLoading.value).toBe(true);

      await promise;

      expect(composable.isLoading.value).toBe(false);
    });

    it("should manage error state correctly", async () => {
      mockFetch.mockRejectedValue(new Error("Test error") as never);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();
      expect(composable.error.value).toBeNull();

      await composable.createShare({
        eventId: "event-123",
        aiphotoId: "aiphoto-456",
      });

      expect(composable.error.value).toBe("Test error");

      consoleErrorSpy.mockRestore();
    });

    it("should clear error on successful operation after error", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();

      // First: error
      mockFetch.mockRejectedValueOnce(new Error("First error") as never);
      await composable.createShare({
        eventId: "event-123",
        aiphotoId: "aiphoto-456",
      });
      expect(composable.error.value).toBe("First error");

      // Second: success
      const mockResponse = {
        success: true,
        data: {
          shareId: "share-123",
          qrCodeUrl: "qrcodes/qr-123.png",
          expiresAt: "2024-12-31T23:59:59Z",
          shareUrl: "https://example.com/share/share-123",
        },
      };
      mockFetch.mockResolvedValue(mockResponse as never);

      await composable.createShare({
        eventId: "event-123",
        aiphotoId: "aiphoto-456",
      });
      expect(composable.error.value).toBeNull();

      consoleErrorSpy.mockRestore();
    });

    it("should maintain separate state for multiple instances", async () => {
      const mockResponse = {
        success: true,
        data: {
          shareId: "share-123",
          qrCodeUrl: "qrcodes/qr-123.png",
          expiresAt: "2024-12-31T23:59:59Z",
          shareUrl: "https://example.com/share/share-123",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable1 = useShare();
      const composable2 = useShare();

      expect(composable1.isLoading.value).toBe(false);
      expect(composable2.isLoading.value).toBe(false);

      await composable1.createShare({
        eventId: "event-123",
        aiphotoId: "aiphoto-456",
      });

      expect(composable1.isLoading.value).toBe(false);
      expect(composable2.isLoading.value).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should handle Error instances correctly", async () => {
      mockFetch.mockRejectedValue(new Error("Standard error") as never);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();
      await composable.createShare({
        eventId: "event-123",
        aiphotoId: "aiphoto-456",
      });

      expect(composable.error.value).toBe("Standard error");

      consoleErrorSpy.mockRestore();
    });

    it("should handle string errors correctly", async () => {
      mockFetch.mockRejectedValue("String error message" as never);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();
      await composable.createShare({
        eventId: "event-123",
        aiphotoId: "aiphoto-456",
      });

      expect(composable.error.value).toBe("String error message");

      consoleErrorSpy.mockRestore();
    });

    it("should handle unknown error types with default message", async () => {
      mockFetch.mockRejectedValue({ unknown: "error" } as never);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();
      await composable.createShare({
        eventId: "event-123",
        aiphotoId: "aiphoto-456",
      });

      expect(composable.error.value).toBe("Failed to create share");

      consoleErrorSpy.mockRestore();
    });

    it("should handle null error", async () => {
      mockFetch.mockRejectedValue(null as never);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();
      await composable.createShare({
        eventId: "event-123",
        aiphotoId: "aiphoto-456",
      });

      expect(composable.error.value).toBe("Failed to create share");

      consoleErrorSpy.mockRestore();
    });

    it("should handle different error messages for different operations", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();

      // createShare error
      mockFetch.mockRejectedValueOnce({ error: "create error" } as never);
      await composable.createShare({
        eventId: "event-123",
        aiphotoId: "aiphoto-456",
      });
      expect(composable.error.value).toBe("Failed to create share");

      // getShareById error
      mockFetch.mockRejectedValueOnce({ error: "get error" } as never);
      await composable.getShareById("share-123");
      expect(composable.error.value).toBe("Failed to get share by ID");

      // getSharesByEvent error
      mockFetch.mockRejectedValueOnce({ error: "get shares error" } as never);
      await composable.getSharesByEvent("event-123");
      expect(composable.error.value).toBe("Failed to get shares by event");

      // getQRCodeBlob error
      mockFetch.mockRejectedValueOnce({ error: "qr error" } as never);
      await composable.getQRCodeBlob("share-123");
      expect(composable.error.value).toBe("Failed to get QR code");

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Realistic User Flows", () => {
    it("should complete full share creation flow", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();

      // Step 1: Create share
      const createResponse = {
        success: true,
        data: {
          shareId: "share-123",
          qrCodeUrl: "qrcodes/qr-123.png",
          expiresAt: "2024-12-31T23:59:59Z",
          shareUrl: "https://example.com/share/share-123",
        },
      };
      mockFetch.mockResolvedValueOnce(createResponse as never);

      const shareData = await composable.createShare({
        eventId: "event-123",
        aiphotoId: "aiphoto-456",
      });
      expect(shareData?.shareId).toBe("share-123");
      expect(composable.error.value).toBeNull();

      // Step 2: Get share by ID
      const getResponse = {
        success: true,
        data: {
          id: "share-123",
          eventId: "event-123",
          aiphotoId: "aiphoto-456",
          selectedUrl: "photos/selected.jpg",
          qrCodeUrl: "qrcodes/qr-123.png",
          qrExpiresAt: "2024-12-31T23:59:59Z",
          createdAt: "2024-01-01T00:00:00Z",
          event: {
            id: "event-123",
            name: "Test Event",
          },
          aiPhoto: {
            id: "aiphoto-456",
            style: "REALISTIC",
            generatedUrl: "photos/generated.jpg",
          },
        },
      };
      mockFetch.mockResolvedValueOnce(getResponse as never);

      const share = await composable.getShareById("share-123");
      expect(share?.id).toBe("share-123");
      expect(composable.error.value).toBeNull();

      // Step 3: Get QR code blob
      const mockBlob = new Blob(["qr code data"], { type: "image/png" });
      const mockBlobFn = jest.fn(() => Promise.resolve(mockBlob));
      const blobResponse = {
        ok: true,
        blob: mockBlobFn,
      };
      mockFetch.mockResolvedValueOnce(blobResponse as never);

      const qrBlob = await composable.getQRCodeBlob("share-123");
      expect(qrBlob).toContain("blob:");
      expect(composable.error.value).toBeNull();

      consoleErrorSpy.mockRestore();
    });

    it("should complete event shares retrieval flow", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();

      // Get all shares for an event
      const sharesResponse = {
        success: true,
        data: {
          shares: [
            {
              id: "share-1",
              eventId: "event-123",
              aiphotoId: "aiphoto-1",
              selectedUrl: "photos/selected-1.jpg",
              qrCodeUrl: "qrcodes/qr-1.png",
              qrExpiresAt: "2024-12-31T23:59:59Z",
              createdAt: "2024-01-01T00:00:00Z",
              event: {
                id: "event-123",
                name: "Test Event",
              },
              aiPhoto: {
                id: "aiphoto-1",
                style: "REALISTIC",
                generatedUrl: "photos/generated-1.jpg",
              },
            },
            {
              id: "share-2",
              eventId: "event-123",
              aiphotoId: "aiphoto-2",
              selectedUrl: "photos/selected-2.jpg",
              qrCodeUrl: "qrcodes/qr-2.png",
              qrExpiresAt: "2024-12-31T23:59:59Z",
              createdAt: "2024-01-02T00:00:00Z",
              event: {
                id: "event-123",
                name: "Test Event",
              },
              aiPhoto: {
                id: "aiphoto-2",
                style: "REALISTIC",
                generatedUrl: "photos/generated-2.jpg",
              },
            },
          ],
        },
      };
      mockFetch.mockResolvedValueOnce(sharesResponse as never);

      const shares = await composable.getSharesByEvent("event-123");
      expect(shares).toHaveLength(2);
      expect(shares[0].id).toBe("share-1");
      expect(shares[1].id).toBe("share-2");

      // Get QR code URL for first share
      const qrUrl = composable.getQRCodeUrl(shares[0].qrCodeUrl);
      expect(qrUrl).toContain("qrcodes/qr-1.png");

      consoleErrorSpy.mockRestore();
    });

    it("should handle error recovery flow", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();

      // First attempt: network error
      mockFetch.mockRejectedValueOnce(new Error("Network error") as never);
      const result1 = await composable.createShare({
        eventId: "event-123",
        aiphotoId: "aiphoto-456",
      });
      expect(result1).toBeNull();
      expect(composable.error.value).toBe("Network error");

      // Second attempt: API error
      const errorResponse = {
        success: false,
        error: {
          message: "Invalid event",
        },
      };
      mockFetch.mockResolvedValueOnce(errorResponse as never);
      const result2 = await composable.createShare({
        eventId: "event-123",
        aiphotoId: "aiphoto-456",
      });
      expect(result2).toBeNull();
      expect(composable.error.value).toBe("Invalid event");

      // Third attempt: success
      const successResponse = {
        success: true,
        data: {
          shareId: "share-123",
          qrCodeUrl: "qrcodes/qr-123.png",
          expiresAt: "2024-12-31T23:59:59Z",
          shareUrl: "https://example.com/share/share-123",
        },
      };
      mockFetch.mockResolvedValueOnce(successResponse as never);
      const result3 = await composable.createShare({
        eventId: "event-123",
        aiphotoId: "aiphoto-456",
      });
      expect(result3?.shareId).toBe("share-123");
      expect(composable.error.value).toBeNull();

      consoleErrorSpy.mockRestore();
    });

    it("should handle multiple shares creation for same event", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();

      // Create three shares for the same event
      for (let i = 1; i <= 3; i++) {
        const mockResponse = {
          success: true,
          data: {
            shareId: `share-${i}`,
            qrCodeUrl: `qrcodes/qr-${i}.png`,
            expiresAt: "2024-12-31T23:59:59Z",
            shareUrl: `https://example.com/share/share-${i}`,
          },
        };
        mockFetch.mockResolvedValueOnce(mockResponse as never);

        const result = await composable.createShare({
          eventId: "event-123",
          aiphotoId: `aiphoto-${i}`,
        });
        expect(result?.shareId).toBe(`share-${i}`);
      }

      expect(mockFetch).toHaveBeenCalledTimes(3);

      consoleErrorSpy.mockRestore();
    });

    it("should handle share creation and immediate retrieval", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const composable = useShare();

      // Create share
      const createResponse = {
        success: true,
        data: {
          shareId: "share-123",
          qrCodeUrl: "qrcodes/qr-123.png",
          expiresAt: "2024-12-31T23:59:59Z",
          shareUrl: "https://example.com/share/share-123",
        },
      };
      mockFetch.mockResolvedValueOnce(createResponse as never);

      const createdShare = await composable.createShare({
        eventId: "event-123",
        aiphotoId: "aiphoto-456",
      });
      expect(createdShare?.shareId).toBe("share-123");

      // Immediately retrieve the share
      const getResponse = {
        success: true,
        data: {
          id: "share-123",
          eventId: "event-123",
          aiphotoId: "aiphoto-456",
          selectedUrl: "photos/selected.jpg",
          qrCodeUrl: "qrcodes/qr-123.png",
          qrExpiresAt: "2024-12-31T23:59:59Z",
          createdAt: "2024-01-01T00:00:00Z",
          event: {
            id: "event-123",
            name: "Test Event",
          },
          aiPhoto: {
            id: "aiphoto-456",
            style: "REALISTIC",
            generatedUrl: "photos/generated.jpg",
          },
        },
      };
      mockFetch.mockResolvedValueOnce(getResponse as never);

      const retrievedShare = await composable.getShareById("share-123");
      expect(retrievedShare?.id).toBe("share-123");
      expect(retrievedShare?.qrCodeUrl).toBe("qrcodes/qr-123.png");
      expect(composable.error.value).toBeNull();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Edge Cases and Integration", () => {
    it("should handle concurrent createShare requests", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const mockResponse1 = {
        success: true,
        data: {
          shareId: "share-1",
          qrCodeUrl: "qrcodes/qr-1.png",
          expiresAt: "2024-12-31T23:59:59Z",
          shareUrl: "https://example.com/share/share-1",
        },
      };

      const mockResponse2 = {
        success: true,
        data: {
          shareId: "share-2",
          qrCodeUrl: "qrcodes/qr-2.png",
          expiresAt: "2024-12-31T23:59:59Z",
          shareUrl: "https://example.com/share/share-2",
        },
      };

      mockFetch
        .mockResolvedValueOnce(mockResponse1 as never)
        .mockResolvedValueOnce(mockResponse2 as never);

      const composable = useShare();

      const promises = [
        composable.createShare({
          eventId: "event-1",
          aiphotoId: "aiphoto-1",
        }),
        composable.createShare({
          eventId: "event-2",
          aiphotoId: "aiphoto-2",
        }),
      ];

      const results = await Promise.all(promises);

      expect(results[0]?.shareId).toBe("share-1");
      expect(results[1]?.shareId).toBe("share-2");
      expect(mockFetch).toHaveBeenCalledTimes(2);

      consoleErrorSpy.mockRestore();
    });

    it("should handle extremely long IDs", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const longId = "a".repeat(1000);
      const mockResponse = {
        success: true,
        data: {
          shareId: longId,
          qrCodeUrl: "qrcodes/qr-long.png",
          expiresAt: "2024-12-31T23:59:59Z",
          shareUrl: `https://example.com/share/${longId}`,
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useShare();
      const result = await composable.createShare({
        eventId: longId,
        aiphotoId: longId,
      });

      expect(result?.shareId).toBe(longId);

      consoleErrorSpy.mockRestore();
    });

    it("should handle special characters in URLs", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const mockResponse = {
        success: true,
        data: {
          shareId: "share-123",
          qrCodeUrl: "qrcodes/qr code (1).png",
          expiresAt: "2024-12-31T23:59:59Z",
          shareUrl: "https://example.com/share/share-123?param=value&test=true",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useShare();
      const result = await composable.createShare({
        eventId: "event-123",
        aiphotoId: "aiphoto-456",
      });

      expect(result?.qrCodeUrl).toBe("qrcodes/qr code (1).png");

      consoleErrorSpy.mockRestore();
    });

    it("should handle URL encoding for shareId parameters", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const specialId = "share-test-123/with?special=chars&more";
      const mockResponse = {
        success: true,
        data: {
          id: specialId,
          eventId: "event-123",
          aiphotoId: "aiphoto-456",
          selectedUrl: "photos/selected.jpg",
          qrCodeUrl: "qrcodes/qr-123.png",
          qrExpiresAt: "2024-12-31T23:59:59Z",
          createdAt: "2024-01-01T00:00:00Z",
          event: {
            id: "event-123",
            name: "Test Event",
          },
          aiPhoto: {
            id: "aiphoto-456",
            style: "REALISTIC",
            generatedUrl: "photos/generated.jpg",
          },
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = useShare();
      await composable.getShareById(specialId);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent(specialId)),
        expect.any(Object),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Console Logging", () => {
    it("should log errors during share creation", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      mockFetch.mockRejectedValue(new Error("Test error") as never);

      const composable = useShare();
      await composable.createShare({
        eventId: "event-123",
        aiphotoId: "aiphoto-456",
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error creating share:", expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it("should log errors during getShareById", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      mockFetch.mockRejectedValue(new Error("Get error") as never);

      const composable = useShare();
      await composable.getShareById("share-123");

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error getting share by ID:", expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it("should log errors during getSharesByEvent", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      mockFetch.mockRejectedValue(new Error("Get shares error") as never);

      const composable = useShare();
      await composable.getSharesByEvent("event-123");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error getting shares by event:",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it("should log errors during getQRCodeBlob", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      mockFetch.mockRejectedValue(new Error("QR code error") as never);

      const composable = useShare();
      await composable.getQRCodeBlob("share-123");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error getting QR code blob:",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
