import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import {
  mockCreateError,
  mockDefineEventHandler,
  mockSetHeader,
  mockGetQuery,
  mockGetHeader,
  mockHandleApiError,
  mockGetUser,
  mockCreateAuthClient,
  mockCreateSuccessResponse,
  mockCreateErrorResponse,
  mockGetEventById,
} from "~/tests/server/mocks/mocks";
import { ERROR_STATUS_MAP } from "~/server/types/core";

(global as unknown as Record<string, unknown>).defineEventHandler = mockDefineEventHandler;
(global as unknown as Record<string, unknown>).getQuery = mockGetQuery;
(global as unknown as Record<string, unknown>).getHeader = mockGetHeader;
(global as unknown as Record<string, unknown>).createError = mockCreateError;

jest.mock("h3", () => ({
  defineEventHandler: mockDefineEventHandler,
  createError: mockCreateError,
  setHeader: mockSetHeader,
  getQuery: mockGetQuery,
  getHeader: mockGetHeader,
}));

jest.mock("~~/server/clients", () => ({
  createAuthClient: mockCreateAuthClient,
}));

jest.mock("~~/server/utils/auth", () => ({
  handleApiError: mockHandleApiError,
}));

jest.mock("~~/server/utils/core", () => ({
  createSuccessResponse: mockCreateSuccessResponse,
  createErrorResponse: mockCreateErrorResponse,
}));

