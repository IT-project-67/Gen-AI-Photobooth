import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import {
  mockCreateError,
  mockDefineEventHandler,
  mockReadMultipartFormData,
  mockRequireAuth,
  mockHandleApiError,
  mockCreateAdminClient,
  mockGetEventById,
  mockGetPhotoSessionById,
  mockCreateAIPhoto,
  mockUpdateAIPhotoUrl,
  mockConfig,
  mockUploadAIPhoto,
  mockHasEventLogo,
  mockDownloadEventLogo,
  mockMergeImages,
  mockAddWhiteBorder,
  mockLeonardoClient,
  mockLeonardoUploadImage,
  mockLeonardoGenerateFromImageId,
  mockLeonardoGetGeneration,
} from "~/tests/server/mocks/mocks";
import { ERROR_STATUS_MAP } from "~/server/types/core";

// Mock sharp - must be set up before importing the module
const mockMetadata = jest.fn();
const mockSharpInstance = {
  metadata: mockMetadata,
};
const mockSharp = jest.fn(() => mockSharpInstance);

jest.mock("sharp", () => mockSharp);

jest.mock("h3", () => ({
  defineEventHandler: mockDefineEventHandler,
  createError: mockCreateError,
  readMultipartFormData: mockReadMultipartFormData,
}));

jest.mock("~~/server/clients", () => ({
  createAdminClient: mockCreateAdminClient,
  LeonardoClient: mockLeonardoClient,
}));

jest.mock("~~/server/utils/auth", () => ({
  requireAuth: mockRequireAuth,
  handleApiError: mockHandleApiError,
}));

jest.mock("~~/server/model", () => ({
  getEventById: mockGetEventById,
  getPhotoSessionById: mockGetPhotoSessionById,
  createAIPhoto: mockCreateAIPhoto,
  updateAIPhotoUrl: mockUpdateAIPhotoUrl,
}));

jest.mock("~~/server/utils/storage", () => ({
  uploadAIPhoto: mockUploadAIPhoto,
}));

