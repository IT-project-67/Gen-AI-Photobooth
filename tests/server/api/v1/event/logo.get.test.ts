import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import {
  mockCreateError,
  mockDefineEventHandler,
  mockSetHeader,
  mockGetQuery,
  mockSend,
  mockRequireAuth,
  mockHandleApiError,
  mockCreateAdminClient,
  mockCreateSuccessResponse,
  mockCreateErrorResponse,
  mockGetEventById,
  mockGetStorageBucket,
  mockFrom,
  mockCreateSignedUrl,
  mockDownload,
} from "~/tests/server/mocks/mocks";
import { ERROR_STATUS_MAP } from "~/server/types/core";

(global as unknown as Record<string, unknown>).defineEventHandler = mockDefineEventHandler;
(global as unknown as Record<string, unknown>).getQuery = mockGetQuery;
(global as unknown as Record<string, unknown>).createError = mockCreateError;
(global as unknown as Record<string, unknown>).setHeader = mockSetHeader;
(global as unknown as Record<string, unknown>).send = mockSend;

jest.mock("h3", () => ({
  defineEventHandler: mockDefineEventHandler,
  createError: mockCreateError,
  setHeader: mockSetHeader,
  getQuery: mockGetQuery,
  send: mockSend,
}));

jest.mock("~~/server/clients", () => ({
  createAdminClient: mockCreateAdminClient,
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
    url: string;
    expiresIn: number;
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
});

const createMockEvent = (logoUrl: string | null = "events/logo.png") => ({
  id: "event-123",
  name: "Test Event",
  logoUrl,
  startDate: new Date("2024-01-01T00:00:00Z"),
  endDate: new Date("2024-12-31T23:59:59Z"),
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
});

const createMockBlob = (content = "image data"): Blob => {
  return new Blob([content], { type: "image/jpeg" });
};

describe("API: GET /api/v1/event/logo", () => {
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

    const module = await import("~/server/api/v1/event/logo.get");
    handler = module.default as (event: unknown) => Promise<unknown>;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("Authentication", () => {
    it("should call requireAuth with event", async () => {
      mockRequireAuth.mockRejectedValue(new Error("Unauthorized") as never);

      mockHandleApiError.mockReturnValue({
        code: "UNAUTHORIZED",
        message: "Unauthorized",
        statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Unauthorized");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Unauthorized");
      expect(mockRequireAuth).toHaveBeenCalledWith(mockEvent);
    });

    it("should reject unauthenticated requests", async () => {
      mockRequireAuth.mockRejectedValue(new Error("Authentication required") as never);

      mockHandleApiError.mockReturnValue({
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication required",
        statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Authentication required");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Authentication required");
      expect(mockRequireAuth).toHaveBeenCalled();
    });
  });

  describe("Validation", () => {
    it("should require eventId parameter", async () => {
      const mockUser = createMockUser();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({});

      mockHandleApiError.mockReturnValue({
        type: "VALIDATION_ERROR",
        code: "MISSING_EVENT_ID",
        message: "Missing required field: eventId",
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
      });

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.VALIDATION_ERROR);
        expect(opts.statusMessage).toBe("Missing eventId");
        expect(opts.data.error.code).toBe("MISSING_EVENT_ID");
        throw new Error("Missing eventId");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Missing eventId");
    });

    it("should reject when eventId is empty string", async () => {
      const mockUser = createMockUser();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "" });

      mockHandleApiError.mockReturnValue({
        type: "VALIDATION_ERROR",
        code: "MISSING_EVENT_ID",
        message: "Missing required field: eventId",
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Missing eventId");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Missing eventId");
    });

    it("should reject when eventId is undefined", async () => {
      const mockUser = createMockUser();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: undefined });

      mockHandleApiError.mockReturnValue({
        type: "VALIDATION_ERROR",
        code: "MISSING_EVENT_ID",
        message: "Missing required field: eventId",
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Missing eventId");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });
  });

  describe("Event Verification", () => {
    it("should verify event exists for user", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockBlob = createMockBlob();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockDownload.mockResolvedValue({ data: mockBlob, error: null });

      await handler(mockEvent);

      expect(mockGetEventById).toHaveBeenCalledWith("event-123", "user-123");
    });

    it("should reject when event not found", async () => {
      const mockUser = createMockUser();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "non-existent" });
      mockGetEventById.mockResolvedValue(null);

      mockHandleApiError.mockReturnValue({
        type: "NOT_FOUND",
        code: "EVENT_NOT_FOUND",
        message: "Event not found",
        statusCode: ERROR_STATUS_MAP.NOT_FOUND,
      });

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.NOT_FOUND);
        expect(opts.statusMessage).toBe("Event not found");
        expect(opts.data.error.code).toBe("EVENT_NOT_FOUND");
        throw new Error("Event not found");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Event not found");
    });

    it("should reject when event has no logoUrl", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent(null);
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123" });
      mockGetEventById.mockResolvedValue(mockEventData);

      mockHandleApiError.mockReturnValue({
        type: "NOT_FOUND",
        code: "LOGO_NOT_FOUND",
        message: "Logo not set for this event",
        statusCode: ERROR_STATUS_MAP.NOT_FOUND,
      });

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.NOT_FOUND);
        expect(opts.statusMessage).toBe("Logo not set");
        expect(opts.data.error.code).toBe("LOGO_NOT_FOUND");
        throw new Error("Logo not set");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Logo not set");
    });

    it("should reject when logoUrl is empty string", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent("");
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123" });
      mockGetEventById.mockResolvedValue(mockEventData);

      mockHandleApiError.mockReturnValue({
        type: "NOT_FOUND",
        code: "LOGO_NOT_FOUND",
        message: "Logo not set for this event",
        statusCode: ERROR_STATUS_MAP.NOT_FOUND,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Logo not set");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Logo not set");
    });
  });

  describe("Signed URL Mode", () => {
    it("should return signed URL when mode is signed", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123", mode: "signed" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: "https://signed.url" },
        error: null,
      });

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(mockCreateSignedUrl).toHaveBeenCalledWith("events/logo.png", 600);
      expect(result.success).toBe(true);
      expect(result.message).toBe("Signed URL created successfully");
      expect(result.data.url).toBe("https://signed.url");
      expect(result.data.expiresIn).toBe(600);
    });

    it("should use default expires value of 600 seconds", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123", mode: "signed" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: "https://signed.url" },
        error: null,
      });

      await handler(mockEvent);

      expect(mockCreateSignedUrl).toHaveBeenCalledWith("events/logo.png", 600);
    });

    it("should respect custom expires value", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123", mode: "signed", expires: "1800" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: "https://signed.url" },
        error: null,
      });

      await handler(mockEvent);

      expect(mockCreateSignedUrl).toHaveBeenCalledWith("events/logo.png", 1800);
    });

    it("should enforce minimum expires of 10 seconds", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123", mode: "signed", expires: "5" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: "https://signed.url" },
        error: null,
      });

      await handler(mockEvent);

      expect(mockCreateSignedUrl).toHaveBeenCalledWith("events/logo.png", 10);
    });

    it("should enforce maximum expires of 3600 seconds", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123", mode: "signed", expires: "5000" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: "https://signed.url" },
        error: null,
      });

      await handler(mockEvent);

      expect(mockCreateSignedUrl).toHaveBeenCalledWith("events/logo.png", 3600);
    });

    it("should handle invalid expires value", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123", mode: "signed", expires: "invalid" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: "https://signed.url" },
        error: null,
      });

      await handler(mockEvent);

      expect(mockCreateSignedUrl).toHaveBeenCalledWith("events/logo.png", 600);
    });

    it("should handle signed URL creation error", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123", mode: "signed" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockCreateSignedUrl.mockResolvedValue({
        data: null,
        error: { message: "Failed to create signed URL" },
      });

      mockHandleApiError.mockReturnValue({
        type: "SERVER_ERROR",
        code: "SIGNED_URL_ERROR",
        message: "Failed to create signed URL",
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.INTERNAL_ERROR);
        expect(opts.statusMessage).toBe("Failed to sign URL");
        throw new Error("Failed to sign URL");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Failed to sign URL");
    });

    it("should handle missing signedUrl in response", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123", mode: "signed" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: null } as never,
        error: null,
      });

      mockHandleApiError.mockReturnValue({
        type: "SERVER_ERROR",
        code: "SIGNED_URL_ERROR",
        message: "Failed to create signed URL",
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Failed to sign URL");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Failed to sign URL");
    });

    it("should handle empty data object in signed URL response", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123", mode: "signed" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockCreateSignedUrl.mockResolvedValue({
        data: {} as never,
        error: null,
      });

      mockHandleApiError.mockReturnValue({
        type: "SERVER_ERROR",
        code: "SIGNED_URL_ERROR",
        message: "Failed to create signed URL",
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Failed to sign URL");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Failed to sign URL");
    });

    it("should handle undefined signedUrl in data", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123", mode: "signed" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: undefined } as never,
        error: null,
      });

      mockHandleApiError.mockReturnValue({
        type: "SERVER_ERROR",
        code: "SIGNED_URL_ERROR",
        message: "Failed to create signed URL",
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Failed to sign URL");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Failed to sign URL");
    });

    it("should handle empty string signedUrl in data", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123", mode: "signed" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: "" } as never,
        error: null,
      });

      mockHandleApiError.mockReturnValue({
        type: "SERVER_ERROR",
        code: "SIGNED_URL_ERROR",
        message: "Failed to create signed URL",
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Failed to sign URL");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Failed to sign URL");
    });

    it("should handle undefined data in signed URL response", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123", mode: "signed" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockCreateSignedUrl.mockResolvedValue({
        data: undefined as never,
        error: null,
      });

      mockHandleApiError.mockReturnValue({
        type: "SERVER_ERROR",
        code: "SIGNED_URL_ERROR",
        message: "Failed to create signed URL",
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Failed to sign URL");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Failed to sign URL");
    });
  });

  describe("Blob Mode", () => {
    it("should download and return blob when mode is not signed", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockBlob = createMockBlob();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockDownload.mockResolvedValue({ data: mockBlob, error: null });

      await handler(mockEvent);

      expect(mockDownload).toHaveBeenCalledWith("events/logo.png");
    });

    it("should set correct headers for blob response", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockBlob = createMockBlob();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockDownload.mockResolvedValue({ data: mockBlob, error: null });

      await handler(mockEvent);

      expect(mockSetHeader).toHaveBeenCalledWith(mockEvent, "Content-Type", "image/jpeg");
      expect(mockSetHeader).toHaveBeenCalledWith(mockEvent, "Cache-Control", "private, max-age=60");
      expect(mockSetHeader).toHaveBeenCalledWith(
        mockEvent,
        "Content-Disposition",
        'inline; filename="logo"',
      );
    });

    it("should use default content type when blob type is missing", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockBlob = new Blob(["data"], { type: "" });
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockDownload.mockResolvedValue({ data: mockBlob, error: null });

      await handler(mockEvent);

      expect(mockSetHeader).toHaveBeenCalledWith(
        mockEvent,
        "Content-Type",
        "application/octet-stream",
      );
    });

    it("should convert blob to buffer and send", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockBlob = createMockBlob();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockDownload.mockResolvedValue({ data: mockBlob, error: null });

      await handler(mockEvent);

      expect(mockSend).toHaveBeenCalledWith(mockEvent, expect.any(Buffer));
    });

    it("should handle download error", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockDownload.mockResolvedValue({
        data: null,
        error: { message: "File not found" },
      });

      mockHandleApiError.mockReturnValue({
        type: "NOT_FOUND",
        code: "LOGO_NOT_FOUND",
        message: "Logo file not found in storage",
        statusCode: ERROR_STATUS_MAP.NOT_FOUND,
      });

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.NOT_FOUND);
        expect(opts.statusMessage).toBe("Logo not found");
        throw new Error("Logo not found");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Logo not found");

      expect(consoleErrorSpy).toHaveBeenCalledWith("Logo download error:", {
        message: "File not found",
      });
    });

    it("should handle missing data in download response", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockDownload.mockResolvedValue({ data: null, error: null });

      mockHandleApiError.mockReturnValue({
        type: "NOT_FOUND",
        code: "LOGO_NOT_FOUND",
        message: "Logo file not found in storage",
        statusCode: ERROR_STATUS_MAP.NOT_FOUND,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Logo not found");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Logo not found");
    });
  });

  describe("Storage Integration", () => {
    it("should call createAdminClient", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123", mode: "signed" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: "https://signed.url" },
        error: null,
      });

      await handler(mockEvent);

      expect(mockCreateAdminClient).toHaveBeenCalled();
    });

    it("should call getStorageBucket", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123", mode: "signed" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: "https://signed.url" },
        error: null,
      });

      await handler(mockEvent);

      expect(mockGetStorageBucket).toHaveBeenCalled();
    });

    it("should use correct bucket for storage operations", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123", mode: "signed" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: "https://signed.url" },
        error: null,
      });

      await handler(mockEvent);

      expect(mockFrom).toHaveBeenCalledWith("test-bucket");
    });
  });

  describe("Error Handling", () => {
    it("should catch and handle validation errors", async () => {
      const mockUser = createMockUser();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({});

      mockHandleApiError.mockReturnValue({
        type: "VALIDATION_ERROR",
        code: "MISSING_EVENT_ID",
        message: "Missing required field: eventId",
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Missing eventId");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should use handleApiError for unexpected errors", async () => {
      const mockUser = createMockUser();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123" });
      mockGetEventById.mockRejectedValue(new Error("Database error"));

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
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ eventId: "event-123" });
      mockGetEventById.mockRejectedValue(new Error("Database error"));

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
  });

  describe("Different Scenarios", () => {
    it("should handle different logoUrl paths", async () => {
      const mockUser = createMockUser();
      const logoPaths = [
        "events/logo1.png",
        "events/logos/event-logo.jpg",
        "public/images/logo.png",
      ];

      for (const logoPath of logoPaths) {
        const mockEventData = createMockEvent(logoPath);
        mockRequireAuth.mockResolvedValue(mockUser as never);
        mockGetQuery.mockReturnValue({ eventId: "event-123", mode: "signed" });
        mockGetEventById.mockResolvedValue(mockEventData);
        mockCreateSignedUrl.mockResolvedValue({
          data: { signedUrl: `https://signed.url/${logoPath}` },
          error: null,
        });

        await handler(mockEvent);

        expect(mockCreateSignedUrl).toHaveBeenCalledWith(logoPath, 600);
      }
    });

    it("should handle different blob types", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const blobTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

      for (const blobType of blobTypes) {
        const mockBlob = new Blob(["data"], { type: blobType });
        mockRequireAuth.mockResolvedValue(mockUser as never);
        mockGetQuery.mockReturnValue({ eventId: "event-123" });
        mockGetEventById.mockResolvedValue(mockEventData);
        mockDownload.mockResolvedValue({ data: mockBlob, error: null });

        await handler(mockEvent);

        expect(mockSetHeader).toHaveBeenCalledWith(mockEvent, "Content-Type", blobType);
      }
    });

    it("should handle different user and event combinations", async () => {
      const mockEventData = createMockEvent();
      const combinations = [
        { userId: "user-1", eventId: "event-1" },
        { userId: "user-2", eventId: "event-2" },
        { userId: "user-3", eventId: "event-3" },
      ];

      for (const combo of combinations) {
        const mockUser = { ...createMockUser(), id: combo.userId };
        mockRequireAuth.mockResolvedValue(mockUser as never);
        mockGetQuery.mockReturnValue({ eventId: combo.eventId, mode: "signed" });
        mockGetEventById.mockResolvedValue(mockEventData);
        mockCreateSignedUrl.mockResolvedValue({
          data: { signedUrl: "https://signed.url" },
          error: null,
        });

        await handler(mockEvent);

        expect(mockGetEventById).toHaveBeenCalledWith(combo.eventId, combo.userId);
      }
    });
  });
});
