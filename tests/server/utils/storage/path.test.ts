import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import type { UploadFile } from "~~/server/types/storage";

const mockConfig = jest.fn();
const mockGetExtLower = jest.fn();

jest.mock("~~/server/config", () => ({
  config: mockConfig,
}));

jest.mock("~/server/utils/storage/validation.utils", () => ({
  getExtLower: mockGetExtLower,
}));

let generateFilePath: (
  template: string,
  params: Record<string, string>,
  file: UploadFile,
) => string;
let generateLogoPath: (userId: string, eventId: string, file: UploadFile) => string;
let generatePhotoPath: (
  userId: string,
  eventId: string,
  sessionId: string,
  photoId: string,
  file: UploadFile,
) => string;
let generateAIPhotoPath: (
  userId: string,
  eventId: string,
  sessionId: string,
  style: string,
  filename: string,
  file: UploadFile,
) => string;
let getStorageBucket: () => string;
let generatePublicUrl: (supabaseUrl: string, path: string) => string;

beforeAll(async () => {
  const module = await import("~/server/utils/storage/path.utils");
  generateFilePath = module.generateFilePath;
  generateLogoPath = module.generateLogoPath;
  generatePhotoPath = module.generatePhotoPath;
  generateAIPhotoPath = module.generateAIPhotoPath;
  getStorageBucket = module.getStorageBucket;
  generatePublicUrl = module.generatePublicUrl;
});

const createMockFile = (name: string): UploadFile => ({
  name,
  type: "image/png",
  data: Buffer.from("mock data"),
  size: 1024,
});

