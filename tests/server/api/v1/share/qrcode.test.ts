import { describe, it, expect, beforeAll, beforeEach, jest } from "@jest/globals";
import {
  mockCreateError,
  mockDefineEventHandler,
  mockGetQuery,
  mockRequireAuth,
  mockHandleApiError,
  mockCreateErrorResponse,
  mockGetSharedPhotoById,
  mockGetQRCodeFromStorage,
} from "~/tests/server/mocks/mocks";
import { ERROR_STATUS_MAP } from "~/server/types/core";

const mockSetHeader = jest.fn();
const mockSend = jest.fn<() => Promise<void>>();

jest.mock("h3", () => ({
  defineEventHandler: mockDefineEventHandler,
  createError: mockCreateError,
  getQuery: mockGetQuery,
  setHeader: mockSetHeader,
  send: mockSend,
}));

jest.mock("~~/server/utils/auth", () => ({
  requireAuth: mockRequireAuth,
  handleApiError: mockHandleApiError,
}));

jest.mock("~~/server/utils/core", () => ({
  createErrorResponse: mockCreateErrorResponse,
}));

jest.mock("~~/server/model", () => ({
  getSharedPhotoById: mockGetSharedPhotoById,
}));

jest.mock("~~/server/utils/share", () => ({
  getQRCodeFromStorage: mockGetQRCodeFromStorage,
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

describe("API: GET /api/v1/share/qrcode", () => {
  let handler: (event: unknown) => Promise<unknown>;
  let mockEvent: MockEvent;

  beforeAll(async () => {
    const module = await import("~/server/api/v1/share/qrcode.get");
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
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const mockSharedPhoto = {
        id: "share-123",
        qrCodeUrl: "qr/code-123.png",
        qrExpiresAt: futureDate,
      };

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ shareId: "share-123" });
      mockGetSharedPhotoById.mockResolvedValue(mockSharedPhoto as never);
      mockGetQRCodeFromStorage.mockResolvedValue(Buffer.from("qr-code-data"));
      mockSend.mockResolvedValue(undefined);

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

  describe("Share Expiration Check", () => {
    const createMockUser = () => ({
      id: "user-123",
      email: "test@example.com",
    });

    it("should reject expired share", async () => {
      const mockUser = createMockUser();
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const mockSharedPhoto = {
        id: "share-123",
        qrCodeUrl: "qr/code-123.png",
        qrExpiresAt: pastDate,
      };

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ shareId: "share-123" });
      mockGetSharedPhotoById.mockResolvedValue(mockSharedPhoto as never);

      await expect(handler(mockEvent)).rejects.toThrow("Share has expired");

      expect(mockCreateError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: ERROR_STATUS_MAP.EXPIRED,
          statusMessage: "Share has expired",
        }),
      );
    });

    it("should allow non-expired share", async () => {
      const mockUser = createMockUser();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const mockSharedPhoto = {
        id: "share-123",
        qrCodeUrl: "qr/code-123.png",
        qrExpiresAt: futureDate,
      };

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ shareId: "share-123" });
      mockGetSharedPhotoById.mockResolvedValue(mockSharedPhoto as never);
      mockGetQRCodeFromStorage.mockResolvedValue(Buffer.from("qr-code-data"));
      mockSend.mockResolvedValue(undefined);

      await handler(mockEvent);

      expect(mockGetQRCodeFromStorage).toHaveBeenCalled();
    });

    it("should use EXPIRED status code", async () => {
      const mockUser = createMockUser();
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const mockSharedPhoto = {
        id: "share-123",
        qrCodeUrl: "qr/code-123.png",
        qrExpiresAt: pastDate,
      };

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ shareId: "share-123" });
      mockGetSharedPhotoById.mockResolvedValue(mockSharedPhoto as never);

      mockHandleApiError.mockReturnValue({
        type: "EXPIRED",
        code: "SHARE_EXPIRED",
        message: "Share has expired",
        statusCode: ERROR_STATUS_MAP.EXPIRED,
      });

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: ERROR_STATUS_MAP.EXPIRED,
      });
    });
  });

  describe("QR Code Retrieval", () => {
    const createMockUser = () => ({
      id: "user-123",
      email: "test@example.com",
    });

    const createMockSharedPhoto = () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      return {
        id: "share-123",
        qrCodeUrl: "qr/code-123.png",
        qrExpiresAt: futureDate,
      };
    };

    it("should retrieve QR code successfully", async () => {
      const mockUser = createMockUser();
      const mockSharedPhoto = createMockSharedPhoto();
      const mockBuffer = Buffer.from("qr-code-data");

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ shareId: "share-123" });
      mockGetSharedPhotoById.mockResolvedValue(mockSharedPhoto as never);
      mockGetQRCodeFromStorage.mockResolvedValue(mockBuffer);
      mockSend.mockResolvedValue(undefined);

      await handler(mockEvent);

      expect(mockGetQRCodeFromStorage).toHaveBeenCalledWith("qr/code-123.png");
    });

    it("should handle missing QR code", async () => {
      const mockUser = createMockUser();
      const mockSharedPhoto = createMockSharedPhoto();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ shareId: "share-123" });
      mockGetSharedPhotoById.mockResolvedValue(mockSharedPhoto as never);
      mockGetQRCodeFromStorage.mockResolvedValue(null);

      await expect(handler(mockEvent)).rejects.toThrow("QR code not found");

      expect(mockCreateError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: ERROR_STATUS_MAP.NOT_FOUND,
          statusMessage: "QR code not found",
        }),
      );
    });

    it("should set correct headers", async () => {
      const mockUser = createMockUser();
      const mockSharedPhoto = createMockSharedPhoto();
      const mockBuffer = Buffer.from("qr-code-data");

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ shareId: "share-123" });
      mockGetSharedPhotoById.mockResolvedValue(mockSharedPhoto as never);
      mockGetQRCodeFromStorage.mockResolvedValue(mockBuffer);
      mockSend.mockResolvedValue(undefined);

      await handler(mockEvent);

      expect(mockSetHeader).toHaveBeenCalledWith(mockEvent, "Content-Type", "image/png");
      expect(mockSetHeader).toHaveBeenCalledWith(
        mockEvent,
        "Cache-Control",
        "private, max-age=3600",
      );
      expect(mockSetHeader).toHaveBeenCalledWith(
        mockEvent,
        "Content-Disposition",
        'inline; filename="qr-code.png"',
      );
    });

    it("should send QR code buffer", async () => {
      const mockUser = createMockUser();
      const mockSharedPhoto = createMockSharedPhoto();
      const mockBuffer = Buffer.from("qr-code-data");

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ shareId: "share-123" });
      mockGetSharedPhotoById.mockResolvedValue(mockSharedPhoto as never);
      mockGetQRCodeFromStorage.mockResolvedValue(mockBuffer);
      mockSend.mockResolvedValue(undefined);

      await handler(mockEvent);

      expect(mockSend).toHaveBeenCalledWith(mockEvent, mockBuffer);
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

    it("should handle getQRCodeFromStorage errors", async () => {
      const mockUser = createMockUser();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const mockSharedPhoto = {
        id: "share-123",
        qrCodeUrl: "qr/code-123.png",
        qrExpiresAt: futureDate,
      };

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockGetQuery.mockReturnValue({ shareId: "share-123" });
      mockGetSharedPhotoById.mockResolvedValue(mockSharedPhoto as never);
      mockGetQRCodeFromStorage.mockRejectedValue(new Error("Storage error"));

      mockHandleApiError.mockReturnValue({
        type: "INTERNAL_ERROR",
        code: "INTERNAL_ERROR",
        message: "Storage error",
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      });

      await expect(handler(mockEvent)).rejects.toThrow("Storage error");
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
