import { describe, it, expect, beforeAll, beforeEach, jest } from "@jest/globals";
import {
  mockCreateError,
  mockDefineEventHandler,
  mockReadBody,
  mockHandleApiError,
  mockCreateSuccessResponse,
  mockCreateErrorResponse,
  mockRequireAuth,
  mockGetEventById,
  mockCreatePhotoSession,
} from "~/tests/server/mocks/mocks";
import { ERROR_STATUS_MAP } from "~/server/types/core";

jest.mock("h3", () => ({
  defineEventHandler: mockDefineEventHandler,
  createError: mockCreateError,
  readBody: mockReadBody,
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
  createPhotoSession: mockCreatePhotoSession,
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

describe("API: POST /api/v1/session/create", () => {
  let handler: (event: unknown) => Promise<unknown>;
  let mockEvent: MockEvent;

  beforeAll(async () => {
    const module = await import("~/server/api/v1/session/create.post");
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
      mockReadBody.mockResolvedValue({ eventId: "event-123" });

      await expect(handler(mockEvent)).rejects.toThrow();

      expect(mockRequireAuth).toHaveBeenCalledWith(mockEvent);
    });

    it("should reject unauthenticated requests", async () => {
      mockRequireAuth.mockRejectedValue(new Error("Unauthorized") as never);
      mockReadBody.mockResolvedValue({ eventId: "event-123" });

      mockHandleApiError.mockReturnValue({
        type: "AUTH_ERROR",
        code: "AUTH_ERROR",
        message: "Unauthorized",
        statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
      });

      await expect(handler(mockEvent)).rejects.toThrow("Unauthorized");
    });
  });

  describe("Request Body Validation", () => {
    const createMockUser = () => ({
      id: "user-123",
      email: "test@example.com",
    });

    it("should require request body", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadBody.mockResolvedValue(null);

      await expect(handler(mockEvent)).rejects.toThrow("Event ID is required");
    });

    it("should require eventId field", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadBody.mockResolvedValue({});

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
      mockReadBody.mockResolvedValue({ eventId: "" });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should read request body", async () => {
      const mockUser = createMockUser();
      const mockEvent = {
        id: "event-123",
        name: "Test Event",
        profileId: "user-123",
        logoUrl: null,
        startDate: new Date("2024-01-01T00:00:00Z"),
        endDate: new Date("2024-12-31T23:59:59Z"),
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      };
      const mockSession = {
        id: "session-123",
        eventId: "event-123",
        createdAt: new Date("2024-01-01T00:00:00Z"),
      };

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadBody.mockResolvedValue({ eventId: "event-123" });
      mockGetEventById.mockResolvedValue(mockEvent);
      mockCreatePhotoSession.mockResolvedValue(mockSession);

      await handler(mockEvent);

      expect(mockReadBody).toHaveBeenCalledWith(mockEvent);
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
      mockReadBody.mockResolvedValue({ eventId: "event-123" });
      mockGetEventById.mockResolvedValue(null);

      await expect(handler(mockEvent)).rejects.toThrow("Event not found");
    });

    it("should call getEventById with correct parameters", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadBody.mockResolvedValue({ eventId: "event-123" });
      mockGetEventById.mockResolvedValue(null);

      await expect(handler(mockEvent)).rejects.toThrow();

      expect(mockGetEventById).toHaveBeenCalledWith("event-123", "user-123");
    });

    it("should use NOT_FOUND status code from error", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadBody.mockResolvedValue({ eventId: "event-123" });
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

  describe("Session Creation", () => {
    const createMockUser = () => ({
      id: "user-123",
      email: "test@example.com",
    });

    const createMockEvent = () => ({
      id: "event-123",
      name: "Test Event",
      profileId: "user-123",
      logoUrl: null,
      startDate: new Date("2024-01-01T00:00:00Z"),
      endDate: new Date("2024-12-31T23:59:59Z"),
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-01T00:00:00Z"),
    });

    it("should create photo session successfully", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSession = {
        id: "session-123",
        eventId: "event-123",
        createdAt: new Date("2024-01-01T00:00:00Z"),
      };

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadBody.mockResolvedValue({ eventId: "event-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockCreatePhotoSession.mockResolvedValue(mockSession);

      const result = await handler(mockEvent);

      expect(mockCreatePhotoSession).toHaveBeenCalledWith("event-123");
      expect(result).toBeDefined();
    });

    it("should return correct response structure", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSession = {
        id: "session-123",
        eventId: "event-123",
        createdAt: new Date("2024-01-01T00:00:00Z"),
      };

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadBody.mockResolvedValue({ eventId: "event-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockCreatePhotoSession.mockResolvedValue(mockSession);

      const result = await handler(mockEvent);

      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        {
          sessionId: "session-123",
          eventId: "event-123",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        "Session created successfully",
      );
      expect(result).toEqual({
        success: true,
        data: {
          sessionId: "session-123",
          eventId: "event-123",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        message: "Session created successfully",
      });
    });

    it("should convert createdAt to ISO string", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSession = {
        id: "session-123",
        eventId: "event-123",
        createdAt: new Date("2024-01-01T00:00:00Z"),
      };

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadBody.mockResolvedValue({ eventId: "event-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockCreatePhotoSession.mockResolvedValue(mockSession);

      await handler(mockEvent);

      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: "2024-01-01T00:00:00.000Z",
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
      startDate: new Date("2024-01-01T00:00:00Z"),
      endDate: new Date("2024-12-31T23:59:59Z"),
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-01T00:00:00Z"),
    });

    it("should handle createPhotoSession errors", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadBody.mockResolvedValue({ eventId: "event-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockCreatePhotoSession.mockRejectedValue(new Error("Database error"));

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
      const mockEventData = createMockEvent();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadBody.mockResolvedValue({ eventId: "event-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockCreatePhotoSession.mockRejectedValue(new Error("Test error"));

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
      const mockEventData = createMockEvent();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadBody.mockResolvedValue({ eventId: "event-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockCreatePhotoSession.mockRejectedValue(new Error("Test error"));

      mockHandleApiError.mockReturnValue({
        type: "ERROR",
        code: "ERROR",
        message: "Test error",
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });

      await expect(handler(mockEvent)).rejects.toThrow();
      expect(mockCreateErrorResponse).toHaveBeenCalled();
    });

    it("should handle getEventById errors", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadBody.mockResolvedValue({ eventId: "event-123" });
      mockGetEventById.mockRejectedValue(new Error("Database error"));

      mockHandleApiError.mockReturnValue({
        type: "INTERNAL_ERROR",
        code: "INTERNAL_ERROR",
        message: "Database error",
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });

      await expect(handler(mockEvent)).rejects.toThrow("Database error");
    });

    it("should use provided statusCode when available", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadBody.mockResolvedValue({ eventId: "event-123" });

      const errorWithStatus = new Error("Custom error") as Error & { statusCode: number };
      errorWithStatus.statusCode = 403;
      mockGetEventById.mockRejectedValue(errorWithStatus);

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
