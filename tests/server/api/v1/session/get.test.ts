import { describe, it, expect, beforeAll, beforeEach, jest } from "@jest/globals";
import {
  mockCreateError,
  mockDefineEventHandler,
  mockGetQuery,
  mockHandleApiError,
  mockCreateSuccessResponse,
  mockCreateErrorResponse,
  mockRequireAuth,
  mockGetPhotoSessionById,
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
  getPhotoSessionById: mockGetPhotoSessionById,
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

describe("API: GET /api/v1/session", () => {
  let handler: (event: unknown) => Promise<unknown>;
  let mockEvent: MockEvent;

  beforeAll(async () => {
    const module = await import("~/server/api/v1/session/get.get");
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
      mockGetQuery.mockReturnValue({ sessionId: "session-123" });

      await expect(handler(mockEvent)).rejects.toThrow();

      expect(mockRequireAuth).toHaveBeenCalledWith(mockEvent);
    });

    it("should reject unauthenticated requests", async () => {
      mockRequireAuth.mockRejectedValue(new Error("Unauthorized") as never);
      mockGetQuery.mockReturnValue({ sessionId: "session-123" });

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

    it("should require sessionId query parameter", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({});

      await expect(handler(mockEvent)).rejects.toThrow("Session ID is required");

      expect(mockCreateError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
          statusMessage: "Session ID is required",
        }),
      );
    });

    it("should reject empty sessionId", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ sessionId: "" });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should read query parameters", async () => {
      const mockUser = createMockUser();
      const mockSession = {
        id: "session-123",
        eventId: "event-123",
        photoUrl: null,
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      };

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ sessionId: "session-123" });
      mockGetPhotoSessionById.mockResolvedValue(mockSession);

      await handler(mockEvent);

      expect(mockGetQuery).toHaveBeenCalledWith(mockEvent);
    });
  });

  describe("Session Verification", () => {
    const createMockUser = () => ({
      id: "user-123",
      email: "test@example.com",
    });

    it("should verify session exists", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ sessionId: "session-123" });
      mockGetPhotoSessionById.mockResolvedValue(null);

      await expect(handler(mockEvent)).rejects.toThrow("Session not found");
    });

    it("should call getPhotoSessionById with correct parameters", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ sessionId: "session-123" });
      mockGetPhotoSessionById.mockResolvedValue(null);

      await expect(handler(mockEvent)).rejects.toThrow();

      expect(mockGetPhotoSessionById).toHaveBeenCalledWith("session-123", "user-123");
    });

    it("should use NOT_FOUND status code", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ sessionId: "session-123" });
      mockGetPhotoSessionById.mockResolvedValue(null);

      mockHandleApiError.mockReturnValue({
        type: "NOT_FOUND",
        code: "SESSION_NOT_FOUND",
        message: "Session not found",
        statusCode: ERROR_STATUS_MAP.NOT_FOUND,
      });

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: ERROR_STATUS_MAP.NOT_FOUND,
      });
    });
  });

  describe("Session Retrieval", () => {
    const createMockUser = () => ({
      id: "user-123",
      email: "test@example.com",
    });

    const createMockSession = () => ({
      id: "session-123",
      eventId: "event-123",
      photoUrl: null,
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-01T00:00:00Z"),
    });

    it("should fetch session successfully", async () => {
      const mockUser = createMockUser();
      const mockSession = createMockSession();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ sessionId: "session-123" });
      mockGetPhotoSessionById.mockResolvedValue(mockSession);

      const result = await handler(mockEvent);

      expect(mockGetPhotoSessionById).toHaveBeenCalledWith("session-123", "user-123");
      expect(result).toBeDefined();
    });

    it("should return correct response structure", async () => {
      const mockUser = createMockUser();
      const mockSession = createMockSession();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ sessionId: "session-123" });
      mockGetPhotoSessionById.mockResolvedValue(mockSession);

      const result = await handler(mockEvent);

      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        {
          id: "session-123",
          eventId: "event-123",
          photoUrl: undefined,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        "Session retrieved successfully",
      );
      expect(result).toEqual({
        success: true,
        data: {
          id: "session-123",
          eventId: "event-123",
          photoUrl: undefined,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        message: "Session retrieved successfully",
      });
    });

    it("should handle session with photoUrl", async () => {
      const mockUser = createMockUser();
      const mockSession = {
        id: "session-123",
        eventId: "event-123",
        photoUrl: "https://example.com/photo.jpg",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      };

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ sessionId: "session-123" });
      mockGetPhotoSessionById.mockResolvedValue(mockSession);

      await handler(mockEvent);

      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          photoUrl: "https://example.com/photo.jpg",
        }),
        expect.any(String),
      );
    });

    it("should convert dates to ISO string", async () => {
      const mockUser = createMockUser();
      const mockSession = createMockSession();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ sessionId: "session-123" });
      mockGetPhotoSessionById.mockResolvedValue(mockSession);

      await handler(mockEvent);

      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
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

    it("should handle getPhotoSessionById errors", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ sessionId: "session-123" });
      mockGetPhotoSessionById.mockRejectedValue(new Error("Database error"));

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
      mockGetQuery.mockReturnValue({ sessionId: "session-123" });
      mockGetPhotoSessionById.mockRejectedValue(new Error("Test error"));

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
      mockGetQuery.mockReturnValue({ sessionId: "session-123" });
      mockGetPhotoSessionById.mockRejectedValue(new Error("Test error"));

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
      mockGetQuery.mockReturnValue({ sessionId: "session-123" });

      const errorWithStatus = new Error("Custom error") as Error & { statusCode: number };
      errorWithStatus.statusCode = 403;
      mockGetPhotoSessionById.mockRejectedValue(errorWithStatus);

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
