import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import {
  mockCreateError,
  mockDefineEventHandler,
  mockReadMultipartFormData,
  mockRequireAuth,
  mockHandleApiError,
  mockCreateAdminClient,
  mockCreateSuccessResponse,
  mockCreateErrorResponse,
  mockGetEventById,
  mockUpdateEventLogoUrl,
  mockNormalizeFilePart,
  mockValidateFileOrThrow,
  mockUploadLogo,
  mockConfig,
} from "~/tests/server/mocks/mocks";
import { ERROR_STATUS_MAP } from "~/server/types/core";

jest.mock("h3", () => ({
  defineEventHandler: mockDefineEventHandler,
  createError: mockCreateError,
  readMultipartFormData: mockReadMultipartFormData,
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
  updateEventLogoUrl: mockUpdateEventLogoUrl,
}));

jest.mock("~~/server/utils/storage/validation.utils", () => ({
  normalizeFilePart: mockNormalizeFilePart,
  validateFileOrThrow: mockValidateFileOrThrow,
}));

jest.mock("~~/server/utils/storage", () => ({
  uploadLogo: mockUploadLogo,
}));

jest.mock("~~/server/config", () => ({
  config: mockConfig,
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
    eventId: string;
    logoUrl: string;
    fileInfo: {
      name: string;
      type: string;
      size: number;
    };
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

const createMockEvent = () => ({
  id: "event-123",
  name: "Test Event",
  logoUrl: null,
  startDate: new Date("2024-01-01T00:00:00Z"),
  endDate: new Date("2024-12-31T23:59:59Z"),
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
});

const createMockFilePart = (overrides = {}) => ({
  name: "logo",
  filename: "test-logo.png",
  type: "image/png",
  data: Buffer.from("test image data"),
  ...overrides,
});

const createMockFile = (overrides = {}) => ({
  name: "test-logo.png",
  type: "image/png",
  data: Buffer.from("test image data"),
  size: 1024,
  ...overrides,
});

describe("API: POST /api/v1/event/logo", () => {
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

    const module = await import("~/server/api/v1/event/logo.post");
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

    it("should proceed with valid authentication", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockFilePart = createMockFilePart();
      const mockFile = createMockFile();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "event-123" },
        mockFilePart,
      ] as never);
      mockNormalizeFilePart.mockReturnValue(mockFile);
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockUploadLogo.mockResolvedValue({ path: "logos/test-logo.png" });
      mockUpdateEventLogoUrl.mockResolvedValue(mockEventData);

      await handler(mockEvent);

      expect(mockRequireAuth).toHaveBeenCalledWith(mockEvent);
    });
  });

  describe("Form Data Validation", () => {
    it("should require form data", async () => {
      const mockUser = createMockUser();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue(null);

      mockHandleApiError.mockReturnValue({
        type: "VALIDATION_ERROR",
        code: "MISSING_FORM_DATA",
        message: "No form data provided",
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
      });

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.VALIDATION_ERROR);
        expect(opts.statusMessage).toBe("No form data");
        expect(opts.data.error.code).toBe("MISSING_FORM_DATA");
        throw new Error("No form data");
      });

      await expect(handler(mockEvent)).rejects.toThrow("No form data");
    });

    it("should require eventId field", async () => {
      const mockUser = createMockUser();
      const mockFilePart = createMockFilePart();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([mockFilePart] as never);

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

    it("should reject empty eventId", async () => {
      const mockUser = createMockUser();
      const mockFilePart = createMockFilePart();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "" },
        mockFilePart,
      ] as never);

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

    it("should parse eventId from string data", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockFilePart = createMockFilePart();
      const mockFile = createMockFile();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "event-123" },
        mockFilePart,
      ] as never);
      mockNormalizeFilePart.mockReturnValue(mockFile);
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockUploadLogo.mockResolvedValue({ path: "logos/test-logo.png" });
      mockUpdateEventLogoUrl.mockResolvedValue(mockEventData);

      await handler(mockEvent);

      expect(mockGetEventById).toHaveBeenCalledWith("event-123", "user-123");
    });

    it("should parse eventId from Buffer data", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockFilePart = createMockFilePart();
      const mockFile = createMockFile();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: Buffer.from("event-456") },
        mockFilePart,
      ] as never);
      mockNormalizeFilePart.mockReturnValue(mockFile);
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockUploadLogo.mockResolvedValue({ path: "logos/test-logo.png" });
      mockUpdateEventLogoUrl.mockResolvedValue(mockEventData);

      await handler(mockEvent);

      expect(mockGetEventById).toHaveBeenCalledWith("event-456", "user-123");
    });

    it("should convert non-string eventId to string", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockFilePart = createMockFilePart();
      const mockFile = createMockFile();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: 12345 as never },
        mockFilePart,
      ] as never);
      mockNormalizeFilePart.mockReturnValue(mockFile);
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockUploadLogo.mockResolvedValue({ path: "logos/test-logo.png" });
      mockUpdateEventLogoUrl.mockResolvedValue(mockEventData);

      await handler(mockEvent);

      expect(mockGetEventById).toHaveBeenCalledWith("12345", "user-123");
    });

    it("should require logo file field", async () => {
      const mockUser = createMockUser();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "event-123" },
      ] as never);

      mockHandleApiError.mockReturnValue({
        type: "VALIDATION_ERROR",
        code: "MISSING_LOGO_FILE",
        message: "No logo file provided",
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
      });

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.VALIDATION_ERROR);
        expect(opts.statusMessage).toBe("No logo file");
        expect(opts.data.error.code).toBe("MISSING_LOGO_FILE");
        throw new Error("No logo file");
      });

      await expect(handler(mockEvent)).rejects.toThrow("No logo file");
    });

    it("should reject logo field without filename", async () => {
      const mockUser = createMockUser();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "event-123" },
        { name: "logo", data: Buffer.from("test") },
      ] as never);

      mockHandleApiError.mockReturnValue({
        type: "VALIDATION_ERROR",
        code: "MISSING_LOGO_FILE",
        message: "No logo file provided",
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("No logo file");
      });

      await expect(handler(mockEvent)).rejects.toThrow("No logo file");
    });

    it("should reject logo field without data", async () => {
      const mockUser = createMockUser();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "event-123" },
        { name: "logo", filename: "test.png" },
      ] as never);

      mockHandleApiError.mockReturnValue({
        type: "VALIDATION_ERROR",
        code: "MISSING_LOGO_FILE",
        message: "No logo file provided",
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("No logo file");
      });

      await expect(handler(mockEvent)).rejects.toThrow("No logo file");
    });

    it("should reject logo field with empty data", async () => {
      const mockUser = createMockUser();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "event-123" },
        { name: "logo", filename: "test.png", data: Buffer.from("") },
      ] as never);

      mockHandleApiError.mockReturnValue({
        type: "VALIDATION_ERROR",
        code: "MISSING_LOGO_FILE",
        message: "No logo file provided",
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("No logo file");
      });

      await expect(handler(mockEvent)).rejects.toThrow("No logo file");
    });

    it("should accept valid form with eventId and logo", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockFilePart = createMockFilePart();
      const mockFile = createMockFile();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "event-123" },
        mockFilePart,
      ] as never);
      mockNormalizeFilePart.mockReturnValue(mockFile);
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockUploadLogo.mockResolvedValue({ path: "logos/test-logo.png" });
      mockUpdateEventLogoUrl.mockResolvedValue(mockEventData);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.success).toBe(true);
    });
  });

  describe("File Validation", () => {
    it("should normalize file part", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockFilePart = createMockFilePart();
      const mockFile = createMockFile();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "event-123" },
        mockFilePart,
      ] as never);
      mockNormalizeFilePart.mockReturnValue(mockFile);
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockUploadLogo.mockResolvedValue({ path: "logos/test-logo.png" });
      mockUpdateEventLogoUrl.mockResolvedValue(mockEventData);

      await handler(mockEvent);

      expect(mockNormalizeFilePart).toHaveBeenCalledWith(mockFilePart);
    });

    it("should reject when normalization returns null", async () => {
      const mockUser = createMockUser();
      const mockFilePart = createMockFilePart();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "event-123" },
        mockFilePart,
      ] as never);
      mockNormalizeFilePart.mockReturnValue(null);

      mockHandleApiError.mockReturnValue({
        type: "VALIDATION_ERROR",
        code: "INVALID_FILE_DATA",
        message: "Invalid file data provided",
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
      });

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.VALIDATION_ERROR);
        expect(opts.statusMessage).toBe("Invalid file data");
        expect(opts.data.error.code).toBe("INVALID_FILE_DATA");
        throw new Error("Invalid file data");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Invalid file data");
    });

    it("should validate file", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockFilePart = createMockFilePart();
      const mockFile = createMockFile();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "event-123" },
        mockFilePart,
      ] as never);
      mockNormalizeFilePart.mockReturnValue(mockFile);
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockUploadLogo.mockResolvedValue({ path: "logos/test-logo.png" });
      mockUpdateEventLogoUrl.mockResolvedValue(mockEventData);

      await handler(mockEvent);

      expect(mockValidateFileOrThrow).toHaveBeenCalledWith(mockFile);
    });

    it("should handle validation errors from validateFileOrThrow", async () => {
      const mockUser = createMockUser();
      const mockFilePart = createMockFilePart();
      const mockFile = createMockFile();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "event-123" },
        mockFilePart,
      ] as never);
      mockNormalizeFilePart.mockReturnValue(mockFile);
      mockValidateFileOrThrow.mockImplementation(() => {
        throw {
          statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
          statusMessage: "File too large",
          data: {
            error: {
              type: "VALIDATION_ERROR",
              code: "FILE_TOO_LARGE",
              message: "File too large. Maximum size is 5MB",
            },
          },
        };
      });

      mockHandleApiError.mockReturnValue({
        type: "VALIDATION_ERROR",
        code: "FILE_TOO_LARGE",
        message: "File too large. Maximum size is 5MB",
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("File too large");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should reject invalid file extension", async () => {
      const mockUser = createMockUser();
      const mockFilePart = createMockFilePart({ filename: "test.exe" });
      const mockFile = createMockFile({ name: "test.exe" });

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "event-123" },
        mockFilePart,
      ] as never);
      mockNormalizeFilePart.mockReturnValue(mockFile);
      mockValidateFileOrThrow.mockImplementation(() => {
        throw {
          statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
          statusMessage: "Invalid file extension",
          data: {
            error: {
              type: "VALIDATION_ERROR",
              code: "INVALID_FILE_EXTENSION",
              message: "Invalid file extension. Allowed: jpg, jpeg, png, gif, webp",
            },
          },
        };
      });

      mockHandleApiError.mockReturnValue({
        type: "VALIDATION_ERROR",
        code: "INVALID_FILE_EXTENSION",
        message: "Invalid file extension. Allowed: jpg, jpeg, png, gif, webp",
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Invalid file extension");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should reject invalid MIME type", async () => {
      const mockUser = createMockUser();
      const mockFilePart = createMockFilePart({ type: "application/pdf" });
      const mockFile = createMockFile({ type: "application/pdf" });

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "event-123" },
        mockFilePart,
      ] as never);
      mockNormalizeFilePart.mockReturnValue(mockFile);
      mockValidateFileOrThrow.mockImplementation(() => {
        throw {
          statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
          statusMessage: "Invalid file type",
          data: {
            error: {
              type: "VALIDATION_ERROR",
              code: "INVALID_FILE_TYPE",
              message: "Invalid file type. Allowed: image/jpeg, image/png, image/gif, image/webp",
            },
          },
        };
      });

      mockHandleApiError.mockReturnValue({
        type: "VALIDATION_ERROR",
        code: "INVALID_FILE_TYPE",
        message: "Invalid file type. Allowed: image/jpeg, image/png, image/gif, image/webp",
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Invalid file type");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });
  });

  describe("Event Verification", () => {
    it("should verify event exists", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockFilePart = createMockFilePart();
      const mockFile = createMockFile();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "event-123" },
        mockFilePart,
      ] as never);
      mockNormalizeFilePart.mockReturnValue(mockFile);
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockUploadLogo.mockResolvedValue({ path: "logos/test-logo.png" });
      mockUpdateEventLogoUrl.mockResolvedValue(mockEventData);

      await handler(mockEvent);

      expect(mockGetEventById).toHaveBeenCalledWith("event-123", "user-123");
    });

    it("should use userId from authenticated user", async () => {
      const mockUser = { ...createMockUser(), id: "different-user-456" };
      const mockEventData = createMockEvent();
      const mockFilePart = createMockFilePart();
      const mockFile = createMockFile();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "event-999" },
        mockFilePart,
      ] as never);
      mockNormalizeFilePart.mockReturnValue(mockFile);
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockUploadLogo.mockResolvedValue({ path: "logos/test-logo.png" });
      mockUpdateEventLogoUrl.mockResolvedValue(mockEventData);

      await handler(mockEvent);

      expect(mockGetEventById).toHaveBeenCalledWith("event-999", "different-user-456");
    });

    it("should reject when event not found", async () => {
      const mockUser = createMockUser();
      const mockFilePart = createMockFilePart();
      const mockFile = createMockFile();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "non-existent" },
        mockFilePart,
      ] as never);
      mockNormalizeFilePart.mockReturnValue(mockFile);
      mockValidateFileOrThrow.mockReturnValue(undefined);
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

    it("should handle database errors when fetching event", async () => {
      const mockUser = createMockUser();
      const mockFilePart = createMockFilePart();
      const mockFile = createMockFile();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "event-123" },
        mockFilePart,
      ] as never);
      mockNormalizeFilePart.mockReturnValue(mockFile);
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockRejectedValue(new Error("Database connection error"));

      mockHandleApiError.mockReturnValue({
        code: "DATABASE_ERROR",
        message: "Database connection error",
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Database connection error");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });
  });

  describe("Upload Process", () => {
    it("should call uploadLogo with correct parameters", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockFilePart = createMockFilePart();
      const mockFile = createMockFile();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "event-123" },
        mockFilePart,
      ] as never);
      mockNormalizeFilePart.mockReturnValue(mockFile);
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockUploadLogo.mockResolvedValue({ path: "logos/test-logo.png" });
      mockUpdateEventLogoUrl.mockResolvedValue(mockEventData);

      await handler(mockEvent);

      expect(mockUploadLogo).toHaveBeenCalledWith(
        expect.anything(), // supabase client
        mockFile,
        "user-123",
        "event-123",
        "https://test.supabase.co",
        "test-bucket",
      );
    });

    it("should use runtime config for supabase URL", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockFilePart = createMockFilePart();
      const mockFile = createMockFile();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "event-123" },
        mockFilePart,
      ] as never);
      mockNormalizeFilePart.mockReturnValue(mockFile);
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockUploadLogo.mockResolvedValue({ path: "logos/test-logo.png" });
      mockUpdateEventLogoUrl.mockResolvedValue(mockEventData);

      await handler(mockEvent);

      // useRuntimeConfig is set globally in jest.setup.ts, so we check the uploadLogo call parameters
      expect(mockUploadLogo).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        "https://test.supabase.co", // This comes from the global useRuntimeConfig mock
        expect.anything(),
      );
    });

    it("should use config for storage bucket", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockFilePart = createMockFilePart();
      const mockFile = createMockFile();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "event-123" },
        mockFilePart,
      ] as never);
      mockNormalizeFilePart.mockReturnValue(mockFile);
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockUploadLogo.mockResolvedValue({ path: "logos/test-logo.png" });
      mockUpdateEventLogoUrl.mockResolvedValue(mockEventData);

      await handler(mockEvent);

      expect(mockConfig).toHaveBeenCalled();
      expect(mockUploadLogo).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        "test-bucket",
      );
    });

    it("should handle upload errors", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockFilePart = createMockFilePart();
      const mockFile = createMockFile();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "event-123" },
        mockFilePart,
      ] as never);
      mockNormalizeFilePart.mockReturnValue(mockFile);
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockUploadLogo.mockRejectedValue(new Error("Upload failed"));

      mockHandleApiError.mockReturnValue({
        code: "UPLOAD_ERROR",
        message: "Upload failed",
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Upload failed");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Upload failed");

      expect(consoleErrorSpy).toHaveBeenCalledWith("Upload error:", expect.any(Error));
    });

    it("should update event logo URL after successful upload", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockFilePart = createMockFilePart();
      const mockFile = createMockFile();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "event-123" },
        mockFilePart,
      ] as never);
      mockNormalizeFilePart.mockReturnValue(mockFile);
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockUploadLogo.mockResolvedValue({ path: "logos/user-123/event-123/test-logo.png" });
      mockUpdateEventLogoUrl.mockResolvedValue(mockEventData);

      await handler(mockEvent);

      expect(mockUpdateEventLogoUrl).toHaveBeenCalledWith(
        "event-123",
        "logos/user-123/event-123/test-logo.png",
      );
    });

    it("should handle updateEventLogoUrl errors", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockFilePart = createMockFilePart();
      const mockFile = createMockFile();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "event-123" },
        mockFilePart,
      ] as never);
      mockNormalizeFilePart.mockReturnValue(mockFile);
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockUploadLogo.mockResolvedValue({ path: "logos/test-logo.png" });
      mockUpdateEventLogoUrl.mockRejectedValue(new Error("Database update failed"));

      mockHandleApiError.mockReturnValue({
        code: "DATABASE_ERROR",
        message: "Database update failed",
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Database update failed");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });
  });

  describe("Response Structure", () => {
    it("should return success response with correct structure", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockFilePart = createMockFilePart();
      const mockFile = createMockFile();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "event-123" },
        mockFilePart,
      ] as never);
      mockNormalizeFilePart.mockReturnValue(mockFile);
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockUploadLogo.mockResolvedValue({ path: "logos/test-logo.png" });
      mockUpdateEventLogoUrl.mockResolvedValue(mockEventData);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("message", "Logo uploaded successfully");
      expect(result).toHaveProperty("data");
    });

    it("should include eventId in response", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockFilePart = createMockFilePart();
      const mockFile = createMockFile();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "event-456" },
        mockFilePart,
      ] as never);
      mockNormalizeFilePart.mockReturnValue(mockFile);
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockUploadLogo.mockResolvedValue({ path: "logos/test-logo.png" });
      mockUpdateEventLogoUrl.mockResolvedValue(mockEventData);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.eventId).toBe("event-456");
    });

    it("should include logoUrl in response", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockFilePart = createMockFilePart();
      const mockFile = createMockFile();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "event-123" },
        mockFilePart,
      ] as never);
      mockNormalizeFilePart.mockReturnValue(mockFile);
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockUploadLogo.mockResolvedValue({ path: "logos/custom-path/logo.png" });
      mockUpdateEventLogoUrl.mockResolvedValue(mockEventData);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.logoUrl).toBe("logos/custom-path/logo.png");
    });

    it("should include fileInfo with name, type, and size", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockFilePart = createMockFilePart();
      const mockFile = createMockFile({ name: "company-logo.jpg", type: "image/jpeg", size: 2048 });

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "event-123" },
        mockFilePart,
      ] as never);
      mockNormalizeFilePart.mockReturnValue(mockFile);
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockUploadLogo.mockResolvedValue({ path: "logos/test-logo.png" });
      mockUpdateEventLogoUrl.mockResolvedValue(mockEventData);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.fileInfo).toEqual({
        name: "company-logo.jpg",
        type: "image/jpeg",
        size: 2048,
      });
    });

    it("should return correct message", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockFilePart = createMockFilePart();
      const mockFile = createMockFile();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "event-123" },
        mockFilePart,
      ] as never);
      mockNormalizeFilePart.mockReturnValue(mockFile);
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockUploadLogo.mockResolvedValue({ path: "logos/test-logo.png" });
      mockUpdateEventLogoUrl.mockResolvedValue(mockEventData);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.message).toBe("Logo uploaded successfully");
    });
  });

  describe("Error Handling", () => {
    it("should catch and handle validation errors", async () => {
      const mockUser = createMockUser();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue(null);

      mockHandleApiError.mockReturnValue({
        type: "VALIDATION_ERROR",
        code: "MISSING_FORM_DATA",
        message: "No form data provided",
        statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("No form data");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should catch and handle auth errors", async () => {
      mockRequireAuth.mockRejectedValue(new Error("Unauthorized") as never);

      mockHandleApiError.mockReturnValue({
        code: "UNAUTHORIZED",
        message: "Unauthorized",
        statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw new Error("Unauthorized");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should use handleApiError for unexpected errors", async () => {
      mockRequireAuth.mockRejectedValue(new Error("Unexpected error") as never);

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
      mockReadMultipartFormData.mockRejectedValue(new Error("Form parse error"));

      mockHandleApiError.mockReturnValue({
        code: "PARSE_ERROR",
        message: "Form parse error",
      } as never);

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.INTERNAL_ERROR);
        throw new Error("Form parse error");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should log upload errors to console", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockFilePart = createMockFilePart();
      const mockFile = createMockFile();
      const uploadError = new Error("Storage service unavailable");

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "event-123" },
        mockFilePart,
      ] as never);
      mockNormalizeFilePart.mockReturnValue(mockFile);
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockUploadLogo.mockRejectedValue(uploadError);

      mockHandleApiError.mockReturnValue({
        code: "STORAGE_ERROR",
        message: "Storage service unavailable",
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });

      mockCreateError.mockImplementation(() => {
        throw uploadError;
      });

      await expect(handler(mockEvent)).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith("Upload error:", uploadError);
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle complete successful flow", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockFilePart = createMockFilePart({
        filename: "company-logo.png",
        type: "image/png",
        data: Buffer.from("PNG image data"),
      });
      const mockFile = createMockFile({
        name: "company-logo.png",
        type: "image/png",
        size: 5120,
        data: Buffer.from("PNG image data"),
      });

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "event-789" },
        mockFilePart,
      ] as never);
      mockNormalizeFilePart.mockReturnValue(mockFile);
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockUploadLogo.mockResolvedValue({ path: "logos/user-123/event-789/company-logo.png" });
      mockUpdateEventLogoUrl.mockResolvedValue(mockEventData);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.success).toBe(true);
      expect(result.message).toBe("Logo uploaded successfully");
      expect(result.data.eventId).toBe("event-789");
      expect(result.data.logoUrl).toBe("logos/user-123/event-789/company-logo.png");
      expect(result.data.fileInfo).toEqual({
        name: "company-logo.png",
        type: "image/png",
        size: 5120,
      });
    });

    it("should handle different file types", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const fileTypes = [
        { filename: "logo.jpg", type: "image/jpeg" },
        { filename: "logo.png", type: "image/png" },
        { filename: "logo.gif", type: "image/gif" },
        { filename: "logo.webp", type: "image/webp" },
      ];

      for (const fileType of fileTypes) {
        const mockFilePart = createMockFilePart(fileType);
        const mockFile = createMockFile({ name: fileType.filename, type: fileType.type });

        mockRequireAuth.mockResolvedValue(mockUser as never);
        mockReadMultipartFormData.mockResolvedValue([
          { name: "eventId", data: "event-123" },
          mockFilePart,
        ] as never);
        mockNormalizeFilePart.mockReturnValue(mockFile);
        mockValidateFileOrThrow.mockReturnValue(undefined);
        mockGetEventById.mockResolvedValue(mockEventData);
        mockUploadLogo.mockResolvedValue({ path: `logos/${fileType.filename}` });
        mockUpdateEventLogoUrl.mockResolvedValue(mockEventData);

        const result = (await handler(mockEvent)) as SuccessResponse;

        expect(result.data.fileInfo.name).toBe(fileType.filename);
        expect(result.data.fileInfo.type).toBe(fileType.type);
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
        const mockFilePart = createMockFilePart();
        const mockFile = createMockFile();

        mockRequireAuth.mockResolvedValue(mockUser as never);
        mockReadMultipartFormData.mockResolvedValue([
          { name: "eventId", data: combo.eventId },
          mockFilePart,
        ] as never);
        mockNormalizeFilePart.mockReturnValue(mockFile);
        mockValidateFileOrThrow.mockReturnValue(undefined);
        mockGetEventById.mockResolvedValue(mockEventData);
        mockUploadLogo.mockResolvedValue({
          path: `logos/${combo.userId}/${combo.eventId}/logo.png`,
        });
        mockUpdateEventLogoUrl.mockResolvedValue(mockEventData);

        await handler(mockEvent);

        expect(mockGetEventById).toHaveBeenCalledWith(combo.eventId, combo.userId);
        expect(mockUploadLogo).toHaveBeenCalledWith(
          expect.anything(),
          mockFile,
          combo.userId,
          combo.eventId,
          expect.anything(),
          expect.anything(),
        );
      }
    });
  });

  describe("Storage Client", () => {
    it("should call createAdminClient", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockFilePart = createMockFilePart();
      const mockFile = createMockFile();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "event-123" },
        mockFilePart,
      ] as never);
      mockNormalizeFilePart.mockReturnValue(mockFile);
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockUploadLogo.mockResolvedValue({ path: "logos/test-logo.png" });
      mockUpdateEventLogoUrl.mockResolvedValue(mockEventData);

      await handler(mockEvent);

      expect(mockCreateAdminClient).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle eventId with special characters", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockFilePart = createMockFilePart();
      const mockFile = createMockFile();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "event-with-special-chars_123-456" },
        mockFilePart,
      ] as never);
      mockNormalizeFilePart.mockReturnValue(mockFile);
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockUploadLogo.mockResolvedValue({ path: "logos/test-logo.png" });
      mockUpdateEventLogoUrl.mockResolvedValue(mockEventData);

      await handler(mockEvent);

      expect(mockGetEventById).toHaveBeenCalledWith("event-with-special-chars_123-456", "user-123");
    });

    it("should handle large file sizes", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockFilePart = createMockFilePart();
      const mockFile = createMockFile({ size: 5 * 1024 * 1024 });

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "event-123" },
        mockFilePart,
      ] as never);
      mockNormalizeFilePart.mockReturnValue(mockFile);
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockUploadLogo.mockResolvedValue({ path: "logos/test-logo.png" });
      mockUpdateEventLogoUrl.mockResolvedValue(mockEventData);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.fileInfo.size).toBe(5 * 1024 * 1024);
    });

    it("should handle filenames with unicode characters", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockFilePart = createMockFilePart({ filename: "logo-chinese.png" });
      const mockFile = createMockFile({ name: "logo-chinese.png" });

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: "event-123" },
        mockFilePart,
      ] as never);
      mockNormalizeFilePart.mockReturnValue(mockFile);
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockUploadLogo.mockResolvedValue({ path: "logos/test-logo.png" });
      mockUpdateEventLogoUrl.mockResolvedValue(mockEventData);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.data.fileInfo.name).toBe("logo-chinese.png");
    });

    it("should handle multiple form fields", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockFilePart = createMockFilePart();
      const mockFile = createMockFile();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "other_field", data: "some_value" },
        { name: "eventId", data: "event-123" },
        { name: "another_field", data: "another_value" },
        mockFilePart,
        { name: "extra_field", data: "extra_value" },
      ] as never);
      mockNormalizeFilePart.mockReturnValue(mockFile);
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockUploadLogo.mockResolvedValue({ path: "logos/test-logo.png" });
      mockUpdateEventLogoUrl.mockResolvedValue(mockEventData);

      const result = (await handler(mockEvent)) as SuccessResponse;

      expect(result.success).toBe(true);
    });
  });
});
