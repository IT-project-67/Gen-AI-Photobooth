import { describe, it, expect, beforeAll, beforeEach, jest } from "@jest/globals";
import {
  mockCreateError,
  mockDefineEventHandler,
  mockReadBody,
  mockRequireAuth,
  mockHandleApiError,
  mockCreateSuccessResponse,
  mockCreateErrorResponse,
  mockGetEventById,
  mockGetAIPhotoById,
  mockCreateSharedPhoto,
  mockGetSharedPhotoByAIPhoto,
  mockGenerateAndUploadQRCode,
  mockCreateSignedUrlForAIPhoto,
} from "~/tests/server/mocks/mocks";
import { ERROR_STATUS_MAP } from "~/server/types/core";

const mockPrismaUpdate = jest.fn<() => Promise<void>>();
const mockPrismaClient = {
  sharedPhoto: {
    update: mockPrismaUpdate,
  },
};

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
  getAIPhotoById: mockGetAIPhotoById,
  createSharedPhoto: mockCreateSharedPhoto,
  getSharedPhotoByAIPhoto: mockGetSharedPhotoByAIPhoto,
}));

jest.mock("~~/server/utils/share", () => ({
  generateAndUploadQRCode: mockGenerateAndUploadQRCode,
  createSignedUrlForAIPhoto: mockCreateSignedUrlForAIPhoto,
}));

