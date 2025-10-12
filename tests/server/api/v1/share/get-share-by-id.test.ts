import { describe, it, expect, beforeAll, beforeEach, jest } from "@jest/globals";
import {
  mockCreateError,
  mockDefineEventHandler,
  mockGetQuery,
  mockRequireAuth,
  mockHandleApiError,
  mockCreateSuccessResponse,
  mockCreateErrorResponse,
  mockGetSharedPhotoById,
} from "~/tests/server/mocks/mocks";
import { ERROR_STATUS_MAP } from "~/server/types/core";

jest.mock("h3", () => ({
  defineEventHandler: mockDefineEventHandler,
  createError: mockCreateError,
  getQuery: mockGetQuery,
}));

jest.mock("~~/server/utils/auth", () => ({
  requireAuth: mockRequireAuth,
  handleApiError: mockHandleApiError,
}));

jest.mock("~~/server/utils/core", () => ({
  createSuccessResponse: mockCreateSuccessResponse,
  createErrorResponse: mockCreateErrorResponse,
}));

jest.mock("~~/server/model", () => ({
  getSharedPhotoById: mockGetSharedPhotoById,
}));

type MockEvent = {
  node: {
    req: Record<string, unknown>;
    res: Record<string, unknown>;
  };
};

type ErrorOptions = {
  statusCode: number;
  statusMessage: string;
  data: {
    error: {
      type?: string;
      code: string;
      message: string;
      statusCode: number;
    };
  };
};