jest.mock("~~/server/utils/image", () => ({
  hasEventLogo: mockHasEventLogo,
  downloadEventLogo: mockDownloadEventLogo,
  mergeImages: mockMergeImages,
  addWhiteBorder: mockAddWhiteBorder,
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

type ErrorOptions = {
  statusCode: number;
  statusMessage: string;
  data?: unknown;
};

type GenerateResponse = {
  imageId: string;
  sessionId: string;
  eventId: string;
  images: Array<{
    aiPhotoId: string;
    style: string;
    storageUrl: string;
    publicUrl: string;
    generationId: string;
    hasLogo: boolean;
  }>;
};

const createMockUser = () => ({
  id: "user-123",
  email: "test@example.com",
});

const createMockEvent = () => ({
  id: "event-123",
  name: "Test Event",
  logoUrl: null,
  startDate: new Date("2024-01-01"),
  endDate: new Date("2024-12-31"),
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

const createMockAIPhoto = (style: string) => ({
  id: `ai-photo-${style}`,
  photoSessionId: "session-123",
  style,
  generatedUrl: "",
  createdAt: new Date(),
  updatedAt: new Date(),
});

const createMockFilePart = (name = "image", overrides = {}) => ({
  name,
  filename: "test.jpg",
  type: "image/jpeg",
  data: Buffer.from("test image data"),
  ...overrides,
});

describe("API: POST /api/v1/leonardo/generate", () => {
  let handler: (event: unknown) => Promise<unknown>;
  let mockEvent: MockEvent;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let consoleWarnSpy: jest.SpiedFunction<typeof console.warn>;

  beforeEach(async () => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    mockEvent = {
      node: {
        req: {},
        res: {},
      },
    };

    mockMetadata.mockResolvedValue({ width: 1024, height: 768 } as never);

    const module = await import("~/server/api/v1/leonardo/generate.post");
    handler = module.default as (event: unknown) => Promise<unknown>;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe("Authentication", () => {
    it("should call requireAuth with event", async () => {
      mockRequireAuth.mockRejectedValue(new Error("Unauthorized") as never);

      await expect(handler(mockEvent)).rejects.toThrow();
      expect(mockRequireAuth).toHaveBeenCalledWith(mockEvent);
    });

    it("should reject unauthenticated requests", async () => {
      mockRequireAuth.mockRejectedValue(new Error("Authentication required") as never);

      await expect(handler(mockEvent)).rejects.toThrow("Authentication required");
    });
  });

  describe("Form Data Validation", () => {
    it("should require form data", async () => {
      const mockUser = createMockUser();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue(null);

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.BAD_REQUEST);
        expect(opts.statusMessage).toBe("No file uploaded");
        throw new Error("No file uploaded");
      });

      await expect(handler(mockEvent)).rejects.toThrow("No file uploaded");
    });

    it("should reject empty form data", async () => {
      const mockUser = createMockUser();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([]);

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.BAD_REQUEST);
        throw new Error("No file uploaded");
      });

      await expect(handler(mockEvent)).rejects.toThrow();
    });

    it("should require image field", async () => {
      const mockUser = createMockUser();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
      ] as never);

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.BAD_REQUEST);
        expect(opts.statusMessage).toBe("Image is required");
        throw new Error("Image is required");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Image is required");
    });

    it("should require eventId field", async () => {
      const mockUser = createMockUser();
      const mockFilePart = createMockFilePart();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        mockFilePart,
        { name: "sessionId", data: Buffer.from("session-123") },
      ] as never);

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.BAD_REQUEST);
        expect(opts.statusMessage).toBe("Event ID and Session ID are required");
        throw new Error("Event ID and Session ID are required");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Event ID and Session ID are required");
    });

    it("should require sessionId field", async () => {
      const mockUser = createMockUser();
      const mockFilePart = createMockFilePart();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        mockFilePart,
        { name: "eventId", data: Buffer.from("event-123") },
      ] as never);

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.BAD_REQUEST);
        expect(opts.statusMessage).toBe("Event ID and Session ID are required");
        throw new Error("Event ID and Session ID are required");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Event ID and Session ID are required");
    });
  });

  describe("Event & Session Verification", () => {
    it("should verify event exists", async () => {
      const mockUser = createMockUser();
      const mockFilePart = createMockFilePart();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        mockFilePart,
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
      ] as never);
      mockGetEventById.mockResolvedValue(null);

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.NOT_FOUND);
        expect(opts.statusMessage).toBe("Event not found");
        throw new Error("Event not found");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Event not found");
      expect(mockGetEventById).toHaveBeenCalledWith("event-123", "user-123");
    });

    it("should verify photo session exists", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockFilePart = createMockFilePart();
      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        mockFilePart,
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
      ] as never);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetPhotoSessionById.mockResolvedValue(null);

      mockCreateError.mockImplementation((opts: ErrorOptions) => {
        expect(opts.statusCode).toBe(ERROR_STATUS_MAP.NOT_FOUND);
        expect(opts.statusMessage).toBe("Photo session not found");
        throw new Error("Photo session not found");
      });

      await expect(handler(mockEvent)).rejects.toThrow("Photo session not found");
      expect(mockGetPhotoSessionById).toHaveBeenCalledWith("session-123", "user-123");
    });
  });

  describe("Leonardo Client Integration", () => {
    it("should upload image to Leonardo", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSession = createMockSession();
      const mockFilePart = createMockFilePart();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        mockFilePart,
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
      ] as never);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetPhotoSessionById.mockResolvedValue(mockSession);

      mockLeonardoUploadImage.mockResolvedValue("uploaded-image-id");
      mockLeonardoGenerateFromImageId.mockResolvedValue({
        sdGenerationJob: { generationId: "gen-1" },
      });
      mockLeonardoGetGeneration.mockResolvedValue({
        generations_by_pk: {
          status: "COMPLETE",
          generated_images: [{ url: "https://leonardo.ai/image1.jpg", id: "img-1" }],
        },
      });

      mockCreateAIPhoto.mockResolvedValue(createMockAIPhoto("Anime"));
      mockHasEventLogo.mockReturnValue(false);
      mockAddWhiteBorder.mockResolvedValue({
        data: Buffer.from("bordered image"),
        mimeType: "image/jpeg",
        dimensions: { width: 1262, height: 846 },
      });
      mockUploadAIPhoto.mockResolvedValue({
        path: "ai-photos/test.jpg",
        url: "https://supabase.co/test.jpg",
      });
      mockUpdateAIPhotoUrl.mockResolvedValue(createMockAIPhoto("Anime"));

      const mockFetch = jest.fn();
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100) as never),
      } as never);
      // @ts-expect-error - mocking global fetch
      globalThis.fetch = mockFetch;

      await handler(mockEvent);

      expect(mockLeonardoUploadImage).toHaveBeenCalledWith(expect.any(Buffer), "jpg");
    });

    it("should generate 4 styles from uploaded image", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSession = createMockSession();
      const mockFilePart = createMockFilePart();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        mockFilePart,
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
      ] as never);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetPhotoSessionById.mockResolvedValue(mockSession);

      mockLeonardoUploadImage.mockResolvedValue("uploaded-image-id");
      mockLeonardoGenerateFromImageId.mockResolvedValue({
        sdGenerationJob: { generationId: "gen-1" },
      });
      mockLeonardoGetGeneration.mockResolvedValue({
        generations_by_pk: {
          status: "COMPLETE",
          generated_images: [{ url: "https://leonardo.ai/image1.jpg", id: "img-1" }],
        },
      });

      mockCreateAIPhoto.mockResolvedValue(createMockAIPhoto("Anime"));
      mockHasEventLogo.mockReturnValue(false);
      mockAddWhiteBorder.mockResolvedValue({
        data: Buffer.from("bordered image"),
        mimeType: "image/jpeg",
        dimensions: { width: 1262, height: 846 },
      });
      mockUploadAIPhoto.mockResolvedValue({
        path: "ai-photos/test.jpg",
        url: "https://supabase.co/test.jpg",
      });
      mockUpdateAIPhotoUrl.mockResolvedValue(createMockAIPhoto("Anime"));

      const mockFetch = jest.fn();
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100) as never),
      } as never);
      // @ts-expect-error - mocking global fetch
      globalThis.fetch = mockFetch;

      await handler(mockEvent);

      expect(mockLeonardoGenerateFromImageId).toHaveBeenCalledTimes(4);
    });

    it("should handle generation failure", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSession = createMockSession();
      const mockFilePart = createMockFilePart();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        mockFilePart,
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
      ] as never);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetPhotoSessionById.mockResolvedValue(mockSession);

      mockLeonardoUploadImage.mockResolvedValue("uploaded-image-id");
      mockLeonardoGenerateFromImageId.mockResolvedValue({
        sdGenerationJob: { generationId: "gen-1" },
      });
      mockLeonardoGetGeneration.mockResolvedValue({
        generations_by_pk: {
          status: "FAILED",
          generated_images: [],
        },
      });

      mockCreateAIPhoto.mockResolvedValue(createMockAIPhoto("Anime"));

      await expect(handler(mockEvent)).rejects.toThrow("Generation failed");
    });

    it("should poll for generation status until complete", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSession = createMockSession();
      const mockFilePart = createMockFilePart();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        mockFilePart,
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
      ] as never);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetPhotoSessionById.mockResolvedValue(mockSession);

      mockLeonardoUploadImage.mockResolvedValue("uploaded-image-id");
      mockLeonardoGenerateFromImageId.mockResolvedValue({
        sdGenerationJob: { generationId: "gen-1" },
      });

      mockLeonardoGetGeneration
        .mockResolvedValueOnce({
          generations_by_pk: {
            status: "PENDING",
            generated_images: [],
          },
        })
        .mockResolvedValue({
          generations_by_pk: {
            status: "COMPLETE",
            generated_images: [{ url: "https://leonardo.ai/image1.jpg", id: "img-1" }],
          },
        });

      mockCreateAIPhoto.mockResolvedValue(createMockAIPhoto("Anime"));
      mockHasEventLogo.mockReturnValue(false);
      mockAddWhiteBorder.mockResolvedValue({
        data: Buffer.from("bordered image"),
        mimeType: "image/jpeg",
        dimensions: { width: 1262, height: 846 },
      });
      mockUploadAIPhoto.mockResolvedValue({
        path: "ai-photos/test.jpg",
        url: "https://supabase.co/test.jpg",
      });
      mockUpdateAIPhotoUrl.mockResolvedValue(createMockAIPhoto("Anime"));

      const mockFetch = jest.fn();
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100) as never),
      } as never);
      // @ts-expect-error - mocking global fetch
      globalThis.fetch = mockFetch;

      jest.useFakeTimers();
      const result = handler(mockEvent);

      await jest.runAllTimersAsync();

      await result;
      jest.useRealTimers();

      expect(mockLeonardoGetGeneration.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it("should handle fetch download failure", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSession = createMockSession();
      const mockFilePart = createMockFilePart();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        mockFilePart,
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
      ] as never);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetPhotoSessionById.mockResolvedValue(mockSession);

      mockLeonardoUploadImage.mockResolvedValue("uploaded-image-id");
      mockLeonardoGenerateFromImageId.mockResolvedValue({
        sdGenerationJob: { generationId: "gen-1" },
      });
      mockLeonardoGetGeneration.mockResolvedValue({
        generations_by_pk: {
          status: "COMPLETE",
          generated_images: [{ url: "https://leonardo.ai/image1.jpg", id: "img-1" }],
        },
      });

      mockCreateAIPhoto.mockResolvedValue(createMockAIPhoto("Anime"));
      mockHasEventLogo.mockReturnValue(false);

      const mockFetch = jest.fn();
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: "Not Found",
      } as never);
      // @ts-expect-error - mocking global fetch
      globalThis.fetch = mockFetch;

      await expect(handler(mockEvent)).rejects.toThrow("Failed to download image: Not Found");
    });

    it("should handle upload failure", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSession = createMockSession();
      const mockFilePart = createMockFilePart();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        mockFilePart,
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
      ] as never);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetPhotoSessionById.mockResolvedValue(mockSession);

      mockLeonardoUploadImage.mockResolvedValue("uploaded-image-id");
      mockLeonardoGenerateFromImageId.mockResolvedValue({
        sdGenerationJob: { generationId: "gen-1" },
      });
      mockLeonardoGetGeneration.mockResolvedValue({
        generations_by_pk: {
          status: "COMPLETE",
          generated_images: [{ url: "https://leonardo.ai/image1.jpg", id: "img-1" }],
        },
      });

      mockCreateAIPhoto.mockResolvedValue(createMockAIPhoto("Anime"));
      mockHasEventLogo.mockReturnValue(false);
      mockAddWhiteBorder.mockResolvedValue({
        data: Buffer.from("bordered image"),
        mimeType: "image/jpeg",
        dimensions: { width: 1262, height: 846 },
      });
      mockUploadAIPhoto.mockRejectedValue(new Error("Upload to storage failed"));

      const mockFetch = jest.fn();
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100) as never),
      } as never);
      // @ts-expect-error - mocking global fetch
      globalThis.fetch = mockFetch;

      await expect(handler(mockEvent)).rejects.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to process"),
        expect.any(Error),
      );
    });
  });

  describe("Image Processing", () => {
    it("should detect landscape orientation", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSession = createMockSession();
      const mockFilePart = createMockFilePart();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        mockFilePart,
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
      ] as never);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetPhotoSessionById.mockResolvedValue(mockSession);

      mockMetadata.mockResolvedValueOnce({ width: 1280, height: 720 } as never);

      mockLeonardoUploadImage.mockResolvedValue("uploaded-image-id");
      mockLeonardoGenerateFromImageId.mockResolvedValue({
        sdGenerationJob: { generationId: "gen-1" },
      });
      mockLeonardoGetGeneration.mockResolvedValue({
        generations_by_pk: {
          status: "COMPLETE",
          generated_images: [{ url: "https://leonardo.ai/image1.jpg", id: "img-1" }],
        },
      });

      mockCreateAIPhoto.mockResolvedValue(createMockAIPhoto("Anime"));
      mockHasEventLogo.mockReturnValue(false);
      mockAddWhiteBorder.mockResolvedValue({
        data: Buffer.from("bordered image"),
        mimeType: "image/jpeg",
        dimensions: { width: 1262, height: 846 },
      });
      mockUploadAIPhoto.mockResolvedValue({
        path: "ai-photos/test.jpg",
        url: "https://supabase.co/test.jpg",
      });
      mockUpdateAIPhotoUrl.mockResolvedValue(createMockAIPhoto("Anime"));

      const mockFetch = jest.fn();
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100) as never),
      } as never);
      // @ts-expect-error - mocking global fetch
      globalThis.fetch = mockFetch;

      await handler(mockEvent);

      expect(mockLeonardoGenerateFromImageId).toHaveBeenCalledWith(
        expect.objectContaining({
          isLandscape: true,
        }),
      );
    });

    it("should add white border when no event logo", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSession = createMockSession();
      const mockFilePart = createMockFilePart();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        mockFilePart,
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
      ] as never);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetPhotoSessionById.mockResolvedValue(mockSession);

      mockLeonardoUploadImage.mockResolvedValue("uploaded-image-id");
      mockLeonardoGenerateFromImageId.mockResolvedValue({
        sdGenerationJob: { generationId: "gen-1" },
      });
      mockLeonardoGetGeneration.mockResolvedValue({
        generations_by_pk: {
          status: "COMPLETE",
          generated_images: [{ url: "https://leonardo.ai/image1.jpg", id: "img-1" }],
        },
      });

      mockCreateAIPhoto.mockResolvedValue(createMockAIPhoto("Anime"));
      mockHasEventLogo.mockReturnValue(false);
      mockAddWhiteBorder.mockResolvedValue({
        data: Buffer.from("bordered image"),
        mimeType: "image/jpeg",
        dimensions: { width: 1262, height: 846 },
      });
      mockUploadAIPhoto.mockResolvedValue({
        path: "ai-photos/test.jpg",
        url: "https://supabase.co/test.jpg",
      });
      mockUpdateAIPhotoUrl.mockResolvedValue(createMockAIPhoto("Anime"));

      const mockFetch = jest.fn();
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100) as never),
      } as never);
      // @ts-expect-error - mocking global fetch
      globalThis.fetch = mockFetch;

      await handler(mockEvent);

      expect(mockAddWhiteBorder).toHaveBeenCalled();
      expect(mockMergeImages).not.toHaveBeenCalled();
    });

    it("should merge logo when event has logo", async () => {
      const mockUser = createMockUser();
      const mockEventData = { ...createMockEvent(), logoUrl: "logos/event-logo.png" };
      const mockSession = createMockSession();
      const mockFilePart = createMockFilePart();
      const mockLogo = {
        name: "event-logo.png",
        type: "image/png",
        data: Buffer.from("logo data"),
        size: 1024,
      };

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        mockFilePart,
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
      ] as never);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetPhotoSessionById.mockResolvedValue(mockSession);

      mockLeonardoUploadImage.mockResolvedValue("uploaded-image-id");
      mockLeonardoGenerateFromImageId.mockResolvedValue({
        sdGenerationJob: { generationId: "gen-1" },
      });
      mockLeonardoGetGeneration.mockResolvedValue({
        generations_by_pk: {
          status: "COMPLETE",
          generated_images: [{ url: "https://leonardo.ai/image1.jpg", id: "img-1" }],
        },
      });

      mockCreateAIPhoto.mockResolvedValue(createMockAIPhoto("Anime"));
      mockHasEventLogo.mockReturnValue(true);
      mockDownloadEventLogo.mockResolvedValue(mockLogo);
      mockMergeImages.mockResolvedValue({
        data: Buffer.from("merged image"),
        mimeType: "image/jpeg",
        dimensions: { width: 1262, height: 846 },
      });
      mockUploadAIPhoto.mockResolvedValue({
        path: "ai-photos/test.jpg",
        url: "https://supabase.co/test.jpg",
      });
      mockUpdateAIPhotoUrl.mockResolvedValue(createMockAIPhoto("Anime"));

      const mockFetch = jest.fn();
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100) as never),
      } as never);
      // @ts-expect-error - mocking global fetch
      globalThis.fetch = mockFetch;

      await handler(mockEvent);

      expect(mockHasEventLogo).toHaveBeenCalledWith("logos/event-logo.png");
      expect(mockDownloadEventLogo).toHaveBeenCalledWith("logos/event-logo.png");
      expect(mockMergeImages).toHaveBeenCalled();
      expect(mockAddWhiteBorder).not.toHaveBeenCalled();
    });

    it("should handle logo download failure gracefully", async () => {
      const mockUser = createMockUser();
      const mockEventData = { ...createMockEvent(), logoUrl: "logos/event-logo.png" };
      const mockSession = createMockSession();
      const mockFilePart = createMockFilePart();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        mockFilePart,
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
      ] as never);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetPhotoSessionById.mockResolvedValue(mockSession);

      mockLeonardoUploadImage.mockResolvedValue("uploaded-image-id");
      mockLeonardoGenerateFromImageId.mockResolvedValue({
        sdGenerationJob: { generationId: "gen-1" },
      });
      mockLeonardoGetGeneration.mockResolvedValue({
        generations_by_pk: {
          status: "COMPLETE",
          generated_images: [{ url: "https://leonardo.ai/image1.jpg", id: "img-1" }],
        },
      });

      mockCreateAIPhoto.mockResolvedValue(createMockAIPhoto("Anime"));
      mockHasEventLogo.mockReturnValue(true);
      mockDownloadEventLogo.mockRejectedValue(new Error("Logo download failed"));
      mockAddWhiteBorder.mockResolvedValue({
        data: Buffer.from("bordered image"),
        mimeType: "image/jpeg",
        dimensions: { width: 1262, height: 846 },
      });
      mockUploadAIPhoto.mockResolvedValue({
        path: "ai-photos/test.jpg",
        url: "https://supabase.co/test.jpg",
      });
      mockUpdateAIPhotoUrl.mockResolvedValue(createMockAIPhoto("Anime"));

      const mockFetch = jest.fn();
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100) as never),
      } as never);
      // @ts-expect-error - mocking global fetch
      globalThis.fetch = mockFetch;

      await handler(mockEvent);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to download logo"),
        expect.any(Error),
      );
      expect(mockAddWhiteBorder).toHaveBeenCalled();
    });

    it("should handle merge failure gracefully and continue", async () => {
      const mockUser = createMockUser();
      const mockEventData = { ...createMockEvent(), logoUrl: "logos/event-logo.png" };
      const mockSession = createMockSession();
      const mockFilePart = createMockFilePart();
      const mockLogo = {
        name: "event-logo.png",
        type: "image/png",
        data: Buffer.from("logo data"),
        size: 1024,
      };

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        mockFilePart,
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
      ] as never);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetPhotoSessionById.mockResolvedValue(mockSession);

      mockLeonardoUploadImage.mockResolvedValue("uploaded-image-id");
      mockLeonardoGenerateFromImageId.mockResolvedValue({
        sdGenerationJob: { generationId: "gen-1" },
      });
      mockLeonardoGetGeneration.mockResolvedValue({
        generations_by_pk: {
          status: "COMPLETE",
          generated_images: [{ url: "https://leonardo.ai/image1.jpg", id: "img-1" }],
        },
      });

      mockCreateAIPhoto.mockResolvedValue(createMockAIPhoto("Anime"));
      mockHasEventLogo.mockReturnValue(true);
      mockDownloadEventLogo.mockResolvedValue(mockLogo);
      mockMergeImages.mockRejectedValue(new Error("Merge failed"));
      mockUploadAIPhoto.mockResolvedValue({
        path: "ai-photos/test.jpg",
        url: "https://supabase.co/test.jpg",
      });
      mockUpdateAIPhotoUrl.mockResolvedValue(createMockAIPhoto("Anime"));

      const mockFetch = jest.fn();
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100) as never),
      } as never);
      // @ts-expect-error - mocking global fetch
      globalThis.fetch = mockFetch;

      const result = await handler(mockEvent);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to merge logo"),
        expect.any(Error),
      );
      expect(result).toBeDefined();
    });

    it("should handle border addition failure gracefully and continue", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSession = createMockSession();
      const mockFilePart = createMockFilePart();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        mockFilePart,
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
      ] as never);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetPhotoSessionById.mockResolvedValue(mockSession);

      mockLeonardoUploadImage.mockResolvedValue("uploaded-image-id");
      mockLeonardoGenerateFromImageId.mockResolvedValue({
        sdGenerationJob: { generationId: "gen-1" },
      });
      mockLeonardoGetGeneration.mockResolvedValue({
        generations_by_pk: {
          status: "COMPLETE",
          generated_images: [{ url: "https://leonardo.ai/image1.jpg", id: "img-1" }],
        },
      });

      mockCreateAIPhoto.mockResolvedValue(createMockAIPhoto("Anime"));
      mockHasEventLogo.mockReturnValue(false);
      mockAddWhiteBorder.mockRejectedValue(new Error("Border addition failed"));
      mockUploadAIPhoto.mockResolvedValue({
        path: "ai-photos/test.jpg",
        url: "https://supabase.co/test.jpg",
      });
      mockUpdateAIPhotoUrl.mockResolvedValue(createMockAIPhoto("Anime"));

      const mockFetch = jest.fn();
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100) as never),
      } as never);
      // @ts-expect-error - mocking global fetch
      globalThis.fetch = mockFetch;

      const result = await handler(mockEvent);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to add border"),
        expect.any(Error),
      );
      expect(result).toBeDefined();
    });
  });

  describe("Metadata Edge Cases", () => {
    it("should handle portrait orientation (height > width)", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSession = createMockSession();
      const mockFilePart = createMockFilePart();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        mockFilePart,
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
      ] as never);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetPhotoSessionById.mockResolvedValue(mockSession);

      mockMetadata.mockResolvedValueOnce({ width: 720, height: 1280 } as never);

      mockLeonardoUploadImage.mockResolvedValue("uploaded-image-id");
      mockLeonardoGenerateFromImageId.mockResolvedValue({
        sdGenerationJob: { generationId: "gen-1" },
      });
      mockLeonardoGetGeneration.mockResolvedValue({
        generations_by_pk: {
          status: "COMPLETE",
          generated_images: [{ url: "https://leonardo.ai/image1.jpg", id: "img-1" }],
        },
      });

      mockCreateAIPhoto.mockResolvedValue(createMockAIPhoto("Anime"));
      mockHasEventLogo.mockReturnValue(false);
      mockAddWhiteBorder.mockResolvedValue({
        data: Buffer.from("bordered image"),
        mimeType: "image/jpeg",
        dimensions: { width: 1262, height: 846 },
      });
      mockUploadAIPhoto.mockResolvedValue({
        path: "ai-photos/test.jpg",
        url: "https://supabase.co/test.jpg",
      });
      mockUpdateAIPhotoUrl.mockResolvedValue(createMockAIPhoto("Anime"));

      const mockFetch = jest.fn();
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100) as never),
      } as never);
      // @ts-expect-error - mocking global fetch
      globalThis.fetch = mockFetch;

      await handler(mockEvent);

      expect(mockLeonardoGenerateFromImageId).toHaveBeenCalledWith(
        expect.objectContaining({
          isLandscape: false,
        }),
      );
    });

    it("should handle missing width in metadata", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSession = createMockSession();
      const mockFilePart = createMockFilePart();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        mockFilePart,
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
      ] as never);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetPhotoSessionById.mockResolvedValue(mockSession);

      mockMetadata.mockResolvedValueOnce({ height: 1280 } as never);

      mockLeonardoUploadImage.mockResolvedValue("uploaded-image-id");
      mockLeonardoGenerateFromImageId.mockResolvedValue({
        sdGenerationJob: { generationId: "gen-1" },
      });
      mockLeonardoGetGeneration.mockResolvedValue({
        generations_by_pk: {
          status: "COMPLETE",
          generated_images: [{ url: "https://leonardo.ai/image1.jpg", id: "img-1" }],
        },
      });

      mockCreateAIPhoto.mockResolvedValue(createMockAIPhoto("Anime"));
      mockHasEventLogo.mockReturnValue(false);
      mockAddWhiteBorder.mockResolvedValue({
        data: Buffer.from("bordered image"),
        mimeType: "image/jpeg",
        dimensions: { width: 1262, height: 846 },
      });
      mockUploadAIPhoto.mockResolvedValue({
        path: "ai-photos/test.jpg",
        url: "https://supabase.co/test.jpg",
      });
      mockUpdateAIPhotoUrl.mockResolvedValue(createMockAIPhoto("Anime"));

      const mockFetch = jest.fn();
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100) as never),
      } as never);
      // @ts-expect-error - mocking global fetch
      globalThis.fetch = mockFetch;

      await handler(mockEvent);

      expect(mockLeonardoGenerateFromImageId).toHaveBeenCalledWith(
        expect.objectContaining({
          isLandscape: false,
        }),
      );
    });

    it("should handle missing height in metadata", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSession = createMockSession();
      const mockFilePart = createMockFilePart();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        mockFilePart,
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
      ] as never);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetPhotoSessionById.mockResolvedValue(mockSession);

      mockMetadata.mockResolvedValueOnce({ width: 1280 } as never);

      mockLeonardoUploadImage.mockResolvedValue("uploaded-image-id");
      mockLeonardoGenerateFromImageId.mockResolvedValue({
        sdGenerationJob: { generationId: "gen-1" },
      });
      mockLeonardoGetGeneration.mockResolvedValue({
        generations_by_pk: {
          status: "COMPLETE",
          generated_images: [{ url: "https://leonardo.ai/image1.jpg", id: "img-1" }],
        },
      });

      mockCreateAIPhoto.mockResolvedValue(createMockAIPhoto("Anime"));
      mockHasEventLogo.mockReturnValue(false);
      mockAddWhiteBorder.mockResolvedValue({
        data: Buffer.from("bordered image"),
        mimeType: "image/jpeg",
        dimensions: { width: 1262, height: 846 },
      });
      mockUploadAIPhoto.mockResolvedValue({
        path: "ai-photos/test.jpg",
        url: "https://supabase.co/test.jpg",
      });
      mockUpdateAIPhotoUrl.mockResolvedValue(createMockAIPhoto("Anime"));

      const mockFetch = jest.fn();
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100) as never),
      } as never);
      // @ts-expect-error - mocking global fetch
      globalThis.fetch = mockFetch;

      await handler(mockEvent);

      expect(mockLeonardoGenerateFromImageId).toHaveBeenCalledWith(
        expect.objectContaining({
          isLandscape: true,
        }),
      );
    });

    it("should handle equal width and height", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSession = createMockSession();
      const mockFilePart = createMockFilePart();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        mockFilePart,
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
      ] as never);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetPhotoSessionById.mockResolvedValue(mockSession);

      mockMetadata.mockResolvedValueOnce({ width: 1024, height: 1024 } as never);

      mockLeonardoUploadImage.mockResolvedValue("uploaded-image-id");
      mockLeonardoGenerateFromImageId.mockResolvedValue({
        sdGenerationJob: { generationId: "gen-1" },
      });
      mockLeonardoGetGeneration.mockResolvedValue({
        generations_by_pk: {
          status: "COMPLETE",
          generated_images: [{ url: "https://leonardo.ai/image1.jpg", id: "img-1" }],
        },
      });

      mockCreateAIPhoto.mockResolvedValue(createMockAIPhoto("Anime"));
      mockHasEventLogo.mockReturnValue(false);
      mockAddWhiteBorder.mockResolvedValue({
        data: Buffer.from("bordered image"),
        mimeType: "image/jpeg",
        dimensions: { width: 1262, height: 846 },
      });
      mockUploadAIPhoto.mockResolvedValue({
        path: "ai-photos/test.jpg",
        url: "https://supabase.co/test.jpg",
      });
      mockUpdateAIPhotoUrl.mockResolvedValue(createMockAIPhoto("Anime"));

      const mockFetch = jest.fn();
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100) as never),
      } as never);
      // @ts-expect-error - mocking global fetch
      globalThis.fetch = mockFetch;

      await handler(mockEvent);

      expect(mockLeonardoGenerateFromImageId).toHaveBeenCalledWith(
        expect.objectContaining({
          isLandscape: false,
        }),
      );
    });
  });

  describe("File Extension Handling", () => {
    it("should handle files without filename", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSession = createMockSession();
      const mockFilePart = createMockFilePart("image", { filename: undefined });

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        mockFilePart,
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
      ] as never);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetPhotoSessionById.mockResolvedValue(mockSession);

      mockLeonardoUploadImage.mockResolvedValue("uploaded-image-id");
      mockLeonardoGenerateFromImageId.mockResolvedValue({
        sdGenerationJob: { generationId: "gen-1" },
      });
      mockLeonardoGetGeneration.mockResolvedValue({
        generations_by_pk: {
          status: "COMPLETE",
          generated_images: [{ url: "https://leonardo.ai/image1.jpg", id: "img-1" }],
        },
      });

      mockCreateAIPhoto.mockResolvedValue(createMockAIPhoto("Anime"));
      mockHasEventLogo.mockReturnValue(false);
      mockAddWhiteBorder.mockResolvedValue({
        data: Buffer.from("bordered image"),
        mimeType: "image/jpeg",
        dimensions: { width: 1262, height: 846 },
      });
      mockUploadAIPhoto.mockResolvedValue({
        path: "ai-photos/test.jpg",
        url: "https://supabase.co/test.jpg",
      });
      mockUpdateAIPhotoUrl.mockResolvedValue(createMockAIPhoto("Anime"));

      const mockFetch = jest.fn();
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100) as never),
      } as never);
      // @ts-expect-error - mocking global fetch
      globalThis.fetch = mockFetch;

      await handler(mockEvent);

      expect(mockLeonardoUploadImage).toHaveBeenCalledWith(expect.any(Buffer), "jpg");
    });

    it("should extract extension from filename", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSession = createMockSession();
      const mockFilePart = createMockFilePart("image", { filename: "photo.png" });

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        mockFilePart,
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
      ] as never);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetPhotoSessionById.mockResolvedValue(mockSession);

      mockLeonardoUploadImage.mockResolvedValue("uploaded-image-id");
      mockLeonardoGenerateFromImageId.mockResolvedValue({
        sdGenerationJob: { generationId: "gen-1" },
      });
      mockLeonardoGetGeneration.mockResolvedValue({
        generations_by_pk: {
          status: "COMPLETE",
          generated_images: [{ url: "https://leonardo.ai/image1.jpg", id: "img-1" }],
        },
      });

      mockCreateAIPhoto.mockResolvedValue(createMockAIPhoto("Anime"));
      mockHasEventLogo.mockReturnValue(false);
      mockAddWhiteBorder.mockResolvedValue({
        data: Buffer.from("bordered image"),
        mimeType: "image/jpeg",
        dimensions: { width: 1262, height: 846 },
      });
      mockUploadAIPhoto.mockResolvedValue({
        path: "ai-photos/test.jpg",
        url: "https://supabase.co/test.jpg",
      });
      mockUpdateAIPhotoUrl.mockResolvedValue(createMockAIPhoto("Anime"));

      const mockFetch = jest.fn();
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100) as never),
      } as never);
      // @ts-expect-error - mocking global fetch
      globalThis.fetch = mockFetch;

      await handler(mockEvent);

      expect(mockLeonardoUploadImage).toHaveBeenCalledWith(expect.any(Buffer), "png");
    });

    it("should handle filename ending with dot", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSession = createMockSession();
      const mockFilePart = createMockFilePart("image", { filename: "photo." });

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        mockFilePart,
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
      ] as never);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetPhotoSessionById.mockResolvedValue(mockSession);

      mockLeonardoUploadImage.mockResolvedValue("uploaded-image-id");
      mockLeonardoGenerateFromImageId.mockResolvedValue({
        sdGenerationJob: { generationId: "gen-1" },
      });
      mockLeonardoGetGeneration.mockResolvedValue({
        generations_by_pk: {
          status: "COMPLETE",
          generated_images: [{ url: "https://leonardo.ai/image1.jpg", id: "img-1" }],
        },
      });

      mockCreateAIPhoto.mockResolvedValue(createMockAIPhoto("Anime"));
      mockHasEventLogo.mockReturnValue(false);
      mockAddWhiteBorder.mockResolvedValue({
        data: Buffer.from("bordered image"),
        mimeType: "image/jpeg",
        dimensions: { width: 1262, height: 846 },
      });
      mockUploadAIPhoto.mockResolvedValue({
        path: "ai-photos/test.jpg",
        url: "https://supabase.co/test.jpg",
      });
      mockUpdateAIPhotoUrl.mockResolvedValue(createMockAIPhoto("Anime"));

      const mockFetch = jest.fn();
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100) as never),
      } as never);
      // @ts-expect-error - mocking global fetch
      globalThis.fetch = mockFetch;

      await handler(mockEvent);

      expect(mockLeonardoUploadImage).toHaveBeenCalledWith(expect.any(Buffer), "jpg");
    });

    it("should handle filename starting with dot (like .gitignore)", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSession = createMockSession();
      const mockFilePart = createMockFilePart("image", { filename: ".hidden" });

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        mockFilePart,
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
      ] as never);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetPhotoSessionById.mockResolvedValue(mockSession);

      mockLeonardoUploadImage.mockResolvedValue("uploaded-image-id");
      mockLeonardoGenerateFromImageId.mockResolvedValue({
        sdGenerationJob: { generationId: "gen-1" },
      });
      mockLeonardoGetGeneration.mockResolvedValue({
        generations_by_pk: {
          status: "COMPLETE",
          generated_images: [{ url: "https://leonardo.ai/image1.jpg", id: "img-1" }],
        },
      });

      mockCreateAIPhoto.mockResolvedValue(createMockAIPhoto("Anime"));
      mockHasEventLogo.mockReturnValue(false);
      mockAddWhiteBorder.mockResolvedValue({
        data: Buffer.from("bordered image"),
        mimeType: "image/jpeg",
        dimensions: { width: 1262, height: 846 },
      });
      mockUploadAIPhoto.mockResolvedValue({
        path: "ai-photos/test.jpg",
        url: "https://supabase.co/test.jpg",
      });
      mockUpdateAIPhotoUrl.mockResolvedValue(createMockAIPhoto("Anime"));

      const mockFetch = jest.fn();
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100) as never),
      } as never);
      // @ts-expect-error - mocking global fetch
      globalThis.fetch = mockFetch;

      await handler(mockEvent);

      expect(mockLeonardoUploadImage).toHaveBeenCalledWith(expect.any(Buffer), "hidden");
    });

    it("should handle filename with unusual extension", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSession = createMockSession();
      const mockFilePart = createMockFilePart("image", { filename: "photo.JPEG" });

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        mockFilePart,
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
      ] as never);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetPhotoSessionById.mockResolvedValue(mockSession);

      mockLeonardoUploadImage.mockResolvedValue("uploaded-image-id");
      mockLeonardoGenerateFromImageId.mockResolvedValue({
        sdGenerationJob: { generationId: "gen-1" },
      });
      mockLeonardoGetGeneration.mockResolvedValue({
        generations_by_pk: {
          status: "COMPLETE",
          generated_images: [{ url: "https://leonardo.ai/image1.jpg", id: "img-1" }],
        },
      });

      mockCreateAIPhoto.mockResolvedValue(createMockAIPhoto("Anime"));
      mockHasEventLogo.mockReturnValue(false);
      mockAddWhiteBorder.mockResolvedValue({
        data: Buffer.from("bordered image"),
        mimeType: "image/jpeg",
        dimensions: { width: 1262, height: 846 },
      });
      mockUploadAIPhoto.mockResolvedValue({
        path: "ai-photos/test.jpg",
        url: "https://supabase.co/test.jpg",
      });
      mockUpdateAIPhotoUrl.mockResolvedValue(createMockAIPhoto("Anime"));

      const mockFetch = jest.fn();
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100) as never),
      } as never);
      // @ts-expect-error - mocking global fetch
      globalThis.fetch = mockFetch;

      await handler(mockEvent);

      expect(mockLeonardoUploadImage).toHaveBeenCalledWith(expect.any(Buffer), "jpeg");
    });
  });

  describe("Response Structure", () => {
    it("should return correct response structure", async () => {
      const mockUser = createMockUser();
      const mockEventData = createMockEvent();
      const mockSession = createMockSession();
      const mockFilePart = createMockFilePart();

      mockRequireAuth.mockResolvedValue(mockUser as never);
      mockReadMultipartFormData.mockResolvedValue([
        mockFilePart,
        { name: "eventId", data: Buffer.from("event-123") },
        { name: "sessionId", data: Buffer.from("session-123") },
      ] as never);
      mockGetEventById.mockResolvedValue(mockEventData);
      mockGetPhotoSessionById.mockResolvedValue(mockSession);

      mockLeonardoUploadImage.mockResolvedValue("uploaded-image-id-123");

      mockLeonardoGenerateFromImageId
        .mockResolvedValueOnce({ sdGenerationJob: { generationId: "gen-1" } })
        .mockResolvedValueOnce({ sdGenerationJob: { generationId: "gen-2" } })
        .mockResolvedValueOnce({ sdGenerationJob: { generationId: "gen-3" } })
        .mockResolvedValueOnce({ sdGenerationJob: { generationId: "gen-4" } });

      mockLeonardoGetGeneration.mockResolvedValue({
        generations_by_pk: {
          status: "COMPLETE",
          generated_images: [{ url: "https://leonardo.ai/image.jpg", id: "img-1" }],
        },
      });

      mockCreateAIPhoto
        .mockResolvedValueOnce(createMockAIPhoto("Anime"))
        .mockResolvedValueOnce(createMockAIPhoto("Watercolor"))
        .mockResolvedValueOnce(createMockAIPhoto("Oil"))
        .mockResolvedValueOnce(createMockAIPhoto("Disney"));

      mockHasEventLogo.mockReturnValue(false);
      mockAddWhiteBorder.mockResolvedValue({
        data: Buffer.from("bordered image"),
        mimeType: "image/jpeg",
        dimensions: { width: 1262, height: 846 },
      });
      mockUploadAIPhoto.mockResolvedValue({
        path: "ai-photos/test.jpg",
        url: "https://supabase.co/test.jpg",
      });
      mockUpdateAIPhotoUrl.mockResolvedValue(createMockAIPhoto("Anime"));

      const mockFetch = jest.fn();
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100) as never),
      } as never);
      // @ts-expect-error - mocking global fetch
      globalThis.fetch = mockFetch;

      const result = await handler(mockEvent);

      const response = result as GenerateResponse;
      expect(response).toHaveProperty("imageId", "uploaded-image-id-123");
      expect(response).toHaveProperty("sessionId", "session-123");
      expect(response).toHaveProperty("eventId", "event-123");
      expect(response).toHaveProperty("images");
      expect(Array.isArray(response.images)).toBe(true);
      expect(response.images).toHaveLength(4);
    });
  });
});
