import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { Style } from "@prisma/client";
import {
  mockCreateAdminClient,
  mockCreateError,
  mockDefineEventHandler,
  mockGetQuery,
  mockGetStorageBucket,
  mockRequireAuth,
  mockSetHeader,
} from "~/tests/server/mocks/mocks";
import { ERROR_STATUS_MAP } from "~/server/types/core";

const mockGetAIPhotoById = jest.fn();
const mockCreateSignedUrl =
  jest.fn<
    () => Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>
  >();
const mockDownload =
  jest.fn<() => Promise<{ data: Blob | null; error: { message: string } | null }>>();

jest.mock("h3", () => ({
  defineEventHandler: mockDefineEventHandler,
  getQuery: mockGetQuery,
  createError: mockCreateError,
  setHeader: mockSetHeader,
}));
jest.mock("~~/server/utils/auth", () => ({
  requireAuth: mockRequireAuth,
}));
jest.mock("~~/server/model", () => ({
  getAIPhotoById: mockGetAIPhotoById,
}));
jest.mock("~~/server/clients", () => ({
  createAdminClient: mockCreateAdminClient,
}));
jest.mock("~~/server/utils/storage/path.utils", () => ({
  getStorageBucket: mockGetStorageBucket,
}));

type MockEvent = {
  node: {
    req: Record<string, unknown>;
    res: Record<string, unknown>;
  };
};

type SignedUrlResponse = {
  success: boolean;
  message: string;
  data: {
    url: string;
    expiresIn: number;
  };
};

type ErrorOptions = {
  statusCode: number;
  statusMessage: string;
  data: {
    error: {
      type: string;
      code: string;
      message: string;
    };
  };
};

const createMockBlob = (content = "image data"): Blob => {
  return new Blob([content], { type: "image/jpeg" });
};

