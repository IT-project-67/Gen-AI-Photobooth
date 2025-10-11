import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { Style } from "@prisma/client";
import {
  mockCreateError,
  mockDefineEventHandler,
  mockGetQuery,
  mockRequireAuth,
  mockSetHeader,
} from "~/tests/server/mocks/mocks";
import { ERROR_STATUS_MAP } from "~/server/types/core";

const mockGetAIPhotosBySession = jest.fn();
const mockGetPhotoSessionById = jest.fn();

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
  getAIPhotosBySession: mockGetAIPhotosBySession,
  getPhotoSessionById: mockGetPhotoSessionById,
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
    sessionId: string;
    eventId: string;
    photos: Array<{
      id: string;
      style: string;
      storageUrl: string;
      createdAt: string;
      updatedAt: string;
    }>;
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

describe("API: GET /api/v1/aiphoto/get-aiphotos-by-session", () => {
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

    const module = await import("~/server/api/v1/aiphoto/get-aiphotos-by-session.get");
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

    it("should pass user data to getPhotoSessionById", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ sessionId: "session-123" });

      const mockSession = {
        id: "session-123",
        eventId: "event-456",
      };

      mockGetPhotoSessionById.mockResolvedValue(mockSession as never);
      mockGetAIPhotosBySession.mockResolvedValue([] as never);

      await handler(mockEvent);

      expect(mockGetPhotoSessionById).toHaveBeenCalledWith("session-123", "user-123");
    });
  });

  describe("Validation", () => {
    it("should require sessionId parameter", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({});

      const error = new Error("Session ID is required");
      mockCreateError.mockImplementation(() => {
        throw error;
      });

      await expect(handler(mockEvent)).rejects.toThrow("Session ID is required");

      expect(mockCreateError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
          statusMessage: "Session ID is required",
        }),
      );
    });

    it("should reject undefined sessionId", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ sessionId: undefined });

      const error = new Error("Session ID is required");
      mockCreateError.mockImplementation(() => {
        throw error;
      });

      await expect(handler(mockEvent)).rejects.toThrow("Session ID is required");
    });

    it("should reject empty string sessionId", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ sessionId: "" });

      const error = new Error("Session ID is required");
      mockCreateError.mockImplementation(() => {
        throw error;
      });

      await expect(handler(mockEvent)).rejects.toThrow("Session ID is required");
    });

    it("should include error data for missing sessionId", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({});

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.data).toBeDefined();
        expect(opts.data.error).toBeDefined();
        expect(opts.data.error.type).toBe("VALIDATION_ERROR");
        expect(opts.data.error.code).toBe("MISSING_SESSION_ID");
        throw new Error("Session ID is required");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });
  });

  describe("Session Verification", () => {
    it("should check if session exists", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ sessionId: "session-123" });

      const mockSession = {
        id: "session-123",
        eventId: "event-456",
      };

      mockGetPhotoSessionById.mockResolvedValue(mockSession as never);
      mockGetAIPhotosBySession.mockResolvedValue([] as never);

      await handler(mockEvent);

      expect(mockGetPhotoSessionById).toHaveBeenCalledWith("session-123", "user-123");
    });

    it("should return 404 if session not found", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ sessionId: "nonexistent" });
      mockGetPhotoSessionById.mockResolvedValue(null as never);

      const error = new Error("Session not found");
      mockCreateError.mockImplementation(() => {
        throw error;
      });

      await expect(handler(mockEvent)).rejects.toThrow("Session not found");
      expect(mockCreateError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: ERROR_STATUS_MAP.NOT_FOUND,
          statusMessage: "Session not found",
        }),
      );
    });

    it("should include error data for session not found", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ sessionId: "nonexistent" });
      mockGetPhotoSessionById.mockResolvedValue(null as never);

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.data).toBeDefined();
        expect(opts.data.error).toBeDefined();
        expect(opts.data.error.type).toBe("NOT_FOUND");
        expect(opts.data.error.code).toBe("SESSION_NOT_FOUND");
        expect(opts.data.error.message).toBe("Session not found or access denied");
        throw new Error("Session not found");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should return null when user has no access to session", async () => {
      mockRequireAuth.mockResolvedValue({ id: "wrong-user" } as never);
      mockGetQuery.mockReturnValue({ sessionId: "session-123" });
      mockGetPhotoSessionById.mockResolvedValue(null as never);

      const error = new Error("Session not found");
      mockCreateError.mockImplementation(() => {
        throw error;
      });

      await expect(handler(mockEvent)).rejects.toThrow("Session not found");
      expect(mockGetPhotoSessionById).toHaveBeenCalledWith("session-123", "wrong-user");
    });
  });

  describe("AI Photos Retrieval", () => {
    it("should return AI photos for session", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ sessionId: "session-123" });

      const mockSession = {
        id: "session-123",
        eventId: "event-456",
      };

      const mockAIPhotos = [
        {
          id: "photo1",
          style: Style.Anime,
          generatedUrl: "http://example.com/photo1.png",
          createdAt: new Date("2023-01-01T00:00:00Z"),
          updatedAt: new Date("2023-01-02T00:00:00Z"),
        },
        {
          id: "photo2",
          style: Style.Watercolor,
          generatedUrl: "http://example.com/photo2.png",
          createdAt: new Date("2023-01-03T00:00:00Z"),
          updatedAt: new Date("2023-01-04T00:00:00Z"),
        },
      ];

      mockGetPhotoSessionById.mockResolvedValue(mockSession as never);
      mockGetAIPhotosBySession.mockResolvedValue(mockAIPhotos as never);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(mockGetAIPhotosBySession).toHaveBeenCalledWith("session-123", "user-123");

      expect(result).toEqual({
        success: true,
        message: "AI photos retrieved successfully",
        data: {
          sessionId: "session-123",
          eventId: "event-456",
          photos: [
            {
              id: "photo1",
              style: Style.Anime,
              storageUrl: "http://example.com/photo1.png",
              createdAt: "2023-01-01T00:00:00.000Z",
              updatedAt: "2023-01-02T00:00:00.000Z",
            },
            {
              id: "photo2",
              style: Style.Watercolor,
              storageUrl: "http://example.com/photo2.png",
              createdAt: "2023-01-03T00:00:00.000Z",
              updatedAt: "2023-01-04T00:00:00.000Z",
            },
          ],
        },
      });
    });

    it("should return empty photos array when no AI photos found", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ sessionId: "session-123" });

      const mockSession = {
        id: "session-123",
        eventId: "event-456",
      };

      mockGetPhotoSessionById.mockResolvedValue(mockSession as never);
      mockGetAIPhotosBySession.mockResolvedValue([] as never);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result).toMatchObject({
        data: {
          sessionId: "session-123",
          eventId: "event-456",
          photos: [],
        },
      });
      expect(result.data.photos).toHaveLength(0);
    });

    it("should return all 4 styles in sorted order", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ sessionId: "session-123" });

      const mockSession = {
        id: "session-123",
        eventId: "event-456",
      };

      const mockAIPhotos = [
        {
          id: "photo1",
          style: Style.Anime,
          generatedUrl: "http://example.com/anime.png",
          createdAt: new Date("2023-01-01"),
          updatedAt: new Date("2023-01-01"),
        },
        {
          id: "photo2",
          style: Style.Watercolor,
          generatedUrl: "http://example.com/watercolor.png",
          createdAt: new Date("2023-01-01"),
          updatedAt: new Date("2023-01-01"),
        },
        {
          id: "photo3",
          style: Style.Oil,
          generatedUrl: "http://example.com/oil.png",
          createdAt: new Date("2023-01-01"),
          updatedAt: new Date("2023-01-01"),
        },
        {
          id: "photo4",
          style: Style.Disney,
          generatedUrl: "http://example.com/disney.png",
          createdAt: new Date("2023-01-01"),
          updatedAt: new Date("2023-01-01"),
        },
      ];

      mockGetPhotoSessionById.mockResolvedValue(mockSession as never);
      mockGetAIPhotosBySession.mockResolvedValue(mockAIPhotos as never);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.photos).toHaveLength(4);
      expect(result.data.photos[0].style).toBe(Style.Anime);
      expect(result.data.photos[1].style).toBe(Style.Watercolor);
      expect(result.data.photos[2].style).toBe(Style.Oil);
      expect(result.data.photos[3].style).toBe(Style.Disney);
    });
  });

  describe("Data Transformation", () => {
    it("should transform generatedUrl to storageUrl in photos array", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ sessionId: "session-123" });

      const mockSession = {
        id: "session-123",
        eventId: "event-456",
      };

      const mockAIPhotos = [
        {
          id: "photo1",
          style: Style.Anime,
          generatedUrl: "http://storage.example.com/generated1.jpg",
          createdAt: new Date("2023-01-01"),
          updatedAt: new Date("2023-01-01"),
        },
      ];

      mockGetPhotoSessionById.mockResolvedValue(mockSession as never);
      mockGetAIPhotosBySession.mockResolvedValue(mockAIPhotos as never);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.photos[0]).toHaveProperty("storageUrl");
      expect(result.data.photos[0]).not.toHaveProperty("generatedUrl");
      expect(result.data.photos[0].storageUrl).toBe("http://storage.example.com/generated1.jpg");
    });

    it("should convert dates to ISO string format in photos array", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ sessionId: "session-123" });

      const mockSession = {
        id: "session-123",
        eventId: "event-456",
      };

      const createdAt = new Date("2023-06-15T10:30:00Z");
      const updatedAt = new Date("2023-06-20T15:45:00Z");

      const mockAIPhotos = [
        {
          id: "photo1",
          style: Style.Anime,
          generatedUrl: "http://example.com/photo.png",
          createdAt,
          updatedAt,
        },
      ];

      mockGetPhotoSessionById.mockResolvedValue(mockSession as never);
      mockGetAIPhotosBySession.mockResolvedValue(mockAIPhotos as never);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.photos[0].createdAt).toBe("2023-06-15T10:30:00.000Z");
      expect(result.data.photos[0].updatedAt).toBe("2023-06-20T15:45:00.000Z");
      expect(typeof result.data.photos[0].createdAt).toBe("string");
      expect(typeof result.data.photos[0].updatedAt).toBe("string");
    });

    it("should extract sessionId and eventId from photoSession", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ sessionId: "session-xyz" });

      const mockSession = {
        id: "session-xyz",
        eventId: "event-abc",
      };

      mockGetPhotoSessionById.mockResolvedValue(mockSession as never);
      mockGetAIPhotosBySession.mockResolvedValue([] as never);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.sessionId).toBe("session-xyz");
      expect(result.data.eventId).toBe("event-abc");
    });
  });

  describe("Response Structure", () => {
    it("should return success response with correct structure", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ sessionId: "session-123" });

      const mockSession = {
        id: "session-123",
        eventId: "event-456",
      };

      mockGetPhotoSessionById.mockResolvedValue(mockSession as never);
      mockGetAIPhotosBySession.mockResolvedValue([] as never);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("message", "AI photos retrieved successfully");
      expect(result).toHaveProperty("data");
    });

    it("should include sessionId, eventId and photos in response data", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ sessionId: "session-123" });

      const mockSession = {
        id: "session-123",
        eventId: "event-456",
      };

      mockGetPhotoSessionById.mockResolvedValue(mockSession as never);
      mockGetAIPhotosBySession.mockResolvedValue([] as never);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data).toHaveProperty("sessionId");
      expect(result.data).toHaveProperty("eventId");
      expect(result.data).toHaveProperty("photos");
      expect(Array.isArray(result.data.photos)).toBe(true);
    });

    it("should include all required fields in each photo object", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ sessionId: "session-123" });

      const mockSession = {
        id: "session-123",
        eventId: "event-456",
      };

      const mockAIPhotos = [
        {
          id: "photo1",
          style: Style.Anime,
          generatedUrl: "http://example.com/photo.png",
          createdAt: new Date("2023-01-01"),
          updatedAt: new Date("2023-01-01"),
        },
      ];

      mockGetPhotoSessionById.mockResolvedValue(mockSession as never);
      mockGetAIPhotosBySession.mockResolvedValue(mockAIPhotos as never);

      const result = (await handler(mockEvent)) as SuccessResponse;

      const photo = result.data.photos[0];
      expect(photo).toHaveProperty("id");
      expect(photo).toHaveProperty("style");
      expect(photo).toHaveProperty("storageUrl");
      expect(photo).toHaveProperty("createdAt");
      expect(photo).toHaveProperty("updatedAt");
    });

    it("should have correct field types in photo objects", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ sessionId: "session-123" });

      const mockSession = {
        id: "session-123",
        eventId: "event-456",
      };

      const mockAIPhotos = [
        {
          id: "photo1",
          style: Style.Oil,
          generatedUrl: "http://example.com/photo.png",
          createdAt: new Date("2023-01-01"),
          updatedAt: new Date("2023-01-01"),
        },
      ];

      mockGetPhotoSessionById.mockResolvedValue(mockSession as never);
      mockGetAIPhotosBySession.mockResolvedValue(mockAIPhotos as never);

      const result = (await handler(mockEvent)) as SuccessResponse;

      const photo = result.data.photos[0];
      expect(typeof photo.id).toBe("string");
      expect(typeof photo.style).toBe("string");
      expect(typeof photo.storageUrl).toBe("string");
      expect(typeof photo.createdAt).toBe("string");
      expect(typeof photo.updatedAt).toBe("string");
    });
  });

  describe("Error Handling", () => {
    it("should handle getPhotoSessionById database errors", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ sessionId: "session-123" });
      mockGetPhotoSessionById.mockRejectedValue(new Error("Database connection failed") as never);

      await expect(handler(mockEvent)).rejects.toThrow("Database connection failed");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error fetching AI photos by session:",
        expect.any(Error),
      );
    });

    it("should handle getAIPhotosBySession database errors", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ sessionId: "session-123" });

      const mockSession = {
        id: "session-123",
        eventId: "event-456",
      };

      mockGetPhotoSessionById.mockResolvedValue(mockSession as never);
      mockGetAIPhotosBySession.mockRejectedValue(new Error("DB Error") as never);

      await expect(handler(mockEvent)).rejects.toThrow("DB Error");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error fetching AI photos by session:",
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
      mockGetQuery.mockReturnValue({ sessionId: "session-123" });
      mockGetPhotoSessionById.mockRejectedValue(new Error("DB Error") as never);

      try {
        await handler(mockEvent);
      } catch {
        // Expected
      }

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe("Different Scenarios", () => {
    it("should handle single photo in session", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ sessionId: "session-123" });

      const mockSession = {
        id: "session-123",
        eventId: "event-456",
      };

      const mockAIPhotos = [
        {
          id: "photo1",
          style: Style.Anime,
          generatedUrl: "http://example.com/photo.png",
          createdAt: new Date("2023-01-01"),
          updatedAt: new Date("2023-01-01"),
        },
      ];

      mockGetPhotoSessionById.mockResolvedValue(mockSession as never);
      mockGetAIPhotosBySession.mockResolvedValue(mockAIPhotos as never);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.photos).toHaveLength(1);
      expect(result.data.photos[0].id).toBe("photo1");
    });

    it("should handle multiple photos with different styles", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ sessionId: "session-123" });

      const mockSession = {
        id: "session-123",
        eventId: "event-456",
      };

      const mockAIPhotos = [
        {
          id: "photo1",
          style: Style.Anime,
          generatedUrl: "http://example.com/anime.jpg",
          createdAt: new Date("2023-01-01"),
          updatedAt: new Date("2023-01-01"),
        },
        {
          id: "photo2",
          style: Style.Disney,
          generatedUrl: "http://example.com/disney.jpg",
          createdAt: new Date("2023-01-01"),
          updatedAt: new Date("2023-01-01"),
        },
      ];

      mockGetPhotoSessionById.mockResolvedValue(mockSession as never);
      mockGetAIPhotosBySession.mockResolvedValue(mockAIPhotos as never);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.photos).toHaveLength(2);
      const styles = result.data.photos.map((p) => p.style);
      expect(styles).toContain(Style.Anime);
      expect(styles).toContain(Style.Disney);
    });

    it("should handle different sessionId formats", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);

      const sessionIds = ["session-abc", "session-123", "uuid-xyz-789", "cuid-abc123"];

      for (const sessionId of sessionIds) {
        mockGetQuery.mockReturnValue({ sessionId });

        const mockSession = {
          id: sessionId,
          eventId: "event-456",
        };

        mockGetPhotoSessionById.mockResolvedValue(mockSession as never);
        mockGetAIPhotosBySession.mockResolvedValue([] as never);

        const result = (await handler(mockEvent)) as SuccessResponse;

        expect(result.data.sessionId).toBe(sessionId);
      }
    });

    it("should handle different URL formats in photos", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ sessionId: "session-123" });

      const mockSession = {
        id: "session-123",
        eventId: "event-456",
      };

      const urls = [
        "https://storage.supabase.co/bucket/photo1.jpg",
        "https://cdn.example.com/images/photo2.webp",
        "/local/path/to/photo3.png",
        "user123/event456/Photos/session789/photo4.jpg",
      ];

      const mockAIPhotos = urls.map((url, index) => ({
        id: `photo${index + 1}`,
        style: Style.Anime,
        generatedUrl: url,
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      }));

      mockGetPhotoSessionById.mockResolvedValue(mockSession as never);
      mockGetAIPhotosBySession.mockResolvedValue(mockAIPhotos as never);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.photos).toHaveLength(4);
      result.data.photos.forEach((photo, index) => {
        expect(photo.storageUrl).toBe(urls[index]);
      });
    });

    it("should handle photos with same style", async () => {
      mockRequireAuth.mockResolvedValue({ id: "user-123" } as never);
      mockGetQuery.mockReturnValue({ sessionId: "session-123" });

      const mockSession = {
        id: "session-123",
        eventId: "event-456",
      };

      const mockAIPhotos = [
        {
          id: "photo1",
          style: Style.Anime,
          generatedUrl: "http://example.com/anime1.jpg",
          createdAt: new Date("2023-01-01"),
          updatedAt: new Date("2023-01-01"),
        },
        {
          id: "photo2",
          style: Style.Anime,
          generatedUrl: "http://example.com/anime2.jpg",
          createdAt: new Date("2023-01-02"),
          updatedAt: new Date("2023-01-02"),
        },
      ];

      mockGetPhotoSessionById.mockResolvedValue(mockSession as never);
      mockGetAIPhotosBySession.mockResolvedValue(mockAIPhotos as never);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.photos).toHaveLength(2);
      expect(result.data.photos[0].style).toBe(Style.Anime);
      expect(result.data.photos[1].style).toBe(Style.Anime);
    });
  });
});