describe("Storage Path Utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateFilePath", () => {
    it("should replace template parameters with provided values", () => {
      mockGetExtLower.mockReturnValue("png");
      const file = createMockFile("test.png");

      const result = generateFilePath(
        "{userId}/{eventId}/file.{ext}",
        { userId: "user123", eventId: "event456" },
        file,
      );

      expect(result).toBe("user123/event456/file.png");
      expect(mockGetExtLower).toHaveBeenCalledWith("test.png");
    });

    it("should handle multiple parameters in template", () => {
      mockGetExtLower.mockReturnValue("jpg");
      const file = createMockFile("photo.jpg");

      const result = generateFilePath(
        "{userId}/{eventId}/{sessionId}/{photoId}.{ext}",
        {
          userId: "u1",
          eventId: "e1",
          sessionId: "s1",
          photoId: "p1",
        },
        file,
      );

      expect(result).toBe("u1/e1/s1/p1.jpg");
    });

    it("should handle extension replacement", () => {
      mockGetExtLower.mockReturnValue("webp");
      const file = createMockFile("image.webp");

      const result = generateFilePath("path/to/file.{ext}", {}, file);

      expect(result).toBe("path/to/file.webp");
    });

    it("should handle empty parameters object", () => {
      mockGetExtLower.mockReturnValue("png");
      const file = createMockFile("file.png");

      const result = generateFilePath("static/path.{ext}", {}, file);

      expect(result).toBe("static/path.png");
    });

    it("should handle complex template with special characters", () => {
      mockGetExtLower.mockReturnValue("jpeg");
      const file = createMockFile("test.jpeg");

      const result = generateFilePath(
        "{userId}/{eventId}/Photos/{sessionId}/GenPhotos/{style}/{filename}.{ext}",
        {
          userId: "user-123",
          eventId: "event_456",
          sessionId: "session@789",
          style: "anime",
          filename: "photo-001",
        },
        file,
      );

      expect(result).toBe("user-123/event_456/Photos/session@789/GenPhotos/anime/photo-001.jpeg");
    });
  });

  describe("generateLogoPath", () => {
    it("should generate logo path using PATH_TEMPLATES.LOGO", () => {
      mockGetExtLower.mockReturnValue("png");
      const file = createMockFile("logo.png");

      const result = generateLogoPath("user123", "event456", file);

      expect(result).toBe("user123/event456/Logo/logo.png");
      expect(mockGetExtLower).toHaveBeenCalledWith("logo.png");
    });

    it("should handle different file extensions", () => {
      mockGetExtLower.mockReturnValue("jpg");
      const file = createMockFile("logo.jpg");

      const result = generateLogoPath("u1", "e1", file);

      expect(result).toBe("u1/e1/Logo/logo.jpg");
    });

    it("should handle special characters in IDs", () => {
      mockGetExtLower.mockReturnValue("webp");
      const file = createMockFile("logo.webp");

      const result = generateLogoPath("user@test.com", "event-2024", file);

      expect(result).toBe("user@test.com/event-2024/Logo/logo.webp");
    });
  });

  describe("generatePhotoPath", () => {
    it("should generate photo path using PATH_TEMPLATES.PHOTO", () => {
      mockGetExtLower.mockReturnValue("png");
      const file = createMockFile("photo.png");

      const result = generatePhotoPath("user123", "event456", "session789", "photo001", file);

      expect(result).toBe("user123/event456/Photos/session789/photo.png");
      expect(mockGetExtLower).toHaveBeenCalledWith("photo.png");
    });

    it("should handle different file extensions", () => {
      mockGetExtLower.mockReturnValue("jpeg");
      const file = createMockFile("image.jpeg");

      const result = generatePhotoPath("u1", "e1", "s1", "p1", file);

      expect(result).toBe("u1/e1/Photos/s1/photo.jpeg");
    });

    it("should handle numeric IDs", () => {
      mockGetExtLower.mockReturnValue("jpg");
      const file = createMockFile("test.jpg");

      const result = generatePhotoPath("123", "456", "789", "001", file);

      expect(result).toBe("123/456/Photos/789/photo.jpg");
    });
  });

  describe("generateAIPhotoPath", () => {
    it("should generate AI photo path using PATH_TEMPLATES.AI_PHOTO", () => {
      mockGetExtLower.mockReturnValue("png");
      const file = createMockFile("generated.png");

      const result = generateAIPhotoPath(
        "user123",
        "event456",
        "session789",
        "Anime",
        "photo001",
        file,
      );

      expect(result).toBe("user123/event456/Photos/session789/GenPhotos/anime/photo001.png");
      expect(mockGetExtLower).toHaveBeenCalledWith("generated.png");
    });

    it("should convert style to lowercase", () => {
      mockGetExtLower.mockReturnValue("jpg");
      const file = createMockFile("test.jpg");

      const result = generateAIPhotoPath("u1", "e1", "s1", "WATERCOLOR", "img1", file);

      expect(result).toBe("u1/e1/Photos/s1/GenPhotos/watercolor/img1.jpg");
    });

    it("should handle mixed case style names", () => {
      mockGetExtLower.mockReturnValue("webp");
      const file = createMockFile("photo.webp");

      const result = generateAIPhotoPath(
        "user1",
        "event1",
        "session1",
        "OilPainting",
        "gen001",
        file,
      );

      expect(result).toBe("user1/event1/Photos/session1/GenPhotos/oilpainting/gen001.webp");
    });

    it("should handle hyphenated filenames", () => {
      mockGetExtLower.mockReturnValue("png");
      const file = createMockFile("image.png");

      const result = generateAIPhotoPath("u1", "e1", "s1", "anime", "photo-2024-01-01", file);

      expect(result).toBe("u1/e1/Photos/s1/GenPhotos/anime/photo-2024-01-01.png");
    });
  });

  describe("getStorageBucket", () => {
    it("should return storage bucket from config", () => {
      mockConfig.mockReturnValue({
        STORAGE_BUCKET: "MyCustomBucket",
      });

      const result = getStorageBucket();

      expect(result).toBe("MyCustomBucket");
      expect(mockConfig).toHaveBeenCalled();
    });

    it("should return default bucket when config fails", () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      mockConfig.mockImplementation(() => {
        throw new Error("Config error");
      });

      const result = getStorageBucket();

      expect(result).toBe("PhotoBooth");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error getting storage bucket:",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it("should return default bucket when STORAGE_BUCKET is undefined", () => {
      mockConfig.mockReturnValue({
        STORAGE_BUCKET: undefined,
      });

      const result = getStorageBucket();

      expect(result).toBe(undefined);
    });

    it("should handle empty string bucket name", () => {
      mockConfig.mockReturnValue({
        STORAGE_BUCKET: "",
      });

      const result = getStorageBucket();

      expect(result).toBe("");
    });
  });

  describe("generatePublicUrl", () => {
    beforeEach(() => {
      mockConfig.mockReturnValue({
        STORAGE_BUCKET: "TestBucket",
      });
    });

    it("should generate correct public URL", () => {
      const result = generatePublicUrl("https://example.supabase.co", "path/to/file.png");

      expect(result).toBe(
        "https://example.supabase.co/storage/v1/object/public/TestBucket/path/to/file.png",
      );
    });

    it("should handle URL without trailing slash", () => {
      const result = generatePublicUrl("https://example.supabase.co", "image.jpg");

      expect(result).toBe(
        "https://example.supabase.co/storage/v1/object/public/TestBucket/image.jpg",
      );
    });

    it("should handle path with leading slash", () => {
      const result = generatePublicUrl("https://example.supabase.co", "/path/to/file.png");

      expect(result).toBe(
        "https://example.supabase.co/storage/v1/object/public/TestBucket//path/to/file.png",
      );
    });

    it("should handle nested paths", () => {
      const result = generatePublicUrl(
        "https://example.supabase.co",
        "user123/event456/Photos/session789/photo001.png",
      );

      expect(result).toBe(
        "https://example.supabase.co/storage/v1/object/public/TestBucket/user123/event456/Photos/session789/photo001.png",
      );
    });

    it("should use bucket from getStorageBucket when config fails", () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      mockConfig.mockImplementation(() => {
        throw new Error("Config error");
      });

      const result = generatePublicUrl("https://example.supabase.co", "file.png");

      expect(result).toBe(
        "https://example.supabase.co/storage/v1/object/public/PhotoBooth/file.png",
      );

      consoleErrorSpy.mockRestore();
    });

    it("should handle special characters in path", () => {
      const result = generatePublicUrl(
        "https://example.supabase.co",
        "user@test.com/event-2024/photo 001.png",
      );

      expect(result).toBe(
        "https://example.supabase.co/storage/v1/object/public/TestBucket/user@test.com/event-2024/photo 001.png",
      );
    });
  });

  describe("integration scenarios", () => {
    beforeEach(() => {
      mockConfig.mockReturnValue({
        STORAGE_BUCKET: "PhotoBooth",
      });
    });

    it("should generate complete workflow for logo upload", () => {
      mockGetExtLower.mockReturnValue("png");
      const file = createMockFile("company-logo.png");

      const path = generateLogoPath("user123", "event456", file);
      const url = generatePublicUrl("https://test.supabase.co", path);

      expect(path).toBe("user123/event456/Logo/logo.png");
      expect(url).toBe(
        "https://test.supabase.co/storage/v1/object/public/PhotoBooth/user123/event456/Logo/logo.png",
      );
    });

    it("should generate complete workflow for photo upload", () => {
      mockGetExtLower.mockReturnValue("jpg");
      const file = createMockFile("photo.jpg");

      const path = generatePhotoPath("u1", "e1", "s1", "p1", file);
      const url = generatePublicUrl("https://test.supabase.co", path);

      expect(path).toBe("u1/e1/Photos/s1/photo.jpg");
      expect(url).toBe(
        "https://test.supabase.co/storage/v1/object/public/PhotoBooth/u1/e1/Photos/s1/photo.jpg",
      );
    });

    it("should generate complete workflow for AI photo upload", () => {
      mockGetExtLower.mockReturnValue("webp");
      const file = createMockFile("generated.webp");

      const path = generateAIPhotoPath("user1", "event1", "session1", "Anime", "gen001", file);
      const url = generatePublicUrl("https://test.supabase.co", path);

      expect(path).toBe("user1/event1/Photos/session1/GenPhotos/anime/gen001.webp");
      expect(url).toBe(
        "https://test.supabase.co/storage/v1/object/public/PhotoBooth/user1/event1/Photos/session1/GenPhotos/anime/gen001.webp",
      );
    });
  });
});