jest.mock("~~/server/model", () => ({
  getEventById: mockGetEventById,
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
    name: string;
    logoUrl?: string | null;
    startDate: Date;
    endDate: Date;
    createdAt: Date;
    updatedAt: Date;
  } | null;
};

type ErrorOptions = {
  statusCode: number;
  statusMessage: string;
  data: {
    error: {
      type?: string;
      code: string;
      message: string;
    };
  };
};

const createMockUser = () => ({
  id: "user-123",
  email: "test@example.com",
  email_confirmed_at: "2024-01-01T00:00:00Z",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
});

const createMockEvent = () => ({
  id: "event-123",
  name: "Test Event",
  logoUrl: null,
  startDate: new Date("2024-01-01T00:00:00Z"),
  endDate: new Date("2024-12-31T23:59:59Z"),
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
});

describe("API: GET /api/v1/event/get-event-by-id", () => {
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

    const module = await import("~/server/api/v1/event/get-event-by-id.get");
    handler = module.default as (event: unknown) => Promise<unknown>;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("Authorization", () => {
    it("should require authorization header", async () => {
      mockGetQuery.mockReturnValue({ id: "event-123" });
      mockGetHeader.mockReturnValue(undefined);

      mockHandleApiError.mockReturnValue({
        type: "AUTH_ERROR",
        code: "AUTH_ERROR",
        message: "Missing authorization header",
        statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
      });

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.AUTH_ERROR);
        expect(opts.statusMessage).toBe("Missing authorization header");
        throw new Error("Missing authorization header");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Missing authorization header");
    });

    it("should extract token from authorization header", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      mockGetQuery.mockReturnValue({ id: "event-123" });
      mockGetHeader.mockReturnValue("Bearer valid-token-123");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventById.mockResolvedValue(mockEventData);

      await handler(mockEvent);

      expect(mockGetHeader).toHaveBeenCalledWith(mockEvent, "authorization");
      expect(mockGetUser).toHaveBeenCalledWith("valid-token-123");
    });

    it("should handle different bearer token formats", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const tokens = [
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "Bearer simple-token",
        "Bearer token-with-dashes-123",
      ];

      for (const authHeader of tokens) {
        const expectedToken = authHeader.split(" ")[1];
        mockGetQuery.mockReturnValue({ id: "event-123" });
        mockGetHeader.mockReturnValue(authHeader);
        mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
        mockGetEventById.mockResolvedValue(mockEventData);

        await handler(mockEvent);

        expect(mockGetUser).toHaveBeenCalledWith(expectedToken);
      }
    });

    it("should reject when getUser returns error", async () => {
      mockGetQuery.mockReturnValue({ id: "event-123" });
      mockGetHeader.mockReturnValue("Bearer invalid-token");
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid token", error_code: "invalid_token" },
      });

      mockHandleApiError.mockReturnValue({
        code: "INVALID_TOKEN",
        message: "Invalid token",
        statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should reject when no user returned", async () => {
      mockGetQuery.mockReturnValue({ id: "event-123" });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      mockHandleApiError.mockReturnValue({
        code: "AUTH_ERROR",
        message: "User not found",
        statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("User not found");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should use auth error statusCode when provided", async () => {
      mockGetQuery.mockReturnValue({ id: "event-123" });
      mockGetHeader.mockReturnValue("Bearer invalid-token");
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Unauthorized" },
      });

      mockHandleApiError.mockReturnValue({
        code: "UNAUTHORIZED",
        message: "Unauthorized",
        statusCode: 401,
      });

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(401);
        throw new Error("Unauthorized");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should default to AUTH_ERROR statusCode if not provided", async () => {
      mockGetQuery.mockReturnValue({ id: "event-123" });
      mockGetHeader.mockReturnValue("Bearer token");
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Error" },
      });

      mockHandleApiError.mockReturnValue({
        code: "ERROR",
        message: "Error",
      } as never);

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.AUTH_ERROR);
        throw new Error("Error");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });
  });

  describe("Validation", () => {
    it("should require eventId parameter", async () => {
      mockGetQuery.mockReturnValue({});
      mockGetHeader.mockReturnValue("Bearer valid-token");

      mockHandleApiError.mockReturnValue({
        type: "VALIDATION_ERROR",
        code: "MISSING_REQUIRED_FIELD",
        message: "Missing required field: id",
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
      });

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.VALIDATION_ERROR);
        expect(opts.statusMessage).toBe("Missing required field: id");
        expect(opts.data.error.code).toBe("MISSING_REQUIRED_FIELD");
        throw new Error("Missing required field: id");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Missing required field: id");
    });

    it("should reject when eventId is empty string", async () => {
      mockGetQuery.mockReturnValue({ id: "" });
      mockGetHeader.mockReturnValue("Bearer valid-token");

      mockHandleApiError.mockReturnValue({
        type: "VALIDATION_ERROR",
        code: "MISSING_REQUIRED_FIELD",
        message: "Missing required field: id",
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Missing required field: id");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Missing required field: id");
    });

    it("should reject when eventId is undefined", async () => {
      mockGetQuery.mockReturnValue({ id: undefined });
      mockGetHeader.mockReturnValue("Bearer valid-token");

      mockHandleApiError.mockReturnValue({
        type: "VALIDATION_ERROR",
        code: "MISSING_REQUIRED_FIELD",
        message: "Missing required field: id",
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Missing required field: id");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Missing required field: id");
    });

    it("should reject when eventId is null", async () => {
      mockGetQuery.mockReturnValue({ id: null });
      mockGetHeader.mockReturnValue("Bearer valid-token");

      mockHandleApiError.mockReturnValue({
        type: "VALIDATION_ERROR",
        code: "MISSING_REQUIRED_FIELD",
        message: "Missing required field: id",
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Missing required field: id");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Missing required field: id");
    });

    it("should check authorization before eventId validation", async () => {
      mockGetQuery.mockReturnValue({ id: "" });
      mockGetHeader.mockReturnValue(undefined);

      mockHandleApiError.mockReturnValue({
        type: "AUTH_ERROR",
        code: "AUTH_ERROR",
        message: "Missing authorization header",
        statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Missing authorization header");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Missing authorization header");
    });
  });

  describe("Event Retrieval", () => {
    it("should fetch event by id successfully", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      mockGetQuery.mockReturnValue({ id: "event-123" });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventById.mockResolvedValue(mockEventData);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(mockGetEventById).toHaveBeenCalledWith("event-123", "user-123");
      expect(result.success).toBe(true);
      expect(result.message).toBe("Event fetched successfully");
    });

    it("should use userId from authenticated user", async () => {
      const mockUser = { ...createMockUser(), id: "different-user-456" };
      const mockEventData = createMockEvent();
      mockGetQuery.mockReturnValue({ id: "event-123" });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventById.mockResolvedValue(mockEventData);

      await handler(mockEvent);

      expect(mockGetEventById).toHaveBeenCalledWith("event-123", "different-user-456");
    });

    it("should return null when event not found", async () => {
      const mockUser = createMockUser();
      mockGetQuery.mockReturnValue({ id: "non-existent-event" });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventById.mockResolvedValue(null);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.success).toBe(true);
      expect(result.message).toBe("Event not found");
      expect(result.data).toBeNull();
    });

    it("should handle database errors", async () => {
      const mockUser = createMockUser();
      mockGetQuery.mockReturnValue({ id: "event-123" });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventById.mockRejectedValue(new Error("Database error"));

      mockHandleApiError.mockReturnValue({
        code: "DATABASE_ERROR",
        message: "Database error",
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Database error");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });
  });

  describe("Response Structure", () => {
    it("should return success response with correct structure", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      mockGetQuery.mockReturnValue({ id: "event-123" });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventById.mockResolvedValue(mockEventData);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("message", "Event fetched successfully");
      expect(result).toHaveProperty("data");
    });

    it("should include all event fields in response", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      mockGetQuery.mockReturnValue({ id: "event-123" });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventById.mockResolvedValue(mockEventData);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data).toHaveProperty("id");
      expect(result.data).toHaveProperty("name");
      expect(result.data).toHaveProperty("logoUrl");
      expect(result.data).toHaveProperty("startDate");
      expect(result.data).toHaveProperty("endDate");
      expect(result.data).toHaveProperty("createdAt");
      expect(result.data).toHaveProperty("updatedAt");
    });

    it("should return event data with correct values", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      mockGetQuery.mockReturnValue({ id: "event-123" });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventById.mockResolvedValue(mockEventData);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data?.id).toBe("event-123");
      expect(result.data?.name).toBe("Test Event");
      expect(result.data?.logoUrl).toBeNull();
      expect(result.data?.startDate).toEqual(new Date("2024-01-01T00:00:00Z"));
      expect(result.data?.endDate).toEqual(new Date("2024-12-31T23:59:59Z"));
    });

    it("should handle event with logoUrl", async () => {
      const mockUser = createMockUser();
      const mockEventData = {
        ...createMockEvent(),
        logoUrl: "https://example.com/logo.png",
      };
      mockGetQuery.mockReturnValue({ id: "event-123" });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventById.mockResolvedValue(mockEventData);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data?.logoUrl).toBe("https://example.com/logo.png");
    });

    it("should return null data when event not found", async () => {
      const mockUser = createMockUser();
      mockGetQuery.mockReturnValue({ id: "non-existent" });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventById.mockResolvedValue(null);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data).toBeNull();
    });
  });

  describe("Query Parameters", () => {
    it("should parse query parameters correctly", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      mockGetQuery.mockReturnValue({ id: "event-123" });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventById.mockResolvedValue(mockEventData);

      await handler(mockEvent);

      expect(mockGetQuery).toHaveBeenCalledWith(mockEvent);
    });

    it("should handle different eventId formats", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const eventIds = [
        "event-123",
        "uuid-abc-def-123",
        "12345",
        "event_with_underscore",
      ];

      for (const eventId of eventIds) {
        mockGetQuery.mockReturnValue({ id: eventId });
        mockGetHeader.mockReturnValue("Bearer valid-token");
        mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
        mockGetEventById.mockResolvedValue(mockEventData);

        await handler(mockEvent);

        expect(mockGetEventById).toHaveBeenCalledWith(eventId, "user-123");
      }
    });
  });

  describe("Error Handling", () => {
    it("should catch and handle validation errors", async () => {
      mockGetQuery.mockReturnValue({ id: "" });
      mockGetHeader.mockReturnValue("Bearer valid-token");

      mockHandleApiError.mockReturnValue({
        type: "VALIDATION_ERROR",
        code: "MISSING_REQUIRED_FIELD",
        message: "Missing required field: id",
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Missing required field: id");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should catch and handle auth errors", async () => {
      mockGetQuery.mockReturnValue({ id: "event-123" });
      mockGetHeader.mockReturnValue("Bearer invalid-token");
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid token" },
      });

      mockHandleApiError.mockReturnValue({
        code: "INVALID_TOKEN",
        message: "Invalid token",
        statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should use handleApiError for unexpected errors", async () => {
      const mockUser = createMockUser();
      mockGetQuery.mockReturnValue({ id: "event-123" });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventById.mockRejectedValue(new Error("Unexpected database error"));

      mockHandleApiError.mockReturnValue({
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("An unexpected error occurred");
      });

      await expect(handler(mockEvent)).rejects.toThrow();

      expect(mockHandleApiError).toHaveBeenCalled();
    });

    it("should default to INTERNAL_ERROR statusCode in catch block", async () => {
      const mockUser = createMockUser();
      mockGetQuery.mockReturnValue({ id: "event-123" });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventById.mockRejectedValue(new Error("Database connection error"));

      mockHandleApiError.mockReturnValue({
        code: "DATABASE_ERROR",
        message: "Database connection error",
      } as never);

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.INTERNAL_ERROR);
        throw new Error("Database connection error");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });
  });

  describe("Supabase Integration", () => {
    it("should call createAuthClient", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      mockGetQuery.mockReturnValue({ id: "event-123" });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventById.mockResolvedValue(mockEventData);

      await handler(mockEvent);

      expect(mockCreateAuthClient).toHaveBeenCalled();
    });

    it("should call getUser with extracted token", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      mockGetQuery.mockReturnValue({ id: "event-123" });
      mockGetHeader.mockReturnValue("Bearer my-secret-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventById.mockResolvedValue(mockEventData);

      await handler(mockEvent);

      expect(mockGetUser).toHaveBeenCalledWith("my-secret-token");
    });
  });

  describe("Different Scenarios", () => {
    it("should handle various event data combinations", async () => {
      const mockUser = createMockUser();
      const testCases = [
        {
          id: "event-1",
          name: "Conference",
          logoUrl: "https://example.com/logo1.png",
        },
        {
          id: "event-2",
          name: "Workshop",
          logoUrl: null,
        },
        {
          id: "event-3",
          name: "Meetup",
          logoUrl: "https://example.com/logo2.png",
        },
      ];

      for (const testCase of testCases) {
        const mockEventData = {
          ...createMockEvent(),
          ...testCase,
        };
        mockGetQuery.mockReturnValue({ id: testCase.id });
        mockGetHeader.mockReturnValue("Bearer valid-token");
        mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
        mockGetEventById.mockResolvedValue(mockEventData);

        const result = (await handler(mockEvent)) as SuccessResponse;

        expect(result.data?.id).toBe(testCase.id);
        expect(result.data?.name).toBe(testCase.name);
        expect(result.data?.logoUrl).toBe(testCase.logoUrl);
      }
    });

    it("should handle different user ids", async () => {
      const mockEventData = createMockEvent();
      const userIds = ["user-1", "user-2", "user-3"];

      for (const userId of userIds) {
        const mockUser = { ...createMockUser(), id: userId };
        mockGetQuery.mockReturnValue({ id: "event-123" });
        mockGetHeader.mockReturnValue("Bearer valid-token");
        mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
        mockGetEventById.mockResolvedValue(mockEventData);

        await handler(mockEvent);

        expect(mockGetEventById).toHaveBeenCalledWith("event-123", userId);
      }
    });
  });
});

