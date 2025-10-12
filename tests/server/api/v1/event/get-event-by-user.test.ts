import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import {
  mockCreateError,
  mockDefineEventHandler,
  mockSetHeader,
  mockGetHeader,
  mockHandleApiError,
  mockGetUser,
  mockCreateAuthClient,
  mockCreateSuccessResponse,
  mockCreateErrorResponse,
  mockGetEventsByProfile,
} from "~/tests/server/mocks/mocks";
import { ERROR_STATUS_MAP } from "~/server/types/core";

(global as unknown as Record<string, unknown>).defineEventHandler = mockDefineEventHandler;
(global as unknown as Record<string, unknown>).getHeader = mockGetHeader;
(global as unknown as Record<string, unknown>).createError = mockCreateError;

jest.mock("h3", () => ({
  defineEventHandler: mockDefineEventHandler,
  createError: mockCreateError,
  setHeader: mockSetHeader,
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
  getEventsByProfile: mockGetEventsByProfile,
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
  data: Array<{
    id: string;
    name: string;
    logoUrl?: string | null;
    startDate: Date;
    endDate: Date;
    createdAt: Date;
    updatedAt: Date;
  }>;
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

const createMockEvent = (id: string, name: string, logoUrl: string | null = null) => ({
  id,
  name,
  logoUrl,
  startDate: new Date("2024-01-01T00:00:00Z"),
  endDate: new Date("2024-12-31T23:59:59Z"),
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
});

describe("API: GET /api/v1/event/get-events-by-user", () => {
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

    const module = await import("~/server/api/v1/event/get-events-by-user.get");
    handler = module.default as (event: unknown) => Promise<unknown>;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("Authorization", () => {
    it("should require authorization header", async () => {
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
        expect(opts.data.error.type).toBe("AUTH_ERROR");
        expect(opts.data.error.code).toBe("AUTH_ERROR");
        throw new Error("Missing authorization header");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Missing authorization header");
    });

    it("should extract token from authorization header", async () => {
      const mockUser = createMockUser();
      mockGetHeader.mockReturnValue("Bearer valid-token-123");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventsByProfile.mockResolvedValue([]);

      await handler(mockEvent);

      expect(mockGetHeader).toHaveBeenCalledWith(mockEvent, "authorization");
      expect(mockGetUser).toHaveBeenCalledWith("valid-token-123");
    });

    it("should handle different bearer token formats", async () => {
      const mockUser = createMockUser();
      const tokens = [
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "Bearer simple-token",
        "Bearer token-with-dashes-123",
      ];

      for (const authHeader of tokens) {
        const expectedToken = authHeader.split(" ")[1];
        mockGetHeader.mockReturnValue(authHeader);
        mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
        mockGetEventsByProfile.mockResolvedValue([]);

        await handler(mockEvent);

        expect(mockGetUser).toHaveBeenCalledWith(expectedToken);
      }
    });

    it("should reject when getUser returns error", async () => {
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

  describe("Events Retrieval", () => {
    it("should fetch all events for user successfully", async () => {
      const mockUser = createMockUser();
      const mockEvents = [
        createMockEvent("event-1", "Event 1"),
        createMockEvent("event-2", "Event 2"),
        createMockEvent("event-3", "Event 3"),
      ];
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventsByProfile.mockResolvedValue(mockEvents);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(mockGetEventsByProfile).toHaveBeenCalledWith("user-123", "desc");
      expect(result.success).toBe(true);
      expect(result.message).toBe("Events fetched successfully");
      expect(result.data).toHaveLength(3);
    });

    it("should use desc order for events", async () => {
      const mockUser = createMockUser();
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventsByProfile.mockResolvedValue([]);

      await handler(mockEvent);

      expect(mockGetEventsByProfile).toHaveBeenCalledWith("user-123", "desc");
    });

    it("should use userId from authenticated user", async () => {
      const mockUser = { ...createMockUser(), id: "different-user-456" };
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventsByProfile.mockResolvedValue([]);

      await handler(mockEvent);

      expect(mockGetEventsByProfile).toHaveBeenCalledWith("different-user-456", "desc");
    });

    it("should return empty array when user has no events", async () => {
      const mockUser = createMockUser();
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventsByProfile.mockResolvedValue([]);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.data).toHaveLength(0);
    });

    it("should handle database errors", async () => {
      const mockUser = createMockUser();
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventsByProfile.mockRejectedValue(new Error("Database error"));

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
      const mockEvents = [createMockEvent("event-1", "Event 1")];
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventsByProfile.mockResolvedValue(mockEvents);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("message", "Events fetched successfully");
      expect(result).toHaveProperty("data");
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("should map all event fields correctly", async () => {
      const mockUser = createMockUser();
      const mockEvents = [createMockEvent("event-1", "Event 1", "https://example.com/logo.png")];
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventsByProfile.mockResolvedValue(mockEvents);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data[0]).toHaveProperty("id", "event-1");
      expect(result.data[0]).toHaveProperty("name", "Event 1");
      expect(result.data[0]).toHaveProperty("logoUrl", "https://example.com/logo.png");
      expect(result.data[0]).toHaveProperty("startDate");
      expect(result.data[0]).toHaveProperty("endDate");
      expect(result.data[0]).toHaveProperty("createdAt");
      expect(result.data[0]).toHaveProperty("updatedAt");
    });

    it("should handle events without logoUrl", async () => {
      const mockUser = createMockUser();
      const mockEvents = [createMockEvent("event-1", "Event 1", null)];
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventsByProfile.mockResolvedValue(mockEvents);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data[0].logoUrl).toBeNull();
    });

    it("should handle multiple events", async () => {
      const mockUser = createMockUser();
      const mockEvents = [
        createMockEvent("event-1", "Event 1"),
        createMockEvent("event-2", "Event 2", "https://example.com/logo2.png"),
        createMockEvent("event-3", "Event 3"),
      ];
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventsByProfile.mockResolvedValue(mockEvents);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data).toHaveLength(3);
      expect(result.data[0].id).toBe("event-1");
      expect(result.data[1].id).toBe("event-2");
      expect(result.data[2].id).toBe("event-3");
    });

    it("should preserve Date objects in mapped response", async () => {
      const mockUser = createMockUser();
      const mockEvents = [createMockEvent("event-1", "Event 1")];
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventsByProfile.mockResolvedValue(mockEvents);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data[0].startDate).toBeInstanceOf(Date);
      expect(result.data[0].endDate).toBeInstanceOf(Date);
      expect(result.data[0].createdAt).toBeInstanceOf(Date);
      expect(result.data[0].updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("Error Handling", () => {
    it("should catch and handle auth errors", async () => {
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
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventsByProfile.mockRejectedValue(new Error("Unexpected error"));

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
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventsByProfile.mockRejectedValue(new Error("Database error"));

      mockHandleApiError.mockReturnValue({
        code: "DATABASE_ERROR",
        message: "Database error",
      } as never);

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.INTERNAL_ERROR);
        throw new Error("Database error");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should handle missing authorization header error", async () => {
      mockGetHeader.mockReturnValue(null);

      mockHandleApiError.mockReturnValue({
        type: "AUTH_ERROR",
        code: "AUTH_ERROR",
        message: "Missing authorization header",
        statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Missing authorization header");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });
  });

  describe("Supabase Integration", () => {
    it("should call createAuthClient", async () => {
      const mockUser = createMockUser();
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventsByProfile.mockResolvedValue([]);

      await handler(mockEvent);

      expect(mockCreateAuthClient).toHaveBeenCalled();
    });

    it("should call getUser with extracted token", async () => {
      const mockUser = createMockUser();
      mockGetHeader.mockReturnValue("Bearer my-secret-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventsByProfile.mockResolvedValue([]);

      await handler(mockEvent);

      expect(mockGetUser).toHaveBeenCalledWith("my-secret-token");
    });
  });

  describe("Different Scenarios", () => {
    it("should handle single event", async () => {
      const mockUser = createMockUser();
      const mockEvents = [createMockEvent("event-1", "My Event")];
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventsByProfile.mockResolvedValue(mockEvents);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe("event-1");
      expect(result.data[0].name).toBe("My Event");
    });

    it("should handle large number of events", async () => {
      const mockUser = createMockUser();
      const mockEvents = Array.from({ length: 50 }, (_, i) =>
        createMockEvent(`event-${i}`, `Event ${i}`),
      );
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventsByProfile.mockResolvedValue(mockEvents);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data).toHaveLength(50);
      expect(result.data[0].id).toBe("event-0");
      expect(result.data[49].id).toBe("event-49");
    });

    it("should handle events with different logoUrl values", async () => {
      const mockUser = createMockUser();
      const mockEvents = [
        createMockEvent("event-1", "Event 1", null),
        createMockEvent("event-2", "Event 2", "https://example.com/logo1.png"),
        createMockEvent("event-3", "Event 3", "https://example.com/logo2.png"),
      ];
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventsByProfile.mockResolvedValue(mockEvents);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data[0].logoUrl).toBeNull();
      expect(result.data[1].logoUrl).toBe("https://example.com/logo1.png");
      expect(result.data[2].logoUrl).toBe("https://example.com/logo2.png");
    });

    it("should handle different user ids", async () => {
      const userIds = ["user-1", "user-2", "user-3"];

      for (const userId of userIds) {
        const mockUser = { ...createMockUser(), id: userId };
        mockGetHeader.mockReturnValue("Bearer valid-token");
        mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
        mockGetEventsByProfile.mockResolvedValue([]);

        await handler(mockEvent);

        expect(mockGetEventsByProfile).toHaveBeenCalledWith(userId, "desc");
      }
    });

    it("should map events maintaining order", async () => {
      const mockUser = createMockUser();
      const mockEvents = [
        createMockEvent("event-3", "Third"),
        createMockEvent("event-2", "Second"),
        createMockEvent("event-1", "First"),
      ];
      mockGetHeader.mockReturnValue("Bearer valid-token");
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetEventsByProfile.mockResolvedValue(mockEvents);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data[0].name).toBe("Third");
      expect(result.data[1].name).toBe("Second");
      expect(result.data[2].name).toBe("First");
    });
  });
});
