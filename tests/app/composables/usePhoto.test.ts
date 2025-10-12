import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { mockGetSession, mockFetch } from "~/tests/app/jest.setup";

// Mock atob for dataUrlToFile
global.atob = jest.fn((str: string) => {
  return Buffer.from(str, "base64").toString("binary");
}) as never;

// Mock URL.createObjectURL
const mockCreateObjectURL = jest.fn(() => "blob:http://localhost/test-blob");
global.URL = {
  createObjectURL: mockCreateObjectURL,
} as never;

// Mock useRuntimeConfig
const mockRuntimeConfig = {
  public: {
    supabaseUrl: "https://test.supabase.co",
  },
};
global.useRuntimeConfig = jest.fn(() => mockRuntimeConfig) as never;

// Mock FormData
global.FormData = class FormData {
  private data: Map<string, unknown> = new Map();

  append(key: string, value: unknown) {
    this.data.set(key, value);
  }

  entries() {
    return this.data.entries();
  }

  get(key: string) {
    return this.data.get(key);
  }
} as never;

describe("usePhoto Composable", () => {
  let usePhoto: typeof import("~/app/composables/usePhoto").usePhoto;

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
      const module = await import("~/app/composables/usePhoto");
      usePhoto = module.usePhoto;
    } catch (error) {
      console.error("Failed to import usePhoto:", error);
      throw error;
    }
  });

  describe("Composable Structure", () => {
    it("should create composable instance", () => {
      const composable = usePhoto();

      expect(composable).toBeDefined();
      expect(composable.isLoading).toBeDefined();
      expect(composable.error).toBeDefined();
      expect(typeof composable.createPhotoSession).toBe("function");
      expect(typeof composable.getPhotoSession).toBe("function");
      expect(typeof composable.uploadPhoto).toBe("function");
      expect(typeof composable.dataUrlToFile).toBe("function");
      expect(typeof composable.getPhotoUrl).toBe("function");
      expect(typeof composable.getPhotoFile).toBe("function");
    });

    it("should have all required methods", () => {
      const composable = usePhoto();

      expect(typeof composable.createPhotoSession).toBe("function");
      expect(typeof composable.getPhotoSession).toBe("function");
      expect(typeof composable.uploadPhoto).toBe("function");
      expect(typeof composable.dataUrlToFile).toBe("function");
      expect(typeof composable.getPhotoUrl).toBe("function");
      expect(typeof composable.getPhotoFile).toBe("function");
    });

    it("should have readonly state properties", () => {
      const composable = usePhoto();

      expect(composable.isLoading).toBeDefined();
      expect(composable.error).toBeDefined();
      expect(composable.isLoading.value).toBe(false);
      expect(composable.error.value).toBeNull();
    });
  });

  describe("Initial State", () => {
    it("should initialize with default values", () => {
      const composable = usePhoto();

      expect(composable.isLoading.value).toBe(false);
      expect(composable.error.value).toBeNull();
    });
  });

  describe("createPhotoSession", () => {
    it("should create photo session successfully", async () => {
      const mockResponse = {
        success: true,
        data: {
          sessionId: "session-123",
          eventId: "event-456",
          createdAt: "2024-01-01T00:00:00Z",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = usePhoto();
      const result = await composable.createPhotoSession("event-456");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/session/create",
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer test-access-token",
          },
          body: {
            eventId: "event-456",
          },
        }),
      );
      expect(result).toEqual({
        id: "session-123",
        eventId: "event-456",
        photoUrl: undefined,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      });
      expect(composable.isLoading.value).toBe(false);
      expect(composable.error.value).toBeNull();
    });

    it("should handle no access token", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: null,
        },
      } as never);

      const composable = usePhoto();
      const result = await composable.createPhotoSession("event-123");

      expect(result).toBeNull();
      expect(composable.error.value).toBe("No valid session found");
      expect(composable.isLoading.value).toBe(false);
    });

    it("should handle session without access_token", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {},
        },
      } as never);

      const composable = usePhoto();
      const result = await composable.createPhotoSession("event-123");

      expect(result).toBeNull();
      expect(composable.error.value).toBe("No valid session found");
    });

    it("should handle API error response with success false", async () => {
      const mockResponse = {
        success: false,
        error: "Failed to create session",
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = usePhoto();
      const result = await composable.createPhotoSession("event-123");

      expect(result).toBeNull();
      expect(composable.error.value).toBe("Failed to create session");
    });

    it("should handle API response without data", async () => {
      const mockResponse = {
        success: true,
        data: null,
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = usePhoto();
      const result = await composable.createPhotoSession("event-123");

      expect(result).toBeNull();
      expect(composable.error.value).toBe("Failed to create session");
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network timeout") as never);

      const composable = usePhoto();
      const result = await composable.createPhotoSession("event-123");

      expect(result).toBeNull();
      expect(composable.error.value).toBe("Network timeout");
      expect(composable.isLoading.value).toBe(false);
    });

    it("should handle string error", async () => {
      mockFetch.mockRejectedValue("String error" as never);

      const composable = usePhoto();
      const result = await composable.createPhotoSession("event-123");

      expect(result).toBeNull();
      expect(composable.error.value).toBe("String error");
    });

    it("should handle unknown error type", async () => {
      mockFetch.mockRejectedValue({ code: 500 } as never);

      const composable = usePhoto();
      const result = await composable.createPhotoSession("event-123");

      expect(result).toBeNull();
      expect(composable.error.value).toBe("Failed to create session");
    });

    it("should set loading state during operation", async () => {
      const mockResponse = {
        success: true,
        data: {
          sessionId: "session-123",
          eventId: "event-456",
          createdAt: "2024-01-01T00:00:00Z",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = usePhoto();

      // Start async operation
      const promise = composable.createPhotoSession("event-456");

      // Check loading state during operation
      expect(composable.isLoading.value).toBe(true);

      // Wait for operation to complete
      await promise;

      // Check loading state after operation
      expect(composable.isLoading.value).toBe(false);
    });

    it("should handle empty eventId", async () => {
      const mockResponse = {
        success: true,
        data: {
          sessionId: "session-123",
          eventId: "",
          createdAt: "2024-01-01T00:00:00Z",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = usePhoto();
      const result = await composable.createPhotoSession("");

      expect(result).toEqual({
        id: "session-123",
        eventId: "",
        photoUrl: undefined,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      });
    });

    it("should handle special characters in eventId", async () => {
      const mockResponse = {
        success: true,
        data: {
          sessionId: "session-123",
          eventId: "event-special-456",
          createdAt: "2024-01-01T00:00:00Z",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = usePhoto();
      const result = await composable.createPhotoSession("event-special-456");

      expect(result?.eventId).toBe("event-special-456");
    });
  });

  describe("getPhotoSession", () => {
    it("should get photo session successfully", async () => {
      const mockResponse = {
        success: true,
        data: {
          id: "session-123",
          eventId: "event-456",
          photoUrl: "photos/test.jpg",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-02T00:00:00Z",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = usePhoto();
      const result = await composable.getPhotoSession("session-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/session/get?sessionId=session-123",
        expect.objectContaining({
          headers: {
            Authorization: "Bearer test-access-token",
          },
        }),
      );
      expect(result).toEqual(mockResponse.data);
      expect(composable.isLoading.value).toBe(false);
      expect(composable.error.value).toBeNull();
    });

    it("should handle no access token", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: null,
        },
      } as never);

      const composable = usePhoto();
      const result = await composable.getPhotoSession("session-123");

      expect(result).toBeNull();
      expect(composable.error.value).toBe("No valid session found");
    });

    it("should handle API error response", async () => {
      const mockResponse = {
        success: false,
        error: "Session not found",
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = usePhoto();
      const result = await composable.getPhotoSession("session-123");

      expect(result).toBeNull();
      expect(composable.error.value).toBe("Failed to get session");
    });

    it("should handle API response without data", async () => {
      const mockResponse = {
        success: true,
        data: null,
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = usePhoto();
      const result = await composable.getPhotoSession("session-123");

      expect(result).toBeNull();
      expect(composable.error.value).toBe("Failed to get session");
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValue(new Error("Connection failed") as never);

      const composable = usePhoto();
      const result = await composable.getPhotoSession("session-123");

      expect(result).toBeNull();
      expect(composable.error.value).toBe("Connection failed");
    });

    it("should handle special characters in sessionId", async () => {
      const mockResponse = {
        success: true,
        data: {
          id: "session-special-123",
          eventId: "event-456",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = usePhoto();
      await composable.getPhotoSession("session-special-123");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("session-special-123"),
        expect.any(Object),
      );
    });

    it("should handle empty sessionId", async () => {
      const mockResponse = {
        success: true,
        data: {
          id: "",
          eventId: "event-456",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = usePhoto();
      const result = await composable.getPhotoSession("");

      expect(result).toBeDefined();
    });
  });

  describe("uploadPhoto", () => {
    it("should upload photo successfully", async () => {
      const mockFile = new File(["photo content"], "photo.jpg", { type: "image/jpeg" });
      const mockResponse = {
        success: true,
        data: {
          sessionId: "session-123",
          photoUrl: "photos/photo-123.jpg",
          fileInfo: {
            name: "photo.jpg",
            type: "image/jpeg",
            size: 12345,
          },
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = usePhoto();
      const result = await composable.uploadPhoto("event-123", "session-456", mockFile);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/session/photo",
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer test-access-token",
          },
          body: expect.any(FormData),
        }),
      );
      expect(result).toEqual(mockResponse.data);
      expect(composable.isLoading.value).toBe(false);
      expect(composable.error.value).toBeNull();
    });

    it("should handle no access token", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: null,
        },
      } as never);

      const mockFile = new File(["photo"], "photo.jpg", { type: "image/jpeg" });
      const composable = usePhoto();
      const result = await composable.uploadPhoto("event-123", "session-456", mockFile);

      expect(result).toBeNull();
      expect(composable.error.value).toBe("No valid session found");
    });

    it("should handle API error response", async () => {
      const mockFile = new File(["photo"], "photo.jpg", { type: "image/jpeg" });
      const mockResponse = {
        success: false,
        error: "Upload failed",
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = usePhoto();
      const result = await composable.uploadPhoto("event-123", "session-456", mockFile);

      expect(result).toBeNull();
      expect(composable.error.value).toBe("Failed to upload photo");
    });

    it("should handle API response without data", async () => {
      const mockFile = new File(["photo"], "photo.jpg", { type: "image/jpeg" });
      const mockResponse = {
        success: true,
        data: null,
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = usePhoto();
      const result = await composable.uploadPhoto("event-123", "session-456", mockFile);

      expect(result).toBeNull();
      expect(composable.error.value).toBe("Failed to upload photo");
    });

    it("should handle network error", async () => {
      const mockFile = new File(["photo"], "photo.jpg", { type: "image/jpeg" });
      mockFetch.mockRejectedValue(new Error("Network error") as never);

      const composable = usePhoto();
      const result = await composable.uploadPhoto("event-123", "session-456", mockFile);

      expect(result).toBeNull();
      expect(composable.error.value).toBe("Network error");
    });

    it("should handle different image formats", async () => {
      const formats = [
        { type: "image/jpeg", ext: "jpg" },
        { type: "image/png", ext: "png" },
        { type: "image/webp", ext: "webp" },
      ];

      const mockResponse = {
        success: true,
        data: {
          sessionId: "session-123",
          photoUrl: "photos/photo.jpg",
          fileInfo: {
            name: "photo.jpg",
            type: "image/jpeg",
            size: 12345,
          },
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = usePhoto();

      for (const format of formats) {
        const mockFile = new File(["photo"], `photo.${format.ext}`, { type: format.type });
        const result = await composable.uploadPhoto("event-123", "session-456", mockFile);

        expect(result).toBeDefined();
        expect(composable.error.value).toBeNull();
      }
    });

    it("should handle large file upload", async () => {
      const largeContent = new Array(5 * 1024 * 1024).fill("a").join("");
      const mockFile = new File([largeContent], "large.jpg", { type: "image/jpeg" });
      const mockResponse = {
        success: true,
        data: {
          sessionId: "session-123",
          photoUrl: "photos/large.jpg",
          fileInfo: {
            name: "large.jpg",
            type: "image/jpeg",
            size: largeContent.length,
          },
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = usePhoto();
      const result = await composable.uploadPhoto("event-123", "session-456", mockFile);

      expect(result).toBeDefined();
      expect(composable.error.value).toBeNull();
    });

    it("should handle empty file", async () => {
      const mockFile = new File([], "empty.jpg", { type: "image/jpeg" });
      const mockResponse = {
        success: true,
        data: {
          sessionId: "session-123",
          photoUrl: "photos/empty.jpg",
          fileInfo: {
            name: "empty.jpg",
            type: "image/jpeg",
            size: 0,
          },
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = usePhoto();
      const result = await composable.uploadPhoto("event-123", "session-456", mockFile);

      expect(result).toBeDefined();
    });

    it("should handle file with special characters in name", async () => {
      const mockFile = new File(["photo"], "photo (1) [copy].jpg", { type: "image/jpeg" });
      const mockResponse = {
        success: true,
        data: {
          sessionId: "session-123",
          photoUrl: "photos/photo.jpg",
          fileInfo: {
            name: "photo (1) [copy].jpg",
            type: "image/jpeg",
            size: 5,
          },
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = usePhoto();
      const result = await composable.uploadPhoto("event-123", "session-456", mockFile);

      expect(result).toBeDefined();
    });

    it("should handle empty eventId", async () => {
      const mockFile = new File(["photo"], "photo.jpg", { type: "image/jpeg" });
      const mockResponse = {
        success: true,
        data: {
          sessionId: "session-123",
          photoUrl: "photos/photo.jpg",
          fileInfo: {
            name: "photo.jpg",
            type: "image/jpeg",
            size: 5,
          },
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = usePhoto();
      const result = await composable.uploadPhoto("", "session-456", mockFile);

      expect(result).toBeDefined();
    });

    it("should handle empty sessionId", async () => {
      const mockFile = new File(["photo"], "photo.jpg", { type: "image/jpeg" });
      const mockResponse = {
        success: true,
        data: {
          sessionId: "",
          photoUrl: "photos/photo.jpg",
          fileInfo: {
            name: "photo.jpg",
            type: "image/jpeg",
            size: 5,
          },
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = usePhoto();
      const result = await composable.uploadPhoto("event-123", "", mockFile);

      expect(result).toBeDefined();
    });
  });

  describe("dataUrlToFile", () => {
    it("should convert valid data URL to File", () => {
      const dataUrl = "data:image/jpeg;base64,SGVsbG8gV29ybGQ=";
      const filename = "test.jpg";

      const composable = usePhoto();
      const file = composable.dataUrlToFile(dataUrl, filename);

      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe(filename);
      expect(file.type).toBe("image/jpeg");
    });

    it("should handle data URL without mime type", () => {
      const dataUrl = "data:;base64,SGVsbG8gV29ybGQ=";
      const filename = "test.jpg";

      const composable = usePhoto();
      const file = composable.dataUrlToFile(dataUrl, filename);

      expect(file).toBeInstanceOf(File);
      expect(file.type).toBe("image/jpeg"); // default
    });

    it("should handle PNG data URL", () => {
      const dataUrl = "data:image/png;base64,SGVsbG8gV29ybGQ=";
      const filename = "test.png";

      const composable = usePhoto();
      const file = composable.dataUrlToFile(dataUrl, filename);

      expect(file.type).toBe("image/png");
    });

    it("should handle WebP data URL", () => {
      const dataUrl = "data:image/webp;base64,SGVsbG8gV29ybGQ=";
      const filename = "test.webp";

      const composable = usePhoto();
      const file = composable.dataUrlToFile(dataUrl, filename);

      expect(file.type).toBe("image/webp");
    });

    it("should throw error for invalid data URL without comma", () => {
      const dataUrl = "data:image/jpegSGVsbG8gV29ybGQ=";
      const filename = "test.jpg";

      const composable = usePhoto();

      expect(() => {
        composable.dataUrlToFile(dataUrl, filename);
      }).toThrow("Invalid data URL: missing data part");
    });

    it("should throw error for empty data URL", () => {
      const dataUrl = "";
      const filename = "test.jpg";

      const composable = usePhoto();

      expect(() => {
        composable.dataUrlToFile(dataUrl, filename);
      }).toThrow("Invalid data URL: missing data part");
    });

    it("should throw error for data URL with empty body", () => {
      const dataUrl = "data:image/jpeg;base64,";
      const filename = "test.jpg";

      const composable = usePhoto();

      expect(() => {
        composable.dataUrlToFile(dataUrl, filename);
      }).toThrow("Invalid data URL: missing data part");
    });

    it("should handle data URL with special characters in filename", () => {
      const dataUrl = "data:image/jpeg;base64,SGVsbG8gV29ybGQ=";
      const filename = "photo (1).jpg";

      const composable = usePhoto();
      const file = composable.dataUrlToFile(dataUrl, filename);

      expect(file.name).toBe(filename);
    });

    it("should handle very long data URL", () => {
      const longBase64 = Buffer.from("x".repeat(10000)).toString("base64");
      const dataUrl = `data:image/jpeg;base64,${longBase64}`;
      const filename = "large.jpg";

      const composable = usePhoto();
      const file = composable.dataUrlToFile(dataUrl, filename);

      expect(file).toBeInstanceOf(File);
      expect(file.size).toBeGreaterThan(0);
    });

    it("should handle data URL with charset parameter", () => {
      const dataUrl = "data:image/jpeg;charset=utf-8;base64,SGVsbG8gV29ybGQ=";
      const filename = "test.jpg";

      const composable = usePhoto();
      const file = composable.dataUrlToFile(dataUrl, filename);

      expect(file.type).toBe("image/jpeg");
    });
  });

  describe("getPhotoUrl", () => {
    it("should generate correct photo URL", () => {
      const photoUrl = "photos/test-photo.jpg";

      const composable = usePhoto();
      const url = composable.getPhotoUrl(photoUrl);

      expect(url).toBe(
        "https://test.supabase.co/storage/v1/object/public/Test/photos/test-photo.jpg",
      );
    });

    it("should handle photo URL without leading slash", () => {
      const photoUrl = "test-photo.jpg";

      const composable = usePhoto();
      const url = composable.getPhotoUrl(photoUrl);

      expect(url).toBe("https://test.supabase.co/storage/v1/object/public/Test/test-photo.jpg");
    });

    it("should handle photo URL with special characters", () => {
      const photoUrl = "photos/photo-test.jpg";

      const composable = usePhoto();
      const url = composable.getPhotoUrl(photoUrl);

      expect(url).toContain("photos/photo-test.jpg");
    });

    it("should handle empty photo URL", () => {
      const photoUrl = "";

      const composable = usePhoto();
      const url = composable.getPhotoUrl(photoUrl);

      expect(url).toBe("https://test.supabase.co/storage/v1/object/public/Test/");
    });

    it("should handle photo URL with spaces", () => {
      const photoUrl = "photos/photo with spaces.jpg";

      const composable = usePhoto();
      const url = composable.getPhotoUrl(photoUrl);

      expect(url).toContain("photo with spaces.jpg");
    });

    it("should handle nested path photo URL", () => {
      const photoUrl = "events/event-123/sessions/session-456/photo.jpg";

      const composable = usePhoto();
      const url = composable.getPhotoUrl(photoUrl);

      expect(url).toBe(
        "https://test.supabase.co/storage/v1/object/public/Test/events/event-123/sessions/session-456/photo.jpg",
      );
    });
  });

  describe("getPhotoFile", () => {
    it("should get photo file successfully", async () => {
      const mockBlob = new Blob(["photo data"], { type: "image/jpeg" });
      const mockResponse = {
        ok: true,
        blob: jest.fn(() => Promise.resolve(mockBlob)),
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = usePhoto();
      const result = await composable.getPhotoFile("session-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/session/photo?sessionId=session-123&mode=blob",
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

    it("should handle no access token", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: null,
        },
      } as never);

      const composable = usePhoto();
      const result = await composable.getPhotoFile("session-123");

      expect(result).toBeNull();
      expect(composable.error.value).toBe("No valid session found");
    });

    it("should handle response not ok - 404", async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: "Not Found",
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = usePhoto();
      const result = await composable.getPhotoFile("session-123");

      expect(result).toBeNull();
      expect(composable.error.value).toBe("Failed to get photo: Not Found");
    });

    it("should handle response not ok - 500", async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = usePhoto();
      const result = await composable.getPhotoFile("session-123");

      expect(result).toBeNull();
      expect(composable.error.value).toBe("Failed to get photo: Internal Server Error");
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network timeout") as never);

      const composable = usePhoto();
      const result = await composable.getPhotoFile("session-123");

      expect(result).toBeNull();
      expect(composable.error.value).toBe("Network timeout");
    });

    it("should handle special characters in sessionId", async () => {
      const mockBlob = new Blob(["photo data"], { type: "image/jpeg" });
      const mockResponse = {
        ok: true,
        blob: jest.fn(() => Promise.resolve(mockBlob)),
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = usePhoto();
      await composable.getPhotoFile("session-special-123");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("session-special-123"),
        expect.any(Object),
      );
    });

    it("should handle empty blob", async () => {
      const mockBlob = new Blob([], { type: "image/jpeg" });
      const mockResponse = {
        ok: true,
        blob: jest.fn(() => Promise.resolve(mockBlob)),
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = usePhoto();
      const result = await composable.getPhotoFile("session-123");

      expect(result).toBe("blob:http://localhost/test-blob");
    });

    it("should handle blob with different mime types", async () => {
      const mimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

      const composable = usePhoto();

      for (const mimeType of mimeTypes) {
        const mockBlob = new Blob(["data"], { type: mimeType });
        const mockResponse = {
          ok: true,
          blob: jest.fn(() => Promise.resolve(mockBlob)),
        };

        mockFetch.mockResolvedValue(mockResponse as never);

        const result = await composable.getPhotoFile("session-123");

        expect(result).toBeDefined();
        expect(composable.error.value).toBeNull();
      }
    });
  });

  describe("State Management", () => {
    it("should manage isLoading state correctly for createPhotoSession", async () => {
      const mockResponse = {
        success: true,
        data: {
          sessionId: "session-123",
          eventId: "event-456",
          createdAt: "2024-01-01T00:00:00Z",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = usePhoto();
      expect(composable.isLoading.value).toBe(false);

      // Start operation
      const promise = composable.createPhotoSession("event-456");

      // Check state during operation
      expect(composable.isLoading.value).toBe(true);

      // Wait for completion
      await promise;

      expect(composable.isLoading.value).toBe(false);
    });

    it("should manage error state correctly", async () => {
      mockFetch.mockRejectedValue(new Error("Test error") as never);

      const composable = usePhoto();
      expect(composable.error.value).toBeNull();

      await composable.createPhotoSession("event-123");

      expect(composable.error.value).toBe("Test error");
    });

    it("should clear error on successful operation after error", async () => {
      const composable = usePhoto();

      // First: error
      mockFetch.mockRejectedValueOnce(new Error("First error") as never);
      await composable.createPhotoSession("event-123");
      expect(composable.error.value).toBe("First error");

      // Second: success
      const mockResponse = {
        success: true,
        data: {
          sessionId: "session-123",
          eventId: "event-123",
          createdAt: "2024-01-01T00:00:00Z",
        },
      };
      mockFetch.mockResolvedValue(mockResponse as never);

      await composable.createPhotoSession("event-123");
      expect(composable.error.value).toBeNull();
    });

    it("should maintain separate state for multiple instances", async () => {
      const mockResponse = {
        success: true,
        data: {
          sessionId: "session-123",
          eventId: "event-456",
          createdAt: "2024-01-01T00:00:00Z",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable1 = usePhoto();
      const composable2 = usePhoto();

      expect(composable1.isLoading.value).toBe(false);
      expect(composable2.isLoading.value).toBe(false);

      await composable1.createPhotoSession("event-123");

      // Each instance has its own ref
      expect(composable1.isLoading.value).toBe(false);
      expect(composable2.isLoading.value).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should handle Error instances correctly", async () => {
      mockFetch.mockRejectedValue(new Error("Standard error") as never);

      const composable = usePhoto();
      await composable.createPhotoSession("event-123");

      expect(composable.error.value).toBe("Standard error");
    });

    it("should handle string errors correctly", async () => {
      mockFetch.mockRejectedValue("String error message" as never);

      const composable = usePhoto();
      await composable.createPhotoSession("event-123");

      expect(composable.error.value).toBe("String error message");
    });

    it("should handle unknown error types with default message", async () => {
      mockFetch.mockRejectedValue({ unknown: "error" } as never);

      const composable = usePhoto();
      await composable.createPhotoSession("event-123");

      expect(composable.error.value).toBe("Failed to create session");
    });

    it("should handle null error", async () => {
      mockFetch.mockRejectedValue(null as never);

      const composable = usePhoto();
      await composable.createPhotoSession("event-123");

      expect(composable.error.value).toBe("Failed to create session");
    });

    it("should handle undefined error", async () => {
      mockFetch.mockRejectedValue(undefined as never);

      const composable = usePhoto();
      await composable.createPhotoSession("event-123");

      expect(composable.error.value).toBe("Failed to create session");
    });

    it("should handle different error messages for different operations", async () => {
      const composable = usePhoto();

      // createPhotoSession error
      mockFetch.mockRejectedValueOnce({ error: "create error" } as never);
      await composable.createPhotoSession("event-123");
      expect(composable.error.value).toBe("Failed to create session");

      // getPhotoSession error
      mockFetch.mockRejectedValueOnce({ error: "get error" } as never);
      await composable.getPhotoSession("session-123");
      expect(composable.error.value).toBe("Failed to get session");

      // uploadPhoto error
      const mockFile = new File(["photo"], "photo.jpg", { type: "image/jpeg" });
      mockFetch.mockRejectedValueOnce({ error: "upload error" } as never);
      await composable.uploadPhoto("event-123", "session-456", mockFile);
      expect(composable.error.value).toBe("Failed to upload photo");

      // getPhotoFile error
      mockFetch.mockRejectedValueOnce({ error: "get file error" } as never);
      await composable.getPhotoFile("session-123");
      expect(composable.error.value).toBe("Failed to get photo file");
    });
  });

  describe("Edge Cases and Integration", () => {
    it("should handle concurrent createPhotoSession requests", async () => {
      const mockResponse1 = {
        success: true,
        data: {
          sessionId: "session-1",
          eventId: "event-1",
          createdAt: "2024-01-01T00:00:00Z",
        },
      };

      const mockResponse2 = {
        success: true,
        data: {
          sessionId: "session-2",
          eventId: "event-2",
          createdAt: "2024-01-02T00:00:00Z",
        },
      };

      mockFetch
        .mockResolvedValueOnce(mockResponse1 as never)
        .mockResolvedValueOnce(mockResponse2 as never);

      const composable = usePhoto();

      const promises = [
        composable.createPhotoSession("event-1"),
        composable.createPhotoSession("event-2"),
      ];

      const results = await Promise.all(promises);

      expect(results[0]?.id).toBe("session-1");
      expect(results[1]?.id).toBe("session-2");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should handle sequential operations", async () => {
      const composable = usePhoto();

      // Create session
      const createResponse = {
        success: true,
        data: {
          sessionId: "session-123",
          eventId: "event-456",
          createdAt: "2024-01-01T00:00:00Z",
        },
      };
      mockFetch.mockResolvedValueOnce(createResponse as never);
      const createResult = await composable.createPhotoSession("event-456");
      expect(createResult?.id).toBe("session-123");

      // Get session
      const getResponse = {
        success: true,
        data: {
          id: "session-123",
          eventId: "event-456",
        },
      };
      mockFetch.mockResolvedValueOnce(getResponse as never);
      const getResult = await composable.getPhotoSession("session-123");
      expect(getResult?.id).toBe("session-123");

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should handle extremely long IDs", async () => {
      const longId = "a".repeat(1000);
      const mockResponse = {
        success: true,
        data: {
          sessionId: longId,
          eventId: longId,
          createdAt: "2024-01-01T00:00:00Z",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = usePhoto();
      const result = await composable.createPhotoSession(longId);

      expect(result?.eventId).toBe(longId);
    });

    it("should handle null response from API", async () => {
      mockFetch.mockResolvedValue(null as never);

      const composable = usePhoto();
      const result = await composable.createPhotoSession("event-123");

      expect(result).toBeNull();
    });

    it("should handle undefined response from API", async () => {
      mockFetch.mockResolvedValue(undefined as never);

      const composable = usePhoto();
      const result = await composable.createPhotoSession("event-123");

      expect(result).toBeNull();
    });

    it("should handle malformed API response", async () => {
      const mockResponse = {
        // Missing success field
        data: {
          sessionId: "session-123",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = usePhoto();
      const result = await composable.createPhotoSession("event-123");

      expect(result).toBeNull();
    });
  });

  describe("Realistic User Flows", () => {
    it("should complete full photo upload workflow", async () => {
      const composable = usePhoto();

      // Step 1: Create photo session
      const createResponse = {
        success: true,
        data: {
          sessionId: "session-123",
          eventId: "event-456",
          createdAt: "2024-01-01T00:00:00Z",
        },
      };
      mockFetch.mockResolvedValueOnce(createResponse as never);

      const session = await composable.createPhotoSession("event-456");
      expect(session?.id).toBe("session-123");
      expect(composable.error.value).toBeNull();

      // Step 2: Upload photo
      const mockFile = new File(["photo content"], "selfie.jpg", { type: "image/jpeg" });
      const uploadResponse = {
        success: true,
        data: {
          sessionId: "session-123",
          photoUrl: "photos/selfie-123.jpg",
          fileInfo: {
            name: "selfie.jpg",
            type: "image/jpeg",
            size: 12345,
          },
        },
      };
      mockFetch.mockResolvedValueOnce(uploadResponse as never);

      const uploadResult = await composable.uploadPhoto("event-456", "session-123", mockFile);
      expect(uploadResult?.sessionId).toBe("session-123");
      expect(uploadResult?.photoUrl).toBe("photos/selfie-123.jpg");
      expect(composable.error.value).toBeNull();

      // Step 3: Get photo session with uploaded photo
      const getSessionResponse = {
        success: true,
        data: {
          id: "session-123",
          eventId: "event-456",
          photoUrl: "photos/selfie-123.jpg",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T01:00:00Z",
        },
      };
      mockFetch.mockResolvedValueOnce(getSessionResponse as never);

      const updatedSession = await composable.getPhotoSession("session-123");
      expect(updatedSession?.photoUrl).toBe("photos/selfie-123.jpg");
      expect(composable.error.value).toBeNull();

      // Verify all steps completed
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should handle photo retrieval flow", async () => {
      const composable = usePhoto();

      // Step 1: Get session
      const getSessionResponse = {
        success: true,
        data: {
          id: "session-123",
          eventId: "event-456",
          photoUrl: "photos/photo-123.jpg",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T01:00:00Z",
        },
      };
      mockFetch.mockResolvedValueOnce(getSessionResponse as never);

      const session = await composable.getPhotoSession("session-123");
      expect(session?.photoUrl).toBe("photos/photo-123.jpg");

      // Step 2: Get photo URL
      const photoUrl = composable.getPhotoUrl(session?.photoUrl || "");
      expect(photoUrl).toContain("photos/photo-123.jpg");
      expect(photoUrl).toContain("supabase");

      // Step 3: Get photo file as blob
      const mockBlob = new Blob(["photo data"], { type: "image/jpeg" });
      const mockBlobResponse = {
        ok: true,
        blob: jest.fn(() => Promise.resolve(mockBlob)),
      };
      mockFetch.mockResolvedValueOnce(mockBlobResponse as never);

      const blobUrl = await composable.getPhotoFile("session-123");
      expect(blobUrl).toContain("blob:");
      expect(composable.error.value).toBeNull();
    });

    it("should handle error recovery flow", async () => {
      const composable = usePhoto();

      // First attempt: network error
      mockFetch.mockRejectedValueOnce(new Error("Network error") as never);
      const result1 = await composable.createPhotoSession("event-123");
      expect(result1).toBeNull();
      expect(composable.error.value).toBe("Network error");

      // Second attempt: API error
      const errorResponse = {
        success: false,
        error: "Event not found",
      };
      mockFetch.mockResolvedValueOnce(errorResponse as never);
      const result2 = await composable.createPhotoSession("event-123");
      expect(result2).toBeNull();
      expect(composable.error.value).toBe("Failed to create session");

      // Third attempt: success
      const successResponse = {
        success: true,
        data: {
          sessionId: "session-123",
          eventId: "event-123",
          createdAt: "2024-01-01T00:00:00Z",
        },
      };
      mockFetch.mockResolvedValueOnce(successResponse as never);
      const result3 = await composable.createPhotoSession("event-123");
      expect(result3?.id).toBe("session-123");
      expect(composable.error.value).toBeNull();
    });

    it("should handle data URL to file upload flow", async () => {
      const composable = usePhoto();

      // Step 1: Convert data URL to file
      const dataUrl = "data:image/jpeg;base64,SGVsbG8gV29ybGQ=";
      const file = composable.dataUrlToFile(dataUrl, "camera-photo.jpg");
      expect(file.name).toBe("camera-photo.jpg");
      expect(file.type).toBe("image/jpeg");

      // Step 2: Upload converted file
      const uploadResponse = {
        success: true,
        data: {
          sessionId: "session-123",
          photoUrl: "photos/camera-photo-123.jpg",
          fileInfo: {
            name: "camera-photo.jpg",
            type: "image/jpeg",
            size: file.size,
          },
        },
      };
      mockFetch.mockResolvedValueOnce(uploadResponse as never);

      const result = await composable.uploadPhoto("event-123", "session-456", file);
      expect(result?.photoUrl).toBe("photos/camera-photo-123.jpg");
    });

    it("should handle multiple sessions for same event", async () => {
      const composable = usePhoto();

      // Create three sessions for the same event
      for (let i = 1; i <= 3; i++) {
        const mockResponse = {
          success: true,
          data: {
            sessionId: `session-${i}`,
            eventId: "event-123",
            createdAt: "2024-01-01T00:00:00Z",
          },
        };
        mockFetch.mockResolvedValueOnce(mockResponse as never);

        const result = await composable.createPhotoSession("event-123");
        expect(result?.id).toBe(`session-${i}`);
        expect(result?.eventId).toBe("event-123");
      }

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should handle photo upload with immediate retrieval", async () => {
      const composable = usePhoto();

      // Upload photo
      const mockFile = new File(["photo"], "photo.jpg", { type: "image/jpeg" });
      const uploadResponse = {
        success: true,
        data: {
          sessionId: "session-123",
          photoUrl: "photos/photo-123.jpg",
          fileInfo: {
            name: "photo.jpg",
            type: "image/jpeg",
            size: 5,
          },
        },
      };
      mockFetch.mockResolvedValueOnce(uploadResponse as never);

      const uploadResult = await composable.uploadPhoto("event-123", "session-123", mockFile);
      expect(uploadResult?.photoUrl).toBe("photos/photo-123.jpg");

      // Immediately retrieve the uploaded photo
      const mockBlob = new Blob(["photo"], { type: "image/jpeg" });
      const blobResponse = {
        ok: true,
        blob: jest.fn(() => Promise.resolve(mockBlob)),
      };
      mockFetch.mockResolvedValueOnce(blobResponse as never);

      const blobUrl = await composable.getPhotoFile("session-123");
      expect(blobUrl).toContain("blob:");
      expect(composable.error.value).toBeNull();
    });
  });

  describe("Type Safety and Input Validation", () => {
    it("should handle various data URL formats", () => {
      const composable = usePhoto();

      const testCases = [
        { dataUrl: "data:image/jpeg;base64,SGVsbG8=", expectedType: "image/jpeg" },
        { dataUrl: "data:image/png;base64,SGVsbG8=", expectedType: "image/png" },
        { dataUrl: "data:image/webp;base64,SGVsbG8=", expectedType: "image/webp" },
        { dataUrl: "data:image/gif;base64,SGVsbG8=", expectedType: "image/gif" },
      ];

      for (const testCase of testCases) {
        const file = composable.dataUrlToFile(testCase.dataUrl, "test.jpg");
        expect(file.type).toBe(testCase.expectedType);
      }
    });

    it("should handle URL encoding for special characters", async () => {
      const composable = usePhoto();

      const specialId = "session-test-123/with?special=chars&more";
      const mockResponse = {
        success: true,
        data: {
          id: specialId,
          eventId: "event-123",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      await composable.getPhotoSession(specialId);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("session-test-123"),
        expect.any(Object),
      );
    });

    it("should handle FormData properly in uploadPhoto", async () => {
      const mockFile = new File(["content"], "test.jpg", { type: "image/jpeg" });
      const mockResponse = {
        success: true,
        data: {
          sessionId: "session-123",
          photoUrl: "photos/test.jpg",
          fileInfo: {
            name: "test.jpg",
            type: "image/jpeg",
            size: 7,
          },
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = usePhoto();
      await composable.uploadPhoto("event-123", "session-456", mockFile);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/session/photo",
        expect.objectContaining({
          method: "POST",
          body: expect.any(FormData),
        }),
      );
    });

    it("should handle zero-length files", async () => {
      const mockFile = new File([], "empty.jpg", { type: "image/jpeg" });
      const mockResponse = {
        success: true,
        data: {
          sessionId: "session-123",
          photoUrl: "photos/empty.jpg",
          fileInfo: {
            name: "empty.jpg",
            type: "image/jpeg",
            size: 0,
          },
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = usePhoto();
      const result = await composable.uploadPhoto("event-123", "session-456", mockFile);

      expect(result).toBeDefined();
    });
  });

  describe("Console Logging", () => {
    it("should log session creation information", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      const mockResponse = {
        success: true,
        data: {
          sessionId: "session-123",
          eventId: "event-456",
          createdAt: "2024-01-01T00:00:00Z",
        },
      };

      mockFetch.mockResolvedValue(mockResponse as never);

      const composable = usePhoto();
      await composable.createPhotoSession("event-456");

      expect(consoleSpy).toHaveBeenCalledWith("Creating session with eventId:", "event-456");
      expect(consoleSpy).toHaveBeenCalledWith("Session create response:", mockResponse);

      consoleSpy.mockRestore();
    });

    it("should log errors during session creation", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      mockFetch.mockRejectedValue(new Error("Test error") as never);

      const composable = usePhoto();
      await composable.createPhotoSession("event-123");

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error creating session:", expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it("should log errors during session retrieval", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      mockFetch.mockRejectedValue(new Error("Get error") as never);

      const composable = usePhoto();
      await composable.getPhotoSession("session-123");

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error getting session:", expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it("should log errors during photo upload", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const mockFile = new File(["photo"], "photo.jpg", { type: "image/jpeg" });
      mockFetch.mockRejectedValue(new Error("Upload error") as never);

      const composable = usePhoto();
      await composable.uploadPhoto("event-123", "session-456", mockFile);

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error uploading photo:", expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it("should log errors during photo file retrieval", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      mockFetch.mockRejectedValue(new Error("File error") as never);

      const composable = usePhoto();
      await composable.getPhotoFile("session-123");

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error getting photo file:", expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });
});