describe("API: GET /api/v1/share/get-share-by-id", () => {
  let handler: (event: unknown) => Promise<unknown>;
  let mockEvent: MockEvent;

  beforeAll(async () => {
    const module = await import("~/server/api/v1/share/get-share-by-id.get");
    handler = module.default as (event: unknown) => Promise<unknown>;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockEvent = {
      node: {
        req: {},
        res: {},
      },
    };

    mockGetQuery.mockReturnValue({});

    mockHandleApiError.mockImplementation((error: unknown) => {
      if (error instanceof Error) {
        return {
          type: "ERROR",
          code: "ERROR",
          message: error.message,
          statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
        };
      }
      return {
        type: "ERROR",
        code: "ERROR",
        message: "Unknown error",
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      };
    });

    mockCreateSuccessResponse.mockImplementation((data, message) => ({
      success: true,
      data,
      message,
    }));

    mockCreateErrorResponse.mockImplementation((error) => ({
      success: false,
      error,
    }));

    mockCreateError.mockImplementation((options: ErrorOptions) => {
      const error = new Error(options.statusMessage) as Error & ErrorOptions;
      error.statusCode = options.statusCode;
      error.statusMessage = options.statusMessage;
      error.data = options.data;
      return error;
    });
  });

  describe("Authentication", () => {
    it("should call requireAuth", async () => {
      mockRequireAuth.mockRejectedValue(new Error("Unauthorized") as never);
      mockGetQuery.mockReturnValue({ shareId: "share-123" });

      await expect(handler(mockEvent)).rejects.toThrow();

      expect(mockRequireAuth).toHaveBeenCalledWith(mockEvent);
    });

    it("should reject unauthenticated requests", async () => {
      mockRequireAuth.mockRejectedValue(new Error("Unauthorized") as never);
      mockGetQuery.mockReturnValue({ shareId: "share-123" });

      mockHandleApiError.mockReturnValue({
        type: "AUTH_ERROR",
        code: "AUTH_ERROR",
        message: "Unauthorized",
        statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
      });

      await expect(handler(mockEvent)).rejects.toThrow("Unauthorized");
    });
  });

  describe("Query Parameter Validation", () => {
    const createMockUser = () => ({
      id: "user-123",
      email: "test@example.com",
    });

    it("should require shareId query parameter", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({});

      await expect(handler(mockEvent)).rejects.toThrow("Share ID is required");

      expect(mockCreateError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
          statusMessage: "Share ID is required",
        }),
      );
    });

    it("should reject empty shareId", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ shareId: "" });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should read query parameters", async () => {
      const mockUser = createMockUser();
      const mockSharedPhoto = {
        id: "share-123",
        eventId: "event-123",
        aiPhotoId: "photo-123",
        selectedUrl: "photos/selected.jpg",
        qrCodeUrl: "qr/code-123.png",
        qrExpiresAt: new Date("2024-12-31T23:59:59Z"),
        createdAt: new Date("2024-01-01T00:00:00Z"),
        event: {
          id: "event-123",
          name: "Test Event",
        },
        aiPhoto: {
          id: "photo-123",
          style: "REALISTIC",
          generatedUrl: "photos/ai-123.jpg",
        },
      };

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ shareId: "share-123" });
      mockGetSharedPhotoById.mockResolvedValue(mockSharedPhoto as never);

      await handler(mockEvent);

      expect(mockGetQuery).toHaveBeenCalledWith(mockEvent);
    });
  });

  describe("Share Verification", () => {
    const createMockUser = () => ({
      id: "user-123",
      email: "test@example.com",
    });

    it("should verify share exists", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ shareId: "share-123" });
      mockGetSharedPhotoById.mockResolvedValue(null as never);

      await expect(handler(mockEvent)).rejects.toThrow("Share not found");
    });

    it("should call getSharedPhotoById with correct parameters", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ shareId: "share-123" });
      mockGetSharedPhotoById.mockResolvedValue(null as never);

      await expect(handler(mockEvent)).rejects.toThrow();

      expect(mockGetSharedPhotoById).toHaveBeenCalledWith("share-123");
    });

    it("should use NOT_FOUND status code", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ shareId: "share-123" });
      mockGetSharedPhotoById.mockResolvedValue(null as never);

      mockHandleApiError.mockReturnValue({
        type: "NOT_FOUND",
        code: "SHARE_NOT_FOUND",
        message: "Share not found",
        statusCode: ERROR_STATUS_MAP.NOT_FOUND,
      });

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: ERROR_STATUS_MAP.NOT_FOUND,
      });
    });
  });

  describe("Share Retrieval", () => {
    const createMockUser = () => ({
      id: "user-123",
      email: "test@example.com",
    });

    const createMockSharedPhoto = () => ({
      id: "share-123",
      eventId: "event-123",
      aiPhotoId: "photo-123",
      selectedUrl: "photos/selected.jpg",
      qrCodeUrl: "qr/code-123.png",
      qrExpiresAt: new Date("2024-12-31T23:59:59Z"),
      createdAt: new Date("2024-01-01T00:00:00Z"),
      event: {
        id: "event-123",
        name: "Test Event",
      },
      aiPhoto: {
        id: "photo-123",
        style: "REALISTIC",
        generatedUrl: "photos/ai-123.jpg",
      },
    });

    it("should retrieve shared photo successfully", async () => {
      const mockUser = createMockUser();
      const mockSharedPhoto = createMockSharedPhoto();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ shareId: "share-123" });
      mockGetSharedPhotoById.mockResolvedValue(mockSharedPhoto as never);

      const result = await handler(mockEvent);

      expect(mockGetSharedPhotoById).toHaveBeenCalledWith("share-123");
      expect(result).toBeDefined();
    });

    it("should return correct response structure", async () => {
      const mockUser = createMockUser();
      const mockSharedPhoto = createMockSharedPhoto();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ shareId: "share-123" });
      mockGetSharedPhotoById.mockResolvedValue(mockSharedPhoto as never);

      const result = await handler(mockEvent);

      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        {
          id: "share-123",
          eventId: "event-123",
          aiphotoId: "photo-123",
          selectedUrl: "photos/selected.jpg",
          qrCodeUrl: "qr/code-123.png",
          qrExpiresAt: "2024-12-31T23:59:59.000Z",
          createdAt: "2024-01-01T00:00:00.000Z",
          event: {
            id: "event-123",
            name: "Test Event",
          },
          aiPhoto: {
            id: "photo-123",
            style: "REALISTIC",
            generatedUrl: "photos/ai-123.jpg",
          },
        },
        "Share retrieved successfully",
      );
      expect(result).toEqual({
        success: true,
        data: {
          id: "share-123",
          eventId: "event-123",
          aiphotoId: "photo-123",
          selectedUrl: "photos/selected.jpg",
          qrCodeUrl: "qr/code-123.png",
          qrExpiresAt: "2024-12-31T23:59:59.000Z",
          createdAt: "2024-01-01T00:00:00.000Z",
          event: {
            id: "event-123",
            name: "Test Event",
          },
          aiPhoto: {
            id: "photo-123",
            style: "REALISTIC",
            generatedUrl: "photos/ai-123.jpg",
          },
        },
        message: "Share retrieved successfully",
      });
    });

    it("should convert dates to ISO string", async () => {
      const mockUser = createMockUser();
      const mockSharedPhoto = createMockSharedPhoto();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ shareId: "share-123" });
      mockGetSharedPhotoById.mockResolvedValue(mockSharedPhoto as never);

      await handler(mockEvent);

      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          qrExpiresAt: "2024-12-31T23:59:59.000Z",
          createdAt: "2024-01-01T00:00:00.000Z",
        }),
        expect.any(String),
      );
    });

    it("should include event information", async () => {
      const mockUser = createMockUser();
      const mockSharedPhoto = createMockSharedPhoto();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ shareId: "share-123" });
      mockGetSharedPhotoById.mockResolvedValue(mockSharedPhoto as never);

      await handler(mockEvent);

      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          event: {
            id: "event-123",
            name: "Test Event",
          },
        }),
        expect.any(String),
      );
    });

    it("should include AI photo information", async () => {
      const mockUser = createMockUser();
      const mockSharedPhoto = createMockSharedPhoto();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ shareId: "share-123" });
      mockGetSharedPhotoById.mockResolvedValue(mockSharedPhoto as never);

      await handler(mockEvent);

      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          aiPhoto: {
            id: "photo-123",
            style: "REALISTIC",
            generatedUrl: "photos/ai-123.jpg",
          },
        }),
        expect.any(String),
      );
    });
  });

  describe("Error Handling", () => {
    const createMockUser = () => ({
      id: "user-123",
      email: "test@example.com",
    });

    it("should handle getSharedPhotoById errors", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ shareId: "share-123" });
      mockGetSharedPhotoById.mockRejectedValue(new Error("Database error"));

      mockHandleApiError.mockReturnValue({
        type: "INTERNAL_ERROR",
        code: "INTERNAL_ERROR",
        message: "Database error",
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });

      await expect(handler(mockEvent)).rejects.toThrow("Database error");
    });

    it("should use INTERNAL_ERROR as default statusCode", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ shareId: "share-123" });
      mockGetSharedPhotoById.mockRejectedValue(new Error("Test error"));

      mockHandleApiError.mockReturnValue({
        type: "ERROR",
        code: "ERROR",
        message: "Test error",
      } as never);

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });
    });

    it("should call createErrorResponse for errors", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ shareId: "share-123" });
      mockGetSharedPhotoById.mockRejectedValue(new Error("Test error"));

      mockHandleApiError.mockReturnValue({
        type: "ERROR",
        code: "ERROR",
        message: "Test error",
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });

      await expect(handler(mockEvent)).rejects.toThrow();
      expect(mockCreateErrorResponse).toHaveBeenCalled();
    });

    it("should use provided statusCode when available", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ shareId: "share-123" });

      const errorWithStatus = new Error("Custom error") as Error & { statusCode: number };
      errorWithStatus.statusCode = 403;
      mockGetSharedPhotoById.mockRejectedValue(errorWithStatus);

      mockHandleApiError.mockReturnValue({
        type: "ERROR",
        code: "ERROR",
        message: "Custom error",
        statusCode: 403,
      });

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });
});
