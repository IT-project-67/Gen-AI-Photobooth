import { describe, it, expect, beforeAll, beforeEach, jest } from "@jest/globals";
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
  mockGetPhotoSessionById,
  mockUpdatePhotoSessionPhotoUrl,
  mockNormalizeFilePart,
  mockValidateFileOrThrow,
  mockUploadPhoto,
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
  getPhotoSessionById: mockGetPhotoSessionById,
  updatePhotoSessionPhotoUrl: mockUpdatePhotoSessionPhotoUrl,
}));

jest.mock("~~/server/utils/storage/validation.utils", () => ({
  normalizeFilePart: mockNormalizeFilePart,
  validateFileOrThrow: mockValidateFileOrThrow,
}));

jest.mock("~~/server/utils/storage", () => ({
  uploadPhoto: mockUploadPhoto,
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

type FilePart = {
  name?: string;
  filename?: string;
  type?: string;
  data: Buffer;
};

describe("API: POST /api/v1/session/photo", () => {
  let handler: (event: unknown) => Promise<unknown>;
  let mockEvent: MockEvent;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeAll(async () => {
    const module = await import("~/server/api/v1/session/photo.post");
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

    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    mockCreateAdminClient.mockReturnValue({
      storage: {
        from: jest.fn().mockReturnValue({
          upload: jest.fn(),
        }),
      },
      auth: {
        getUser: jest.fn(),
      },
    } as never);

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

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("Authentication", () => {
    it("should call requireAuth", async () => {
      mockRequireAuth.mockRejectedValue(new Error("Unauthorized") as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: Buffer.from("event-123") },
      ]);

      await expect(handler(mockEvent)).rejects.toThrow();

      expect(mockRequireAuth).toHaveBeenCalledWith(mockEvent);
    });

    it("should reject unauthenticated requests", async () => {
      mockRequireAuth.mockRejectedValue(new Error("Unauthorized") as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: Buffer.from("event-123") },
      ]);

      mockHandleApiError.mockReturnValue({
        type: "AUTH_ERROR",
        code: "AUTH_ERROR",
        message: "Unauthorized",
        statusCode: ERROR_STATUS_MAP.AUTH_ERROR,
      });

      await expect(handler(mockEvent)).rejects.toThrow("Unauthorized");
    });
  });

  describe("Form Data Validation", () => {
    const createMockUser = () => ({
      id: "user-123",
      email: "test@example.com",
    });

    it("should require form data", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue(null);

      await expect(handler(mockEvent)).rejects.toThrow("No form data provided");

      expect(mockCreateError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
          statusMessage: "No form data provided",
        }),
      );
    });

    it("should reject empty form data", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([]);

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should require eventId field", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "sessionId", data: Buffer.from("session-123") },
      ]);

      await expect(handler(mockEvent)).rejects.toThrow("Event ID is required");
    });

    it("should require sessionId field", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: Buffer.from("event-123") },
      ]);

      await expect(handler(mockEvent)).rejects.toThrow("Session ID is required");
    });

    it("should require photoFile field", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
      ]);

      await expect(handler(mockEvent)).rejects.toThrow("Photo file is required");
    });

    it("should read multipart form data", async () => {
      const mockUser = createMockUser();
      const mockEvent = {
        id: "event-123",
        name: "Test Event",
        profileId: "user-123",
        logoUrl: null,
        startDate: new Date(),
        endDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockSession = {
        id: "session-123",
        eventId: "event-123",
        photoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
        { name: "photoFile", filename: "test.jpg", type: "image/jpeg", data: Buffer.from("test") },
      ]);
      mockNormalizeFilePart.mockReturnValue({
        name: "test.jpg",
        type: "image/jpeg",
        size: 4,
        data: Buffer.from("test"),
      });
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEvent);
      mockGetPhotoSessionById.mockResolvedValue(mockSession);
      mockUploadPhoto.mockResolvedValue({ path: "photos/test.jpg" });
      mockUpdatePhotoSessionPhotoUrl.mockResolvedValue(undefined);

      await handler(mockEvent);

      expect(mockReadMultipartFormData).toHaveBeenCalledWith(mockEvent);
    });
  });

  describe("File Validation", () => {
    const createMockUser = () => ({
      id: "user-123",
      email: "test@example.com",
    });

    it("should validate file normalization", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
        { name: "photoFile", filename: "test.jpg", type: "image/jpeg", data: Buffer.from("test") },
      ]);
      mockNormalizeFilePart.mockReturnValue(null);

      await expect(handler(mockEvent)).rejects.toThrow("Invalid photo file");
    });

    it("should call normalizeFilePart", async () => {
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
      const mockSession = {
        id: "session-123",
        eventId: "event-123",
        photoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const photoFilePart: FilePart = {
        name: "photoFile",
        filename: "test.jpg",
        type: "image/jpeg",
        data: Buffer.from("test"),
      };

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
        photoFilePart,
      ]);
      mockNormalizeFilePart.mockReturnValue({
        name: "test.jpg",
        type: "image/jpeg",
        size: 4,
        data: Buffer.from("test"),
      });
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetPhotoSessionById.mockResolvedValue(mockSession);
      mockUploadPhoto.mockResolvedValue({ path: "photos/test.jpg" });
      mockUpdatePhotoSessionPhotoUrl.mockResolvedValue(undefined);

      await handler(mockEvent);

      expect(mockNormalizeFilePart).toHaveBeenCalledWith(photoFilePart);
    });

    it("should call validateFileOrThrow", async () => {
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
      const mockSession = {
        id: "session-123",
        eventId: "event-123",
        photoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const normalizedFile = {
        name: "test.jpg",
        type: "image/jpeg",
        size: 4,
        data: Buffer.from("test"),
      };

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
        { name: "photoFile", filename: "test.jpg", type: "image/jpeg", data: Buffer.from("test") },
      ]);
      mockNormalizeFilePart.mockReturnValue(normalizedFile);
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetPhotoSessionById.mockResolvedValue(mockSession);
      mockUploadPhoto.mockResolvedValue({ path: "photos/test.jpg" });
      mockUpdatePhotoSessionPhotoUrl.mockResolvedValue(undefined);

      await handler(mockEvent);

      expect(mockValidateFileOrThrow).toHaveBeenCalledWith(normalizedFile);
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
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
        { name: "photoFile", filename: "test.jpg", type: "image/jpeg", data: Buffer.from("test") },
      ]);
      mockNormalizeFilePart.mockReturnValue({
        name: "test.jpg",
        type: "image/jpeg",
        size: 4,
        data: Buffer.from("test"),
      });
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(null);

      await expect(handler(mockEvent)).rejects.toThrow("Event not found");
    });

    it("should call getEventById with correct parameters", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
        { name: "photoFile", filename: "test.jpg", type: "image/jpeg", data: Buffer.from("test") },
      ]);
      mockNormalizeFilePart.mockReturnValue({
        name: "test.jpg",
        type: "image/jpeg",
        size: 4,
        data: Buffer.from("test"),
      });
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(null);

      await expect(handler(mockEvent)).rejects.toThrow();

      expect(mockGetEventById).toHaveBeenCalledWith("event-123", "user-123");
    });
  });

  describe("Session Verification", () => {
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

    it("should verify session exists", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
        { name: "photoFile", filename: "test.jpg", type: "image/jpeg", data: Buffer.from("test") },
      ]);
      mockNormalizeFilePart.mockReturnValue({
        name: "test.jpg",
        type: "image/jpeg",
        size: 4,
        data: Buffer.from("test"),
      });
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetPhotoSessionById.mockResolvedValue(null);

      await expect(handler(mockEvent)).rejects.toThrow("Session not found");
    });

    it("should verify session belongs to event", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSession = {
        id: "session-123",
        eventId: "different-event",
        photoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
        { name: "photoFile", filename: "test.jpg", type: "image/jpeg", data: Buffer.from("test") },
      ]);
      mockNormalizeFilePart.mockReturnValue({
        name: "test.jpg",
        type: "image/jpeg",
        size: 4,
        data: Buffer.from("test"),
      });
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetPhotoSessionById.mockResolvedValue(mockSession);

      await expect(handler(mockEvent)).rejects.toThrow("Session not found");
    });

    it("should call getPhotoSessionById with correct parameters", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
        { name: "photoFile", filename: "test.jpg", type: "image/jpeg", data: Buffer.from("test") },
      ]);
      mockNormalizeFilePart.mockReturnValue({
        name: "test.jpg",
        type: "image/jpeg",
        size: 4,
        data: Buffer.from("test"),
      });
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetPhotoSessionById.mockResolvedValue(null);

      await expect(handler(mockEvent)).rejects.toThrow();

      expect(mockGetPhotoSessionById).toHaveBeenCalledWith("session-123", "user-123");
    });
  });

  describe("Photo Upload", () => {
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

    const createMockSession = () => ({
      id: "session-123",
      eventId: "event-123",
      photoUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    it("should upload photo successfully", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSession = createMockSession();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
        { name: "photoFile", filename: "test.jpg", type: "image/jpeg", data: Buffer.from("test") },
      ]);
      mockNormalizeFilePart.mockReturnValue({
        name: "test.jpg",
        type: "image/jpeg",
        size: 4,
        data: Buffer.from("test"),
      });
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetPhotoSessionById.mockResolvedValue(mockSession);
      mockUploadPhoto.mockResolvedValue({ path: "photos/test.jpg" });
      mockUpdatePhotoSessionPhotoUrl.mockResolvedValue(undefined);

      const result = await handler(mockEvent);

      expect(mockUploadPhoto).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should call uploadPhoto with correct parameters", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSession = createMockSession();
      const normalizedFile = {
        name: "test.jpg",
        type: "image/jpeg",
        size: 4,
        data: Buffer.from("test"),
      };

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
        { name: "photoFile", filename: "test.jpg", type: "image/jpeg", data: Buffer.from("test") },
      ]);
      mockNormalizeFilePart.mockReturnValue(normalizedFile);
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetPhotoSessionById.mockResolvedValue(mockSession);
      mockUploadPhoto.mockResolvedValue({ path: "photos/test.jpg" });
      mockUpdatePhotoSessionPhotoUrl.mockResolvedValue(undefined);

      await handler(mockEvent);

      expect(mockUploadPhoto).toHaveBeenCalledWith(
        expect.anything(),
        normalizedFile,
        "user-123",
        "event-123",
        "session-123",
        "photo",
        "https://test.supabase.co",
      );
    });

    it("should handle upload errors", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSession = createMockSession();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
        { name: "photoFile", filename: "test.jpg", type: "image/jpeg", data: Buffer.from("test") },
      ]);
      mockNormalizeFilePart.mockReturnValue({
        name: "test.jpg",
        type: "image/jpeg",
        size: 4,
        data: Buffer.from("test"),
      });
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetPhotoSessionById.mockResolvedValue(mockSession);
      mockUploadPhoto.mockRejectedValue(new Error("Upload failed"));

      mockHandleApiError.mockReturnValue({
        type: "INTERNAL_ERROR",
        code: "INTERNAL_ERROR",
        message: "Upload failed",
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });

      await expect(handler(mockEvent)).rejects.toThrow("Upload failed");
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should update photo session URL", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSession = createMockSession();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
        { name: "photoFile", filename: "test.jpg", type: "image/jpeg", data: Buffer.from("test") },
      ]);
      mockNormalizeFilePart.mockReturnValue({
        name: "test.jpg",
        type: "image/jpeg",
        size: 4,
        data: Buffer.from("test"),
      });
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetPhotoSessionById.mockResolvedValue(mockSession);
      mockUploadPhoto.mockResolvedValue({ path: "photos/test.jpg" });
      mockUpdatePhotoSessionPhotoUrl.mockResolvedValue(undefined);

      await handler(mockEvent);

      expect(mockUpdatePhotoSessionPhotoUrl).toHaveBeenCalledWith("session-123", "photos/test.jpg");
    });

    it("should return correct response structure", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSession = createMockSession();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
        { name: "photoFile", filename: "test.jpg", type: "image/jpeg", data: Buffer.from("test") },
      ]);
      mockNormalizeFilePart.mockReturnValue({
        name: "test.jpg",
        type: "image/jpeg",
        size: 4,
        data: Buffer.from("test"),
      });
      mockValidateFileOrThrow.mockReturnValue(undefined);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetPhotoSessionById.mockResolvedValue(mockSession);
      mockUploadPhoto.mockResolvedValue({ path: "photos/test.jpg" });
      mockUpdatePhotoSessionPhotoUrl.mockResolvedValue(undefined);

      const result = await handler(mockEvent);

      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        {
          sessionId: "session-123",
          photoUrl: "photos/test.jpg",
          fileInfo: {
            name: "test.jpg",
            type: "image/jpeg",
            size: 4,
          },
        },
        "Photo uploaded successfully",
      );
      expect(result).toEqual({
        success: true,
        data: {
          sessionId: "session-123",
          photoUrl: "photos/test.jpg",
          fileInfo: {
            name: "test.jpg",
            type: "image/jpeg",
            size: 4,
          },
        },
        message: "Photo uploaded successfully",
      });
    });
  });

  describe("Error Handling", () => {
    const createMockUser = () => ({
      id: "user-123",
      email: "test@example.com",
    });

    it("should use INTERNAL_ERROR as default statusCode", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue(null);

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
      mockReadMultipartFormData.mockResolvedValue(null);

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
      mockReadMultipartFormData.mockResolvedValue(null);

      const errorWithStatus = new Error("Custom error") as Error & { statusCode: number };
      errorWithStatus.statusCode = 403;

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
