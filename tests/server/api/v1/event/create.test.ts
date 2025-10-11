import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import {
  mockCreateError,
  mockDefineEventHandler,
  mockSetHeader,
  mockReadBody,
  mockGetHeader,
  mockHandleApiError,
  mockGetUser,
  mockCreateAuthClient,
  mockCreateSuccessResponse,
  mockCreateErrorResponse,
  mockCreateEvent,
} from "~/tests/server/mocks/mocks";
import { ERROR_STATUS_MAP } from "~/server/types/core";

(global as unknown as Record<string, unknown>).defineEventHandler = mockDefineEventHandler;
(global as unknown as Record<string, unknown>).readBody = mockReadBody;
(global as unknown as Record<string, unknown>).createError = mockCreateError;
(global as unknown as Record<string, unknown>).getHeader = mockGetHeader;

jest.mock("h3", () => ({
  defineEventHandler: mockDefineEventHandler,
  createError: mockCreateError,
  setHeader: mockSetHeader,
  readBody: mockReadBody,
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
  createEvent: mockCreateEvent,
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

describe("API: POST /api/v1/event/create", () => {
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

    const module = await import("~/server/api/v1/event/create.post");
    handler = module.default as (event: unknown) => Promise<unknown>;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("Authorization", () => {
    it("should require authorization header", async () => {
      mockReadBody.mockResolvedValue({
        name: "Test Event",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });
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
        expect(opts.data.error.code).toBe("AUTH_ERROR");
        throw new Error("Missing authorization header");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Missing authorization header");
    });

    it("should extract token from authorization header", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      mockReadBody.mockResolvedValue({
        name: "Test Event",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });
      mockGetHeader.mockReturnValue("Bearer valid-token-123");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockCreateEvent.mockResolvedValue(mockEventData);

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
        mockReadBody.mockResolvedValue({
          name: "Test Event",
          startDate: "2024-01-01",
          endDate: "2024-12-31",
        });
        mockGetHeader.mockReturnValue(authHeader);
        mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
        mockCreateEvent.mockResolvedValue(mockEventData);

        await handler(mockEvent);

        expect(mockGetUser).toHaveBeenCalledWith(expectedToken);
      }
    });

    it("should verify user from token", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      mockReadBody.mockResolvedValue({
        name: "Test Event",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockCreateEvent.mockResolvedValue(mockEventData);

      await handler(mockEvent);

      expect(mockGetUser).toHaveBeenCalledWith("valid-token");
    });

    it("should reject when getUser returns error", async () => {
      mockReadBody.mockResolvedValue({
        name: "Test Event",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });
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
      mockReadBody.mockResolvedValue({
        name: "Test Event",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });
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
      mockReadBody.mockResolvedValue({
        name: "Test Event",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });
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
      mockReadBody.mockResolvedValue({
        name: "Test Event",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });
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
    it("should validate name is provided", async () => {
      mockReadBody.mockResolvedValue({
        name: "",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");

      mockHandleApiError.mockReturnValue({
        type: "VALIDATION_ERROR",
        code: "MISSING_REQUIRED_FIELD",
        message: "Missing required field: name",
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
      });

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.VALIDATION_ERROR);
        expect(opts.statusMessage).toBe("Missing required field: name");
        expect(opts.data.error.code).toBe("MISSING_REQUIRED_FIELD");
        throw new Error("Missing required field: name");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Missing required field: name");
    });

    it("should validate startDate is provided", async () => {
      mockReadBody.mockResolvedValue({
        name: "Test Event",
        startDate: "",
        endDate: "2024-12-31",
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");

      mockHandleApiError.mockReturnValue({
        type: "VALIDATION_ERROR",
        code: "MISSING_REQUIRED_FIELD",
        message: "Missing required field: startDate",
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
      });

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.VALIDATION_ERROR);
        expect(opts.statusMessage).toBe("Missing required field: startDate");
        throw new Error("Missing required field: startDate");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Missing required field: startDate");
    });

    it("should validate endDate is provided", async () => {
      mockReadBody.mockResolvedValue({
        name: "Test Event",
        startDate: "2024-01-01",
        endDate: "",
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");

      mockHandleApiError.mockReturnValue({
        type: "VALIDATION_ERROR",
        code: "MISSING_REQUIRED_FIELD",
        message: "Missing required field: endDate",
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
      });

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.VALIDATION_ERROR);
        expect(opts.statusMessage).toBe("Missing required field: endDate");
        throw new Error("Missing required field: endDate");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Missing required field: endDate");
    });

    it("should validate in order: auth header, name, startDate, endDate", async () => {
      mockReadBody.mockResolvedValue({});
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
      expect(mockGetHeader).toHaveBeenCalled();
    });

    it("should handle null body for name validation", async () => {
      mockReadBody.mockResolvedValue(null);
      mockGetHeader.mockReturnValue("Bearer valid-token");

      mockHandleApiError.mockReturnValue({
        type: "VALIDATION_ERROR",
        code: "MISSING_REQUIRED_FIELD",
        message: "Missing required field: name",
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Missing required field: name");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Missing required field: name");
    });

    it("should handle undefined body for startDate validation", async () => {
      mockReadBody.mockResolvedValue(undefined);
      mockGetHeader.mockReturnValue("Bearer valid-token");

      mockHandleApiError.mockReturnValue({
        type: "VALIDATION_ERROR",
        code: "MISSING_REQUIRED_FIELD",
        message: "Missing required field: name",
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Missing required field: name");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should handle body with only name", async () => {
      mockReadBody.mockResolvedValue({ name: "Event" });
      mockGetHeader.mockReturnValue("Bearer valid-token");

      mockHandleApiError.mockReturnValue({
        type: "VALIDATION_ERROR",
        code: "MISSING_REQUIRED_FIELD",
        message: "Missing required field: startDate",
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Missing required field: startDate");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Missing required field: startDate");
    });

    it("should handle body with name and startDate but no endDate", async () => {
      mockReadBody.mockResolvedValue({ name: "Event", startDate: "2024-01-01" });
      mockGetHeader.mockReturnValue("Bearer valid-token");

      mockHandleApiError.mockReturnValue({
        type: "VALIDATION_ERROR",
        code: "MISSING_REQUIRED_FIELD",
        message: "Missing required field: endDate",
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Missing required field: endDate");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Missing required field: endDate");
    });

    it("should handle body with null name", async () => {
      mockReadBody.mockResolvedValue({ name: null, startDate: "2024-01-01", endDate: "2024-12-31" });
      mockGetHeader.mockReturnValue("Bearer valid-token");

      mockHandleApiError.mockReturnValue({
        type: "VALIDATION_ERROR",
        code: "MISSING_REQUIRED_FIELD",
        message: "Missing required field: name",
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Missing required field: name");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Missing required field: name");
    });

    it("should handle body with null startDate", async () => {
      mockReadBody.mockResolvedValue({ name: "Event", startDate: null, endDate: "2024-12-31" });
      mockGetHeader.mockReturnValue("Bearer valid-token");

      mockHandleApiError.mockReturnValue({
        type: "VALIDATION_ERROR",
        code: "MISSING_REQUIRED_FIELD",
        message: "Missing required field: startDate",
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Missing required field: startDate");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Missing required field: startDate");
    });

    it("should handle body with null endDate", async () => {
      mockReadBody.mockResolvedValue({ name: "Event", startDate: "2024-01-01", endDate: null });
      mockGetHeader.mockReturnValue("Bearer valid-token");

      mockHandleApiError.mockReturnValue({
        type: "VALIDATION_ERROR",
        code: "MISSING_REQUIRED_FIELD",
        message: "Missing required field: endDate",
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Missing required field: endDate");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Missing required field: endDate");
    });

    it("should handle body without startDate property", async () => {
      mockReadBody.mockResolvedValue({ name: "Event", endDate: "2024-12-31" });
      mockGetHeader.mockReturnValue("Bearer valid-token");

      mockHandleApiError.mockReturnValue({
        type: "VALIDATION_ERROR",
        code: "MISSING_REQUIRED_FIELD",
        message: "Missing required field: startDate",
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Missing required field: startDate");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Missing required field: startDate");
    });

    it("should handle body without endDate property", async () => {
      mockReadBody.mockResolvedValue({ name: "Event", startDate: "2024-01-01" } as never);
      mockGetHeader.mockReturnValue("Bearer valid-token");

      mockHandleApiError.mockReturnValue({
        type: "VALIDATION_ERROR",
        code: "MISSING_REQUIRED_FIELD",
        message: "Missing required field: endDate",
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Missing required field: endDate");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Missing required field: endDate");
    });
  });

  describe("Event Creation", () => {
    it("should create event with valid data", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      mockReadBody.mockResolvedValue({
        name: "Test Event",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockCreateEvent.mockResolvedValue(mockEventData);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(mockCreateEvent).toHaveBeenCalledWith({
        name: "Test Event",
        userId: "user-123",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("Event created successfully");
    });

    it("should use user id from authenticated user", async () => {
      const mockUser = { ...createMockUser(), id: "different-user-456" };
      const mockEventData = createMockEvent();
      mockReadBody.mockResolvedValue({
        name: "Test Event",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockCreateEvent.mockResolvedValue(mockEventData);

      await handler(mockEvent);

      expect(mockCreateEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "different-user-456",
        }),
      );
    });

    it("should convert date strings to Date objects", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      mockReadBody.mockResolvedValue({
        name: "Test Event",
        startDate: "2024-06-15T10:00:00Z",
        endDate: "2024-06-15T18:00:00Z",
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockCreateEvent.mockResolvedValue(mockEventData);

      await handler(mockEvent);

      expect(mockCreateEvent).toHaveBeenCalledWith({
        name: "Test Event",
        userId: "user-123",
        startDate: new Date("2024-06-15T10:00:00Z"),
        endDate: new Date("2024-06-15T18:00:00Z"),
      });
    });

    it("should reject when startDate is null after creation", async () => {
      const mockUser = createMockUser();
      const mockEventData = {
        ...createMockEvent(),
        startDate: null,
      };
      mockReadBody.mockResolvedValue({
        name: "Test Event",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockCreateEvent.mockResolvedValue(mockEventData as never);

      mockHandleApiError.mockReturnValue({
        code: "INVARIANT_VIOLATION",
        message: "startDate/endDate should never be null after creation",
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.INTERNAL_ERROR);
        expect(opts.statusMessage).toBe("Invariant violated: startDate/endDate is null");
        throw new Error("Invariant violated: startDate/endDate is null");
      });

      await expect(handler(mockEvent)).rejects.toThrow(
        "Invariant violated: startDate/endDate is null",
      );
    });

    it("should reject when endDate is null after creation", async () => {
      const mockUser = createMockUser();
      const mockEventData = {
        ...createMockEvent(),
        endDate: null,
      };
      mockReadBody.mockResolvedValue({
        name: "Test Event",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockCreateEvent.mockResolvedValue(mockEventData as never);

      mockHandleApiError.mockReturnValue({
        code: "INVARIANT_VIOLATION",
        message: "startDate/endDate should never be null after creation",
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Invariant violated: startDate/endDate is null");
      });

      await expect(handler(mockEvent)).rejects.toThrow(
        "Invariant violated: startDate/endDate is null",
      );
    });

    it("should reject when both dates are null after creation", async () => {
      const mockUser = createMockUser();
      const mockEventData = {
        ...createMockEvent(),
        startDate: null,
        endDate: null,
      };
      mockReadBody.mockResolvedValue({
        name: "Test Event",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockCreateEvent.mockResolvedValue(mockEventData as never);

      mockHandleApiError.mockReturnValue({
        code: "INVARIANT_VIOLATION",
        message: "startDate/endDate should never be null after creation",
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Invariant violated: startDate/endDate is null");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should handle event creation errors", async () => {
      const mockUser = createMockUser();
      mockReadBody.mockResolvedValue({
        name: "Test Event",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockCreateEvent.mockRejectedValue(new Error("Database error"));

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
      mockReadBody.mockResolvedValue({
        name: "Test Event",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockCreateEvent.mockResolvedValue(mockEventData);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("message", "Event created successfully");
      expect(result).toHaveProperty("data");
    });

    it("should include all event fields in response", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      mockReadBody.mockResolvedValue({
        name: "Test Event",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockCreateEvent.mockResolvedValue(mockEventData);

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
      mockReadBody.mockResolvedValue({
        name: "My Event",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockCreateEvent.mockResolvedValue(mockEventData);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.id).toBe("event-123");
      expect(result.data.name).toBe("Test Event");
      expect(result.data.logoUrl).toBeNull();
      expect(result.data.startDate).toEqual(new Date("2024-01-01T00:00:00Z"));
      expect(result.data.endDate).toEqual(new Date("2024-12-31T23:59:59Z"));
    });

    it("should handle event with logoUrl", async () => {
      const mockUser = createMockUser();
      const mockEventData = {
        ...createMockEvent(),
        logoUrl: "https://example.com/logo.png",
      };
      mockReadBody.mockResolvedValue({
        name: "Test Event",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockCreateEvent.mockResolvedValue(mockEventData);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.logoUrl).toBe("https://example.com/logo.png");
    });
  });

  describe("Error Handling", () => {
    it("should catch and handle validation errors", async () => {
      mockReadBody.mockResolvedValue({
        name: "",
        startDate: "",
        endDate: "",
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");

      mockHandleApiError.mockReturnValue({
        type: "VALIDATION_ERROR",
        code: "MISSING_REQUIRED_FIELD",
        message: "Missing required field: name",
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Missing required field: name");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should catch and handle auth errors", async () => {
      mockReadBody.mockResolvedValue({
        name: "Test Event",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });
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
      mockReadBody.mockRejectedValue(new Error("Unexpected error"));

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
      mockReadBody.mockRejectedValue(new Error("Body parse error"));

      mockHandleApiError.mockReturnValue({
        code: "PARSE_ERROR",
        message: "Body parse error",
      } as never);

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.INTERNAL_ERROR);
        throw new Error("Body parse error");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });
  });

  describe("Request Body", () => {
    it("should parse request body correctly", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      mockReadBody.mockResolvedValue({
        name: "Test Event",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockCreateEvent.mockResolvedValue(mockEventData);

      await handler(mockEvent);

      expect(mockReadBody).toHaveBeenCalledWith(mockEvent);
    });

    it("should handle body parse errors", async () => {
      mockReadBody.mockRejectedValue(new Error("Invalid JSON"));

      mockHandleApiError.mockReturnValue({
        code: "INVALID_REQUEST_BODY",
        message: "Invalid JSON",
        statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Invalid JSON");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Invalid JSON");
    });
  });

  describe("Supabase Integration", () => {
    it("should call createAuthClient", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      mockReadBody.mockResolvedValue({
        name: "Test Event",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockCreateEvent.mockResolvedValue(mockEventData);

      await handler(mockEvent);

      expect(mockCreateAuthClient).toHaveBeenCalled();
    });

    it("should call getUser with extracted token", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      mockReadBody.mockResolvedValue({
        name: "Test Event",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });
      mockGetHeader.mockReturnValue("Bearer my-secret-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockCreateEvent.mockResolvedValue(mockEventData);

      await handler(mockEvent);

      expect(mockGetUser).toHaveBeenCalledWith("my-secret-token");
    });
  });

  describe("Different Event Data", () => {
    it("should handle various valid event data", async () => {
      const mockUser = createMockUser();
      const testCases = [
        {
          name: "Conference 2024",
          startDate: "2024-03-01T09:00:00Z",
          endDate: "2024-03-03T17:00:00Z",
        },
        {
          name: "Birthday Party",
          startDate: "2024-07-15T18:00:00Z",
          endDate: "2024-07-15T23:00:00Z",
        },
        {
          name: "Workshop",
          startDate: "2024-05-10",
          endDate: "2024-05-12",
        },
      ];

      for (const testCase of testCases) {
        const mockEventData = createMockEvent();
        mockReadBody.mockResolvedValue(testCase);
        mockGetHeader.mockReturnValue("Bearer valid-token");
        mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
        mockCreateEvent.mockResolvedValue(mockEventData);

        const result = (await handler(mockEvent)) as SuccessResponse;

        expect(mockCreateEvent).toHaveBeenCalledWith({
          name: testCase.name,
          userId: "user-123",
          startDate: new Date(testCase.startDate),
          endDate: new Date(testCase.endDate),
        });
        expect(result.success).toBe(true);
      }
    });
  });
});