describe("API: GET /api/v1/aiphoto/aiphoto", () => {
  let handler: (event: unknown) => Promise<unknown>;
  let mockEvent: MockEvent;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(async () => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    mockEvent = {
      node: {
        req: {},
        res: {},
      },
    };

    mockGetStorageBucket.mockReturnValue("test-bucket");
    const mockFrom = jest.fn();
    mockFrom.mockReturnValue({
      createSignedUrl: mockCreateSignedUrl,
      download: mockDownload,
    });
    mockCreateAdminClient.mockReturnValue({
      storage: {
        from: mockFrom,
      },
    } as never);

    const module = await import("~/server/api/v1/aiphoto/aiphoto.get");
    handler = module.default as (event: unknown) => Promise<unknown>;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("Authentication", () => {
    it("should call requireAuth with event", async () => {
      mockRequireAuth.mockRejectedValue(new Error("Unauthorized") as never);
      await expect(handler(mockEvent)).rejects.toThrow("Unauthorized");
      expect(mockRequireAuth).toHaveBeenCalledWith(mockEvent);
    });

    it("should reject unauthenticated requests", async () => {
      mockRequireAuth.mockRejectedValue(new Error("Authentication required") as never);

      await expect(handler(mockEvent)).rejects.toThrow("Authentication required");
      expect(mockRequireAuth).toHaveBeenCalled();
    });
  });

  describe("Validation", () => {
    it("should require aiPhotoId parameter", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({});

      const error = new Error("AI Photo ID is required");
      mockCreateError.mockImplementation(() => {
        throw error;
      });

      await expect(handler(mockEvent)).rejects.toThrow("AI Photo ID is required");

      expect(mockCreateError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
          statusMessage: "AI Photo ID is required",
        }),
      );
    });

    it("should reject undefined aiPhotoId", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: undefined });

      const error = new Error("AI Photo ID is required");
      mockCreateError.mockImplementation(() => {
        throw error;
      });

      await expect(handler(mockEvent)).rejects.toThrow("AI Photo ID is required");
    });

    it("should reject empty string aiPhotoId", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "" });

      const error = new Error("AI Photo ID is required");
      mockCreateError.mockImplementation(() => {
        throw error;
      });

      await expect(handler(mockEvent)).rejects.toThrow("AI Photo ID is required");
    });

    it("should include error data for missing aiPhotoId", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({});

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.data.error.type).toBe("VALIDATION_ERROR");
        expect(opts.data.error.code).toBe("MISSING_AI_PHOTO_ID");
        throw new Error("AI Photo ID is required");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });
  });

  describe("AI Photo Verification", () => {
    it("should check if AI photo exists", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123" });

      const mockAIPhoto = {
        id: "photo-123",
        style: Style.Anime,
        generatedUrl: "path/to/photo.jpg",
        photoSession: {
          id: "session-456",
          eventId: "event-789",
        },
      };

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockDownload.mockResolvedValue({
        data: createMockBlob(),
        error: null,
      });

      await handler(mockEvent);

      expect(mockGetAIPhotoById).toHaveBeenCalledWith("photo-123", "user-123");
    });

    it("should return 404 if AI photo not found", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123" });
      mockGetAIPhotoById.mockResolvedValue(null as never);

      const error = new Error("AI Photo not found");
      mockCreateError.mockImplementation(() => {
        throw error;
      });

      await expect(handler(mockEvent)).rejects.toThrow("AI Photo not found");
      expect(mockCreateError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: ERROR_STATUS_MAP.NOT_FOUND,
          statusMessage: "AI Photo not found",
        }),
      );
    });

    it("should return 404 if generatedUrl is empty", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123" });

      const mockAIPhoto = {
        id: "photo-123",
        style: Style.Anime,
        generatedUrl: "",
        photoSession: {
          id: "session-456",
          eventId: "event-789",
        },
      };

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);

      const error = new Error("AI Photo file not found");
      mockCreateError.mockImplementation(() => {
        throw error;
      });

      await expect(handler(mockEvent)).rejects.toThrow("AI Photo file not found");
      expect(mockCreateError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: ERROR_STATUS_MAP.NOT_FOUND,
          statusMessage: "AI Photo file not found",
        }),
      );
    });

    it("should include error data for missing file", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123" });

      const mockAIPhoto = {
        id: "photo-123",
        style: Style.Anime,
        generatedUrl: "",
        photoSession: {
          id: "session-456",
          eventId: "event-789",
        },
      };

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.data.error.type).toBe("NOT_FOUND");
        expect(opts.data.error.code).toBe("FILE_NOT_FOUND");
        expect(opts.data.error.message).toBe("AI Photo file not found in storage");
        throw new Error("AI Photo file not found");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });
  });

  describe("Signed URL Mode", () => {
    it("should return signed URL when mode is signed", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123", mode: "signed" });

      const mockAIPhoto = {
        id: "photo-123",
        style: Style.Anime,
        generatedUrl: "path/to/photo.jpg",
        photoSession: {
          id: "session-456",
          eventId: "event-789",
        },
      };

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: "https://example.com/signed-url" },
        error: null,
      });

      const result = (await handler(mockEvent)) as SignedUrlResponse;

      expect(mockCreateSignedUrl).toHaveBeenCalledWith("path/to/photo.jpg", 600);
      expect(result).toEqual({
        success: true,
        message: "Signed URL created successfully",
        data: {
          url: "https://example.com/signed-url",
          expiresIn: 600,
        },
      });
    });

    it("should use default expires value of 600 seconds", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123", mode: "signed" });

      const mockAIPhoto = {
        id: "photo-123",
        style: Style.Anime,
        generatedUrl: "path/to/photo.jpg",
        photoSession: {
          id: "session-456",
          eventId: "event-789",
        },
      };

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: "https://example.com/signed-url" },
        error: null,
      });

      const result = (await handler(mockEvent)) as SignedUrlResponse;

      expect(mockCreateSignedUrl).toHaveBeenCalledWith("path/to/photo.jpg", 600);
      expect(result.data.expiresIn).toBe(600);
    });

    it("should use custom expires value", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123", mode: "signed", expires: "1800" });

      const mockAIPhoto = {
        id: "photo-123",
        style: Style.Anime,
        generatedUrl: "path/to/photo.jpg",
        photoSession: {
          id: "session-456",
          eventId: "event-789",
        },
      };

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: "https://example.com/signed-url" },
        error: null,
      });

      const result = (await handler(mockEvent)) as SignedUrlResponse;

      expect(mockCreateSignedUrl).toHaveBeenCalledWith("path/to/photo.jpg", 1800);
      expect(result.data.expiresIn).toBe(1800);
    });

    it("should clamp expires to minimum 10 seconds", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123", mode: "signed", expires: "5" });

      const mockAIPhoto = {
        id: "photo-123",
        style: Style.Anime,
        generatedUrl: "path/to/photo.jpg",
        photoSession: {
          id: "session-456",
          eventId: "event-789",
        },
      };

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: "https://example.com/signed-url" },
        error: null,
      });

      const result = (await handler(mockEvent)) as SignedUrlResponse;

      expect(mockCreateSignedUrl).toHaveBeenCalledWith("path/to/photo.jpg", 10);
      expect(result.data.expiresIn).toBe(10);
    });

    it("should clamp expires to maximum 3600 seconds", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123", mode: "signed", expires: "5000" });

      const mockAIPhoto = {
        id: "photo-123",
        style: Style.Anime,
        generatedUrl: "path/to/photo.jpg",
        photoSession: {
          id: "session-456",
          eventId: "event-789",
        },
      };

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: "https://example.com/signed-url" },
        error: null,
      });

      const result = (await handler(mockEvent)) as SignedUrlResponse;

      expect(mockCreateSignedUrl).toHaveBeenCalledWith("path/to/photo.jpg", 3600);
      expect(result.data.expiresIn).toBe(3600);
    });

    it("should handle createSignedUrl errors", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123", mode: "signed" });

      const mockAIPhoto = {
        id: "photo-123",
        style: Style.Anime,
        generatedUrl: "path/to/photo.jpg",
        photoSession: {
          id: "session-456",
          eventId: "event-789",
        },
      };

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockCreateSignedUrl.mockResolvedValue({
        data: null,
        error: { message: "Signed URL creation failed" },
      });

      const error = new Error("Failed to create signed URL");
      mockCreateError.mockImplementation(() => {
        throw error;
      });

      await expect(handler(mockEvent)).rejects.toThrow("Failed to create signed URL");
      expect(mockCreateError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
          statusMessage: "Failed to create signed URL",
        }),
      );
    });

    it("should handle null signedUrl", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123", mode: "signed" });

      const mockAIPhoto = {
        id: "photo-123",
        style: Style.Anime,
        generatedUrl: "path/to/photo.jpg",
        photoSession: {
          id: "session-456",
          eventId: "event-789",
        },
      };

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: null },
        error: null,
      });

      const error = new Error("Failed to create signed URL");
      mockCreateError.mockImplementation(() => {
        throw error;
      });

      await expect(handler(mockEvent)).rejects.toThrow("Failed to create signed URL");
    });

    it("should use default error message when error has no message", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123", mode: "signed" });

      const mockAIPhoto = {
        id: "photo-123",
        style: Style.Anime,
        generatedUrl: "path/to/photo.jpg",
        photoSession: {
          id: "session-456",
          eventId: "event-789",
        },
      };

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockCreateSignedUrl.mockResolvedValue({
        data: null,
        error: {} as { message: string },
      });

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.data.error.message).toBe("Failed to create signed URL");
        throw new Error("Failed to create signed URL");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should handle error with data but invalid signedUrl", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123", mode: "signed" });

      const mockAIPhoto = {
        id: "photo-123",
        style: Style.Anime,
        generatedUrl: "path/to/photo.jpg",
        photoSession: {
          id: "session-456",
          eventId: "event-789",
        },
      };

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: "" },
        error: { message: "Partial error" },
      });

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.data.error.message).toBe("Partial error");
        throw new Error("Failed to create signed URL");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should handle undefined data in createSignedUrl response", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123", mode: "signed" });

      const mockAIPhoto = {
        id: "photo-123",
        style: Style.Anime,
        generatedUrl: "path/to/photo.jpg",
        photoSession: {
          id: "session-456",
          eventId: "event-789",
        },
      };

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockCreateSignedUrl.mockResolvedValue({
        data: undefined as unknown as { signedUrl: string } | null,
        error: null,
      });

      const error = new Error("Failed to create signed URL");
      mockCreateError.mockImplementation(() => {
        throw error;
      });

      await expect(handler(mockEvent)).rejects.toThrow("Failed to create signed URL");
    });
  });

  describe("Blob Mode (Default)", () => {
    it("should download and return image blob", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123" });

      const mockAIPhoto = {
        id: "photo-123",
        style: Style.Anime,
        generatedUrl: "path/to/photo.jpg",
        photoSession: {
          id: "session-456",
          eventId: "event-789",
        },
      };

      const mockBlob = createMockBlob("test image data");

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockDownload.mockResolvedValue({
        data: mockBlob,
        error: null,
      });

      const result = await handler(mockEvent);

      expect(mockDownload).toHaveBeenCalledWith("path/to/photo.jpg");
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it("should set correct headers for blob response", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123" });

      const mockAIPhoto = {
        id: "photo-123",
        style: Style.Anime,
        generatedUrl: "path/to/photo.jpg",
        photoSession: {
          id: "session-456",
          eventId: "event-789",
        },
      };

      const mockBlob = createMockBlob("test image data");

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockDownload.mockResolvedValue({
        data: mockBlob,
        error: null,
      });

      await handler(mockEvent);

      expect(mockSetHeader).toHaveBeenCalledWith(mockEvent, "Content-Type", "image/jpeg");
      expect(mockSetHeader).toHaveBeenCalledWith(
        mockEvent,
        "Content-Disposition",
        'inline; filename="anime.jpg"',
      );
      expect(mockSetHeader).toHaveBeenCalledWith(
        mockEvent,
        "Cache-Control",
        "public, max-age=3600",
      );
    });

    it("should set Content-Length header with buffer length", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123" });

      const mockAIPhoto = {
        id: "photo-123",
        style: Style.Watercolor,
        generatedUrl: "path/to/photo.jpg",
        photoSession: {
          id: "session-456",
          eventId: "event-789",
        },
      };

      const mockBlob = createMockBlob("specific content with length");

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockDownload.mockResolvedValue({
        data: mockBlob,
        error: null,
      });

      await handler(mockEvent);

      expect(mockSetHeader).toHaveBeenCalledWith(mockEvent, "Content-Length", expect.any(Number));
    });

    it("should set filename based on style lowercase", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);

      const styles = [
        { style: Style.Anime, filename: "anime.jpg" },
        { style: Style.Watercolor, filename: "watercolor.jpg" },
        { style: Style.Oil, filename: "oil.jpg" },
        { style: Style.Disney, filename: "disney.jpg" },
      ];

      for (const { style, filename } of styles) {
        mockGetQuery.mockReturnValue({ aiPhotoId: `photo-${style}` });

        const mockAIPhoto = {
          id: `photo-${style}`,
          style,
          generatedUrl: "path/to/photo.jpg",
          photoSession: {
            id: "session-456",
            eventId: "event-789",
          },
        };

        mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
        mockDownload.mockResolvedValue({
          data: createMockBlob(),
          error: null,
        });

        await handler(mockEvent);

        expect(mockSetHeader).toHaveBeenCalledWith(
          mockEvent,
          "Content-Disposition",
          `inline; filename="${filename}"`,
        );
      }
    });

    it("should handle download errors", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123" });

      const mockAIPhoto = {
        id: "photo-123",
        style: Style.Anime,
        generatedUrl: "path/to/photo.jpg",
        photoSession: {
          id: "session-456",
          eventId: "event-789",
        },
      };

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockDownload.mockResolvedValue({
        data: null,
        error: { message: "Download failed" },
      });

      const error = new Error("AI Photo file not found");
      mockCreateError.mockImplementation(() => {
        throw error;
      });

      await expect(handler(mockEvent)).rejects.toThrow("AI Photo file not found");
      expect(consoleErrorSpy).toHaveBeenCalledWith("AI Photo download error:", {
        message: "Download failed",
      });
    });

    it("should handle null data in download", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123" });

      const mockAIPhoto = {
        id: "photo-123",
        style: Style.Anime,
        generatedUrl: "path/to/photo.jpg",
        photoSession: {
          id: "session-456",
          eventId: "event-789",
        },
      };

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockDownload.mockResolvedValue({
        data: null,
        error: null,
      });

      const error = new Error("AI Photo file not found");
      mockCreateError.mockImplementation(() => {
        throw error;
      });

      await expect(handler(mockEvent)).rejects.toThrow("AI Photo file not found");
    });

    it("should convert Blob to Buffer", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123" });

      const mockAIPhoto = {
        id: "photo-123",
        style: Style.Oil,
        generatedUrl: "path/to/photo.jpg",
        photoSession: {
          id: "session-456",
          eventId: "event-789",
        },
      };

      const binaryData = "binary image data content";
      const mockBlob = createMockBlob(binaryData);

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockDownload.mockResolvedValue({
        data: mockBlob,
        error: null,
      });

      const result = await handler(mockEvent);

      expect(Buffer.isBuffer(result)).toBe(true);
      expect((result as Buffer).toString()).toBe(binaryData);
    });
  });

  describe("Error Handling", () => {
    it("should handle getAIPhotoById database errors", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123" });
      mockGetAIPhotoById.mockRejectedValue(new Error("Database connection failed") as never);

      await expect(handler(mockEvent)).rejects.toThrow("Database connection failed");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error fetching AI photo file:",
        expect.any(Error),
      );
    });

    it("should propagate errors from requireAuth", async () => {
      const authError = new Error("Invalid token");
      mockRequireAuth.mockRejectedValue(authError as never);

      await expect(handler(mockEvent)).rejects.toThrow("Invalid token");
    });

    it("should log errors to console", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123" });
      mockGetAIPhotoById.mockRejectedValue(new Error("DB Error") as never);

      try {
        await handler(mockEvent);
      } catch {
        // Expected
      }

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe("Different Scenarios", () => {
    it("should handle Anime style photo blob", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "anime-photo" });

      const mockAIPhoto = {
        id: "anime-photo",
        style: Style.Anime,
        generatedUrl: "path/to/anime.jpg",
        photoSession: {
          id: "session-1",
          eventId: "event-1",
        },
      };

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockDownload.mockResolvedValue({
        data: createMockBlob(),
        error: null,
      });

      await handler(mockEvent);

      expect(mockSetHeader).toHaveBeenCalledWith(
        mockEvent,
        "Content-Disposition",
        'inline; filename="anime.jpg"',
      );
    });

    it("should handle Watercolor style photo blob", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "watercolor-photo" });

      const mockAIPhoto = {
        id: "watercolor-photo",
        style: Style.Watercolor,
        generatedUrl: "path/to/watercolor.jpg",
        photoSession: {
          id: "session-2",
          eventId: "event-2",
        },
      };

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockDownload.mockResolvedValue({
        data: createMockBlob(),
        error: null,
      });

      await handler(mockEvent);

      expect(mockSetHeader).toHaveBeenCalledWith(
        mockEvent,
        "Content-Disposition",
        'inline; filename="watercolor.jpg"',
      );
    });

    it("should handle Oil style photo blob", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "oil-photo" });

      const mockAIPhoto = {
        id: "oil-photo",
        style: Style.Oil,
        generatedUrl: "path/to/oil.jpg",
        photoSession: {
          id: "session-3",
          eventId: "event-3",
        },
      };

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockDownload.mockResolvedValue({
        data: createMockBlob(),
        error: null,
      });

      await handler(mockEvent);

      expect(mockSetHeader).toHaveBeenCalledWith(
        mockEvent,
        "Content-Disposition",
        'inline; filename="oil.jpg"',
      );
    });

    it("should handle Disney style photo blob", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "disney-photo" });

      const mockAIPhoto = {
        id: "disney-photo",
        style: Style.Disney,
        generatedUrl: "path/to/disney.jpg",
        photoSession: {
          id: "session-4",
          eventId: "event-4",
        },
      };

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockDownload.mockResolvedValue({
        data: createMockBlob(),
        error: null,
      });

      await handler(mockEvent);

      expect(mockSetHeader).toHaveBeenCalledWith(
        mockEvent,
        "Content-Disposition",
        'inline; filename="disney.jpg"',
      );
    });

    it("should handle mode=blob explicitly", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123", mode: "blob" });

      const mockAIPhoto = {
        id: "photo-123",
        style: Style.Anime,
        generatedUrl: "path/to/photo.jpg",
        photoSession: {
          id: "session-456",
          eventId: "event-789",
        },
      };

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockDownload.mockResolvedValue({
        data: createMockBlob(),
        error: null,
      });

      const result = await handler(mockEvent);

      expect(mockDownload).toHaveBeenCalled();
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it("should handle different storage paths", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);

      const paths = ["user123/event456/photo.jpg", "path/to/nested/photo.jpg", "simple-photo.jpg"];

      for (const path of paths) {
        mockGetQuery.mockReturnValue({ aiPhotoId: `photo-${path}` });

        const mockAIPhoto = {
          id: `photo-${path}`,
          style: Style.Anime,
          generatedUrl: path,
          photoSession: {
            id: "session-456",
            eventId: "event-789",
          },
        };

        mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
        mockDownload.mockResolvedValue({
          data: createMockBlob(),
          error: null,
        });

        await handler(mockEvent);

        expect(mockDownload).toHaveBeenCalledWith(path);
      }
    });
  });
});