jest.mock("~~/server/clients/prisma.client", () => ({
  prismaClient: mockPrismaClient,
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

describe("API: POST /api/v1/share/create", () => {
  let handler: (event: unknown) => Promise<unknown>;
  let mockEvent: MockEvent;

  beforeAll(async () => {
    const module = await import("~/server/api/v1/share/create.post");
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
      mockReadBody.mockResolvedValue({ eventId: "event-123", aiphotoId: "photo-123" });

      await expect(handler(mockEvent)).rejects.toThrow();

      expect(mockRequireAuth).toHaveBeenCalledWith(mockEvent);
    });

    it("should reject unauthenticated requests", async () => {
      mockRequireAuth.mockRejectedValue(new Error("Unauthorized") as never);
      mockReadBody.mockResolvedValue({ eventId: "event-123", aiphotoId: "photo-123" });

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

    it("should require eventId field", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadBody.mockResolvedValue({ aiphotoId: "photo-123" });

      await expect(handler(mockEvent)).rejects.toThrow("Event ID is required");

      expect(mockCreateError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
          statusMessage: "Event ID is required",
        }),
      );
    });

    it("should require aiphotoId field", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadBody.mockResolvedValue({ eventId: "event-123" });

      await expect(handler(mockEvent)).rejects.toThrow("AI Photo ID is required");

      expect(mockCreateError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
          statusMessage: "AI Photo ID is required",
        }),
      );
    });

    it("should read request body", async () => {
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
      const mockAIPhoto = {
        id: "photo-123",
        generatedUrl: "photos/ai-123.jpg",
        photoSessionId: "session-123",
        photoSession: {
          eventId: "event-123",
        },
      };

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadBody.mockResolvedValue({ eventId: "event-123", aiphotoId: "photo-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockGetSharedPhotoByAIPhoto.mockResolvedValue(null);
      mockCreateSharedPhoto.mockResolvedValue({
        id: "share-123",
        qrCodeUrl: "",
        qrExpiresAt: new Date(),
      });
      mockGenerateAndUploadQRCode.mockResolvedValue("qr/code-123.png");
      mockCreateSignedUrlForAIPhoto.mockResolvedValue("https://signed-url.com");
      mockPrismaUpdate.mockResolvedValue(undefined);

      await handler(mockEvent);

      expect(mockReadBody).toHaveBeenCalledWith(mockEvent);
    });

    it("should use default expiresInSeconds when not provided", async () => {
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
      const mockAIPhoto = {
        id: "photo-123",
        generatedUrl: "photos/ai-123.jpg",
        photoSessionId: "session-123",
        photoSession: {
          eventId: "event-123",
        },
      };

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadBody.mockResolvedValue({ eventId: "event-123", aiphotoId: "photo-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockGetSharedPhotoByAIPhoto.mockResolvedValue(null);
      mockCreateSharedPhoto.mockResolvedValue({
        id: "share-123",
        qrCodeUrl: "",
        qrExpiresAt: new Date(),
      });
      mockGenerateAndUploadQRCode.mockResolvedValue("qr/code-123.png");
      mockCreateSignedUrlForAIPhoto.mockResolvedValue("https://signed-url.com");
      mockPrismaUpdate.mockResolvedValue(undefined);

      await handler(mockEvent);

      expect(mockGenerateAndUploadQRCode).toHaveBeenCalledWith(
        "photos/ai-123.jpg",
        "user-123",
        "event-123",
        "session-123",
        7 * 24 * 60 * 60,
      );
    });

    it("should use custom expiresInSeconds when provided", async () => {
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
      const mockAIPhoto = {
        id: "photo-123",
        generatedUrl: "photos/ai-123.jpg",
        photoSessionId: "session-123",
        photoSession: {
          eventId: "event-123",
        },
      };

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadBody.mockResolvedValue({
        eventId: "event-123",
        aiphotoId: "photo-123",
        expiresInSeconds: 3600,
      });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockGetSharedPhotoByAIPhoto.mockResolvedValue(null);
      mockCreateSharedPhoto.mockResolvedValue({
        id: "share-123",
        qrCodeUrl: "",
        qrExpiresAt: new Date(),
      });
      mockGenerateAndUploadQRCode.mockResolvedValue("qr/code-123.png");
      mockCreateSignedUrlForAIPhoto.mockResolvedValue("https://signed-url.com");
      mockPrismaUpdate.mockResolvedValue(undefined);

      await handler(mockEvent);

      expect(mockGenerateAndUploadQRCode).toHaveBeenCalledWith(
        "photos/ai-123.jpg",
        "user-123",
        "event-123",
        "session-123",
        3600,
      );
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
      mockReadBody.mockResolvedValue({ eventId: "event-123", aiphotoId: "photo-123" });
      mockGetEventById.mockResolvedValue(null);

      await expect(handler(mockEvent)).rejects.toThrow("Event not found");
    });

    it("should call getEventById with correct parameters", async () => {
      const mockUser = createMockUser();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadBody.mockResolvedValue({ eventId: "event-123", aiphotoId: "photo-123" });
      mockGetEventById.mockResolvedValue(null);

      await expect(handler(mockEvent)).rejects.toThrow();

      expect(mockGetEventById).toHaveBeenCalledWith("event-123", "user-123");
    });
  });

  describe("AI Photo Verification", () => {
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

    it("should verify AI photo exists", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadBody.mockResolvedValue({ eventId: "event-123", aiphotoId: "photo-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetAIPhotoById.mockResolvedValue(null as never);

      await expect(handler(mockEvent)).rejects.toThrow("AI Photo not found");
    });

    it("should verify AI photo belongs to event", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockAIPhoto = {
        id: "photo-123",
        generatedUrl: "photos/ai-123.jpg",
        photoSessionId: "session-123",
        photoSession: {
          eventId: "different-event",
        },
      };

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadBody.mockResolvedValue({ eventId: "event-123", aiphotoId: "photo-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);

      await expect(handler(mockEvent)).rejects.toThrow("AI Photo not found");
    });

    it("should call getAIPhotoById with correct parameters", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadBody.mockResolvedValue({ eventId: "event-123", aiphotoId: "photo-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetAIPhotoById.mockResolvedValue(null as never);

      await expect(handler(mockEvent)).rejects.toThrow();

      expect(mockGetAIPhotoById).toHaveBeenCalledWith("photo-123", "user-123");
    });
  });

  describe("Existing Share Handling", () => {
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

    const createMockAIPhoto = () => ({
      id: "photo-123",
      generatedUrl: "photos/ai-123.jpg",
      photoSessionId: "session-123",
      photoSession: {
        eventId: "event-123",
      },
    });

    it("should return existing share if not expired", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockAIPhoto = createMockAIPhoto();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const mockExistingShare = {
        id: "existing-share-123",
        qrCodeUrl: "qr/existing-123.png",
        qrExpiresAt: futureDate,
      };

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadBody.mockResolvedValue({ eventId: "event-123", aiphotoId: "photo-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockGetSharedPhotoByAIPhoto.mockResolvedValue(mockExistingShare);
      mockCreateSignedUrlForAIPhoto.mockResolvedValue("https://signed-url.com");

      const result = await handler(mockEvent);

      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          shareId: "existing-share-123",
          qrCodeUrl: "qr/existing-123.png",
        }),
        "Share already exists",
      );
      expect(mockCreateSharedPhoto).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should generate QR code for existing share without qrCodeUrl", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockAIPhoto = createMockAIPhoto();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const mockExistingShare = {
        id: "existing-share-123",
        qrCodeUrl: "",
        qrExpiresAt: futureDate,
      };

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadBody.mockResolvedValue({ eventId: "event-123", aiphotoId: "photo-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockGetSharedPhotoByAIPhoto.mockResolvedValue(mockExistingShare);
      mockGenerateAndUploadQRCode.mockResolvedValue("qr/new-code-123.png");
      mockCreateSignedUrlForAIPhoto.mockResolvedValue("https://signed-url.com");
      mockPrismaUpdate.mockResolvedValue(undefined);

      await handler(mockEvent);

      expect(mockGenerateAndUploadQRCode).toHaveBeenCalled();
      expect(mockPrismaUpdate).toHaveBeenCalledWith({
        where: { id: "existing-share-123" },
        data: { qrCodeUrl: "qr/new-code-123.png" },
      });
    });

    it("should generate QR code for existing share with whitespace qrCodeUrl", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockAIPhoto = createMockAIPhoto();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const mockExistingShare = {
        id: "existing-share-123",
        qrCodeUrl: "   ",
        qrExpiresAt: futureDate,
      };

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadBody.mockResolvedValue({ eventId: "event-123", aiphotoId: "photo-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockGetSharedPhotoByAIPhoto.mockResolvedValue(mockExistingShare);
      mockGenerateAndUploadQRCode.mockResolvedValue("qr/new-code-123.png");
      mockCreateSignedUrlForAIPhoto.mockResolvedValue("https://signed-url.com");
      mockPrismaUpdate.mockResolvedValue(undefined);

      await handler(mockEvent);

      expect(mockGenerateAndUploadQRCode).toHaveBeenCalled();
    });

    it("should create new share if existing share is expired", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockAIPhoto = createMockAIPhoto();
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const mockExpiredShare = {
        id: "expired-share-123",
        qrCodeUrl: "qr/expired-123.png",
        qrExpiresAt: pastDate,
      };

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadBody.mockResolvedValue({ eventId: "event-123", aiphotoId: "photo-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockGetSharedPhotoByAIPhoto.mockResolvedValue(mockExpiredShare);
      mockCreateSharedPhoto.mockResolvedValue({
        id: "new-share-123",
        qrCodeUrl: "",
        qrExpiresAt: new Date(),
      });
      mockGenerateAndUploadQRCode.mockResolvedValue("qr/new-code-123.png");
      mockCreateSignedUrlForAIPhoto.mockResolvedValue("https://signed-url.com");
      mockPrismaUpdate.mockResolvedValue(undefined);

      await handler(mockEvent);

      expect(mockCreateSharedPhoto).toHaveBeenCalled();
    });
  });

  describe("New Share Creation", () => {
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

    const createMockAIPhoto = () => ({
      id: "photo-123",
      generatedUrl: "photos/ai-123.jpg",
      photoSessionId: "session-123",
      photoSession: {
        eventId: "event-123",
      },
    });

    it("should create new shared photo", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockAIPhoto = createMockAIPhoto();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadBody.mockResolvedValue({ eventId: "event-123", aiphotoId: "photo-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockGetSharedPhotoByAIPhoto.mockResolvedValue(null);
      mockCreateSharedPhoto.mockResolvedValue({
        id: "share-123",
        qrCodeUrl: "",
        qrExpiresAt: new Date(),
      });
      mockGenerateAndUploadQRCode.mockResolvedValue("qr/code-123.png");
      mockCreateSignedUrlForAIPhoto.mockResolvedValue("https://signed-url.com");
      mockPrismaUpdate.mockResolvedValue(undefined);

      await handler(mockEvent);

      expect(mockCreateSharedPhoto).toHaveBeenCalledWith(
        "photo-123",
        "event-123",
        "photos/ai-123.jpg",
        "",
        expect.any(Date),
      );
    });

    it("should generate and upload QR code", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockAIPhoto = createMockAIPhoto();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadBody.mockResolvedValue({ eventId: "event-123", aiphotoId: "photo-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockGetSharedPhotoByAIPhoto.mockResolvedValue(null);
      mockCreateSharedPhoto.mockResolvedValue({
        id: "share-123",
        qrCodeUrl: "",
        qrExpiresAt: new Date(),
      });
      mockGenerateAndUploadQRCode.mockResolvedValue("qr/code-123.png");
      mockCreateSignedUrlForAIPhoto.mockResolvedValue("https://signed-url.com");
      mockPrismaUpdate.mockResolvedValue(undefined);

      await handler(mockEvent);

      expect(mockGenerateAndUploadQRCode).toHaveBeenCalledWith(
        "photos/ai-123.jpg",
        "user-123",
        "event-123",
        "session-123",
        7 * 24 * 60 * 60,
      );
    });

    it("should update shared photo with QR code URL", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockAIPhoto = createMockAIPhoto();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadBody.mockResolvedValue({ eventId: "event-123", aiphotoId: "photo-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockGetSharedPhotoByAIPhoto.mockResolvedValue(null);
      mockCreateSharedPhoto.mockResolvedValue({
        id: "share-123",
        qrCodeUrl: "",
        qrExpiresAt: new Date(),
      });
      mockGenerateAndUploadQRCode.mockResolvedValue("qr/code-123.png");
      mockCreateSignedUrlForAIPhoto.mockResolvedValue("https://signed-url.com");
      mockPrismaUpdate.mockResolvedValue(undefined);

      await handler(mockEvent);

      expect(mockPrismaUpdate).toHaveBeenCalledWith({
        where: { id: "share-123" },
        data: { qrCodeUrl: "qr/code-123.png" },
      });
    });

    it("should create signed URL for AI photo", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockAIPhoto = createMockAIPhoto();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadBody.mockResolvedValue({ eventId: "event-123", aiphotoId: "photo-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockGetSharedPhotoByAIPhoto.mockResolvedValue(null);
      mockCreateSharedPhoto.mockResolvedValue({
        id: "share-123",
        qrCodeUrl: "",
        qrExpiresAt: new Date(),
      });
      mockGenerateAndUploadQRCode.mockResolvedValue("qr/code-123.png");
      mockCreateSignedUrlForAIPhoto.mockResolvedValue("https://signed-url.com");
      mockPrismaUpdate.mockResolvedValue(undefined);

      await handler(mockEvent);

      expect(mockCreateSignedUrlForAIPhoto).toHaveBeenCalledWith(
        "photos/ai-123.jpg",
        7 * 24 * 60 * 60,
      );
    });

    it("should return correct response structure", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockAIPhoto = createMockAIPhoto();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadBody.mockResolvedValue({ eventId: "event-123", aiphotoId: "photo-123" });
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetAIPhotoById.mockResolvedValue(mockAIPhoto as never);
      mockGetSharedPhotoByAIPhoto.mockResolvedValue(null);
      mockCreateSharedPhoto.mockResolvedValue({
        id: "share-123",
        qrCodeUrl: "",
        qrExpiresAt: new Date(),
      });
      mockGenerateAndUploadQRCode.mockResolvedValue("qr/code-123.png");
      mockCreateSignedUrlForAIPhoto.mockResolvedValue("https://signed-url.com");
      mockPrismaUpdate.mockResolvedValue(undefined);

      await handler(mockEvent);

      expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          shareId: "share-123",
          qrCodeUrl: "qr/code-123.png",
          shareUrl: "https://signed-url.com",
        }),
        "Share created successfully",
      );
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
      mockReadBody.mockResolvedValue({});

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
      mockReadBody.mockResolvedValue({});

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
      mockReadBody.mockResolvedValue({});

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
