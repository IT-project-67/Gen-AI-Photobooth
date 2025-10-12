import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { Style } from "@prisma/client";
import {
  mockCreateAdminClient,
  mockCreateError,
  mockDefineEventHandler,
  mockGetAIPhotoById,
  mockGetQuery,
  mockGetStorageBucket,
  mockRequireAuth,
  mockSetHeader,
} from "~/tests/server/mocks/mocks";
import { ERROR_STATUS_MAP } from "~/server/types/core";

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

type SuccessResponse = {
  success: boolean;
  message: string;
  data: {
    id: string;
    style: string;
    storageUrl: string;
    sessionId: string;
    eventId: string;
    createdAt: string;
    updatedAt: string;
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

describe("API: GET /api/v1/aiphoto/get-aiphoto-by-id", () => {
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

    const module = await import("~/server/api/v1/aiphoto/get-aiphoto-by-id.get");
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

    it("should pass user data to getAIPhotoById", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123" });

      const mockAIPhoto = {
        id: "photo-123",
        style: Style.Anime,
        generatedUrl: "http://example.com/photo.png",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
        photoSession: {
          id: "session-456",
          eventId: "event-789",
        },
      };

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      await handler(mockEvent);

      expect(mockGetAIPhotoById).toHaveBeenCalledWith("photo-123", "user-123");
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
        expect(opts.data).toBeDefined();
        expect(opts.data.error).toBeDefined();
        expect(opts.data.error.type).toBe("VALIDATION_ERROR");
        expect(opts.data.error.code).toBe("MISSING_AI_PHOTO_ID");
        throw new Error("AI Photo ID is required");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });
  });

  describe("AI Photo Retrieval", () => {
    it("should return AI photo data if found", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123" });

      const mockAIPhoto = {
        id: "photo-123",
        style: Style.Anime,
        generatedUrl: "http://example.com/photo.png",
        createdAt: new Date("2023-01-01T00:00:00Z"),
        updatedAt: new Date("2023-01-02T00:00:00Z"),
        photoSession: {
          id: "session-456",
          eventId: "event-789",
        },
      };

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      const result = (await handler(mockEvent)) as SuccessResponse;
      expect(mockGetAIPhotoById).toHaveBeenCalledWith("photo-123", "user-123");

      expect(result).toEqual({
        success: true,
        message: "AI photo retrieved successfully",
        data: {
          id: "photo-123",
          style: Style.Anime,
          storageUrl: "http://example.com/photo.png",
          sessionId: "session-456",
          eventId: "event-789",
          createdAt: "2023-01-01T00:00:00.000Z",
          updatedAt: "2023-01-02T00:00:00.000Z",
        },
      });
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

    it("should include error data for not found", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "nonexistent" });
      mockGetAIPhotoById.mockResolvedValue(null as never);

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.data).toBeDefined();
        expect(opts.data.error).toBeDefined();
        expect(opts.data.error.type).toBe("NOT_FOUND");
        expect(opts.data.error.code).toBe("AI_PHOTO_NOT_FOUND");
        expect(opts.data.error.message).toBe("AI Photo not found or access denied");
        throw new Error("AI Photo not found");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should return null when user has no access", async () => {
      mockRequireAuth.mockResolvedValue({ id: "wrong-user" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123" });
      mockGetAIPhotoById.mockResolvedValue(null as never);

      const error = new Error("AI Photo not found");
      mockCreateError.mockImplementation(() => {
        throw error;
      });

      await expect(handler(mockEvent)).rejects.toThrow("AI Photo not found");
      expect(mockGetAIPhotoById).toHaveBeenCalledWith("photo-123", "wrong-user");
    });
  });

  describe("Data Transformation", () => {
    it("should transform generatedUrl to storageUrl", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123" });

      const mockAIPhoto = {
        id: "photo-123",
        style: Style.Anime,
        generatedUrl: "http://storage.example.com/generated.jpg",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
        photoSession: {
          id: "session-456",
          eventId: "event-789",
        },
      };

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result).toMatchObject({
        data: {
          storageUrl: "http://storage.example.com/generated.jpg",
        },
      });
      expect(result).not.toHaveProperty("data.generatedUrl");
    });

    it("should convert dates to ISO string format", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123" });

      const createdAt = new Date("2023-06-15T10:30:00Z");
      const updatedAt = new Date("2023-06-20T15:45:00Z");

      const mockAIPhoto = {
        id: "photo-123",
        style: Style.Watercolor,
        generatedUrl: "http://example.com/photo.png",
        createdAt,
        updatedAt,
        photoSession: {
          id: "session-456",
          eventId: "event-789",
        },
      };

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result).toMatchObject({
        data: {
          createdAt: "2023-06-15T10:30:00.000Z",
          updatedAt: "2023-06-20T15:45:00.000Z",
        },
      });
      expect(typeof result.data.createdAt).toBe("string");
      expect(typeof result.data.updatedAt).toBe("string");
    });

    it("should handle all Style types", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);

      const styles = [Style.Anime, Style.Watercolor, Style.Oil, Style.Disney];

      for (const style of styles) {
        mockGetQuery.mockReturnValue({ aiPhotoId: `photo-${style}` });

        const mockAIPhoto = {
          id: `photo-${style}`,
          style,
          generatedUrl: `http://example.com/${style}.jpg`,
          createdAt: new Date("2023-01-01"),
          updatedAt: new Date("2023-01-01"),
          photoSession: {
            id: "session-456",
            eventId: "event-789",
          },
        };

        mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
        const result = (await handler(mockEvent)) as SuccessResponse;

        expect(result).toMatchObject({
          data: {
            style,
          },
        });
      }
    });

    it("should extract sessionId from photoSession", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123" });

      const mockAIPhoto = {
        id: "photo-123",
        style: Style.Oil,
        generatedUrl: "http://example.com/photo.png",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
        photoSession: {
          id: "specific-session-id",
          eventId: "event-789",
        },
      };

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result).toMatchObject({
        data: {
          sessionId: "specific-session-id",
        },
      });
    });

    it("should extract eventId from photoSession", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123" });

      const mockAIPhoto = {
        id: "photo-123",
        style: Style.Disney,
        generatedUrl: "http://example.com/photo.png",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
        photoSession: {
          id: "session-456",
          eventId: "specific-event-id",
        },
      };

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result).toMatchObject({
        data: {
          eventId: "specific-event-id",
        },
      });
    });
  });

  describe("Response Structure", () => {
    it("should return success response with correct structure", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123" });

      const mockAIPhoto = {
        id: "photo-123",
        style: Style.Anime,
        generatedUrl: "http://example.com/photo.png",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
        photoSession: {
          id: "session-456",
          eventId: "event-789",
        },
      };

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("message", "AI photo retrieved successfully");
      expect(result).toHaveProperty("data");
    });

    it("should include all required fields in response data", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123" });

      const mockAIPhoto = {
        id: "photo-123",
        style: Style.Watercolor,
        generatedUrl: "http://example.com/photo.png",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
        photoSession: {
          id: "session-456",
          eventId: "event-789",
        },
      };

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data).toHaveProperty("id");
      expect(result.data).toHaveProperty("style");
      expect(result.data).toHaveProperty("storageUrl");
      expect(result.data).toHaveProperty("sessionId");
      expect(result.data).toHaveProperty("eventId");
      expect(result.data).toHaveProperty("createdAt");
      expect(result.data).toHaveProperty("updatedAt");
    });

    it("should have correct field types in response", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123" });

      const mockAIPhoto = {
        id: "photo-123",
        style: Style.Oil,
        generatedUrl: "http://example.com/photo.png",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
        photoSession: {
          id: "session-456",
          eventId: "event-789",
        },
      };

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(typeof result.data.id).toBe("string");
      expect(typeof result.data.style).toBe("string");
      expect(typeof result.data.storageUrl).toBe("string");
      expect(typeof result.data.sessionId).toBe("string");
      expect(typeof result.data.eventId).toBe("string");
      expect(typeof result.data.createdAt).toBe("string");
      expect(typeof result.data.updatedAt).toBe("string");
    });
  });

  describe("Error Handling", () => {
    it("should handle getAIPhotoById database errors", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123" });
      mockGetAIPhotoById.mockRejectedValue(new Error("Database connection failed") as never);

      await expect(handler(mockEvent)).rejects.toThrow("Database connection failed");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error fetching AI photo by ID:",
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
    it("should handle Anime style photo", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "anime-photo" });

      const mockAIPhoto = {
        id: "anime-photo",
        style: Style.Anime,
        generatedUrl: "http://example.com/anime.jpg",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
        photoSession: {
          id: "session-1",
          eventId: "event-1",
        },
      };

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.style).toBe(Style.Anime);
    });

    it("should handle Watercolor style photo", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "watercolor-photo" });

      const mockAIPhoto = {
        id: "watercolor-photo",
        style: Style.Watercolor,
        generatedUrl: "http://example.com/watercolor.jpg",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
        photoSession: {
          id: "session-2",
          eventId: "event-2",
        },
      };

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.style).toBe(Style.Watercolor);
    });

    it("should handle Oil style photo", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "oil-photo" });

      const mockAIPhoto = {
        id: "oil-photo",
        style: Style.Oil,
        generatedUrl: "http://example.com/oil.jpg",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
        photoSession: {
          id: "session-3",
          eventId: "event-3",
        },
      };

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.style).toBe(Style.Oil);
    });

    it("should handle Disney style photo", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ aiPhotoId: "disney-photo" });

      const mockAIPhoto = {
        id: "disney-photo",
        style: Style.Disney,
        generatedUrl: "http://example.com/disney.jpg",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
        photoSession: {
          id: "session-4",
          eventId: "event-4",
        },
      };

      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.style).toBe(Style.Disney);
    });

    it("should handle different aiPhotoId formats", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);

      const photoIds = ["photo-abc", "photo-123", "uuid-xyz-789", "cuid-abc123"];

      for (const photoId of photoIds) {
        mockGetQuery.mockReturnValue({ aiPhotoId: photoId });

        const mockAIPhoto = {
          id: photoId,
          style: Style.Anime,
          generatedUrl: "http://example.com/photo.png",
          createdAt: new Date("2023-01-01"),
          updatedAt: new Date("2023-01-01"),
          photoSession: {
            id: "session-456",
            eventId: "event-789",
          },
        };

        mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
        const result = (await handler(mockEvent)) as SuccessResponse;

        expect(result.data.id).toBe(photoId);
      }
    });

    it("should handle different URL formats in storageUrl", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);

      const urls = [
        "https://storage.supabase.co/bucket/photo.jpg",
        "https://cdn.example.com/images/photo.webp",
        "/local/path/to/photo.png",
        "user123/event456/Photos/session789/photo.jpg",
      ];

      for (const url of urls) {
        mockGetQuery.mockReturnValue({ aiPhotoId: "photo-123" });

        const mockAIPhoto = {
          id: "photo-123",
          style: Style.Anime,
          generatedUrl: url,
          createdAt: new Date("2023-01-01"),
          updatedAt: new Date("2023-01-01"),
          photoSession: {
            id: "session-456",
            eventId: "event-789",
          },
        };

        mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
        const result = (await handler(mockEvent)) as SuccessResponse;

        expect(result.data.storageUrl).toBe(url);
      }
    });
  });
});
