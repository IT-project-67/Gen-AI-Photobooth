import { describe, it, expect, beforeAll, beforeEach, jest } from "@jest/globals";
import {
  mockCreateError,
  mockDefineEventHandler,
  mockGetQuery,
  mockRequireAuth,
  mockHandleApiError,
  mockCreateSuccessResponse,
  mockCreateErrorResponse,
  mockGetEventById,
  mockGetSharedPhotosByEvent,
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
  getEventById: mockGetEventById,
  getSharedPhotosByEvent: mockGetSharedPhotosByEvent,
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

describe("API: GET /api/v1/share/get-shares-by-event", () => {
  let handler: (event: unknown) => Promise<unknown>;
  let mockEvent: MockEvent;

  beforeAll(async () => {
    const module = await import("~/server/api/v1/share/get-shares-by-event.get");
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
      mockGetQuery.mockReturnValue({ eventId: "event-123" });

      await expect(handler(mockEvent)).rejects.toThrow();

      expect(mockRequireAuth).toHaveBeenCalledWith(mockEvent);
    });

    it("should reject unauthenticated requests", async () => {
      mockRequireAuth.mockRejectedValue(new Error("Unauthorized") as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123" });

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

    it("should require eventId query parameter", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({});

      await expect(handler(mockEvent)).rejects.toThrow("Event ID is required");

      expect(mockCreateError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
          statusMessage: "Event ID is required",
        }),
      );
    });

    it("should reject empty eventId", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "" });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should read query parameters", async () => {
      const mockUser = createMockUser();
      const mockEventData = {
        id: "event-123",
        name: "Test Event",
        profileId: "user-123",
        logoUrl: null,
        startDate: new Date(),
        endDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetSharedPhotosByEvent.mockResolvedValue([]);

      await handler(mockEvent);

      expect(mockGetQuery).toHaveBeenCalledWith(mockEvent);
    });
  });

  describe("Event Verification", () => {
    const createMockUser = () => ({
      id: "user-123",
      email: "test@example.com",
    });

    it("should verify event exists", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123" });
      mockGetEventById.mockResolvedValue(null);

      await expect(handler(mockEvent)).rejects.toThrow("Event not found");
    });

    it("should call getEventById with correct parameters", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123" });
      mockGetEventById.mockResolvedValue(null);

      await expect(handler(mockEvent)).rejects.toThrow();

      expect(mockGetEventById).toHaveBeenCalledWith("event-123", "user-123");
    });

    it("should use NOT_FOUND status code", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123" });
      mockGetEventById.mockResolvedValue(null);

      mockHandleApiError.mockReturnValue({
        type: "NOT_FOUND",
        code: "EVENT_NOT_FOUND",
        message: "Event not found",
        statusCode: ERROR_STATUS_MAP.NOT_FOUND,
      });

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: ERROR_STATUS_MAP.NOT_FOUND,
      });
    });
  });

  describe("Shares Retrieval", () => {
    const createMockUser = () => ({
      id: "user-123",
      email: "test@example.com",
    });

    const createMockEvent = () => ({
      id: "event-123",
      name: "Test Event",
      profileId: "user-123",
      logoUrl: null,
      startDate: new Date(),
      endDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const createMockSharedPhoto = (id: string) => ({
      id,
      eventId: "event-123",
      aiPhotoId: `photo-${id}`,
      selectedUrl: `photos/selected-${id}.jpg`,
      qrCodeUrl: `qr/code-${id}.png`,
      qrExpiresAt: new Date("2024-12-31T23:59:59Z"),
      createdAt: new Date("2024-01-01T00:00:00Z"),
      event: {
        id: "event-123",
        name: "Test Event",
      },
      aiPhoto: {
        id: `photo-${id}`,
        style: "REALISTIC",
        generatedUrl: `photos/ai-${id}.jpg`,
      },
    });

    it("should retrieve shared photos successfully", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSharedPhotos = [createMockSharedPhoto("share-1"), createMockSharedPhoto("share-2")];

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetSharedPhotosByEvent.mockResolvedValue(mockSharedPhotos as never);

      const result = await handler(mockEvent);

      expect(mockGetSharedPhotosByEvent).toHaveBeenCalledWith("event-123");
      expect(result).toBeDefined();
    });

    it("should return empty array when no shares", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetSharedPhotosByEvent.mockResolvedValue([]);

      await handler(mockEvent);

      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        { shares: [] },
        "Shares retrieved successfully",
      );
    });

    it("should return correct response structure", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSharedPhotos = [createMockSharedPhoto("share-1")];

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetSharedPhotosByEvent.mockResolvedValue(mockSharedPhotos as never);

      await handler(mockEvent);

      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        {
          shares: [
            {
              id: "share-1",
              eventId: "event-123",
              aiphotoId: "photo-share-1",
              selectedUrl: "photos/selected-share-1.jpg",
              qrCodeUrl: "qr/code-share-1.png",
              qrExpiresAt: "2024-12-31T23:59:59.000Z",
              createdAt: "2024-01-01T00:00:00.000Z",
              event: {
                id: "event-123",
                name: "Test Event",
              },
              aiPhoto: {
                id: "photo-share-1",
                style: "REALISTIC",
                generatedUrl: "photos/ai-share-1.jpg",
              },
            },
          ],
        },
        "Shares retrieved successfully",
      );
    });

    it("should convert dates to ISO string", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSharedPhotos = [createMockSharedPhoto("share-1")];

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetSharedPhotosByEvent.mockResolvedValue(mockSharedPhotos as never);

      await handler(mockEvent);

      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          shares: expect.arrayContaining([
            expect.objectContaining({
              qrExpiresAt: "2024-12-31T23:59:59.000Z",
              createdAt: "2024-01-01T00:00:00.000Z",
            }),
          ]),
        }),
        expect.any(String),
      );
    });

    it("should include event information in each share", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSharedPhotos = [createMockSharedPhoto("share-1")];

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetSharedPhotosByEvent.mockResolvedValue(mockSharedPhotos as never);

      await handler(mockEvent);

      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          shares: expect.arrayContaining([
            expect.objectContaining({
              event: {
                id: "event-123",
                name: "Test Event",
              },
            }),
          ]),
        }),
        expect.any(String),
      );
    });

    it("should include AI photo information in each share", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSharedPhotos = [createMockSharedPhoto("share-1")];

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetSharedPhotosByEvent.mockResolvedValue(mockSharedPhotos as never);

      await handler(mockEvent);

      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          shares: expect.arrayContaining([
            expect.objectContaining({
              aiPhoto: {
                id: "photo-share-1",
                style: "REALISTIC",
                generatedUrl: "photos/ai-share-1.jpg",
              },
            }),
          ]),
        }),
        expect.any(String),
      );
    });

    it("should handle multiple shares", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSharedPhotos = [
        createMockSharedPhoto("share-1"),
        createMockSharedPhoto("share-2"),
        createMockSharedPhoto("share-3"),
      ];

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetSharedPhotosByEvent.mockResolvedValue(mockSharedPhotos as never);

      await handler(mockEvent);

      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          shares: expect.arrayContaining([
            expect.objectContaining({ id: "share-1" }),
            expect.objectContaining({ id: "share-2" }),
            expect.objectContaining({ id: "share-3" }),
          ]),
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

    const createMockEvent = () => ({
      id: "event-123",
      name: "Test Event",
      profileId: "user-123",
      logoUrl: null,
      startDate: new Date(),
      endDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    it("should handle getSharedPhotosByEvent errors", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetSharedPhotosByEvent.mockRejectedValue(new Error("Database error"));

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
      mockGetQuery.mockReturnValue({});

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
      mockGetQuery.mockReturnValue({});

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
      mockGetQuery.mockReturnValue({});

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
