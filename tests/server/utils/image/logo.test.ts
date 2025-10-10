import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UploadFile } from "~~/server/types/storage";

type SupabaseDownloadResponse = {
  data: Blob | null;
  error: { message: string } | null;
};

const mockCreateAdminClient = jest.fn<() => SupabaseClient>();
const mockGetStorageBucket = jest.fn<() => string>();

jest.mock("~~/server/clients", () => ({
  createAdminClient: mockCreateAdminClient,
}));

jest.mock("~~/server/utils/storage/path.utils", () => ({
  getStorageBucket: mockGetStorageBucket,
}));

let downloadEventLogo: (logoUrl: string) => Promise<UploadFile>;
let hasEventLogo: (logoUrl: string | null | undefined) => boolean;

beforeAll(async () => {
  const module = await import("~/server/utils/image/logo.utils");
  downloadEventLogo = module.downloadEventLogo;
  hasEventLogo = module.hasEventLogo;
});

const createMockBlob = (content: string, type = "image/png"): Blob => {
  return new Blob([content], { type });
};

describe("Logo Utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("downloadEventLogo", () => {
    it("should download logo successfully", async () => {
      const mockBlob = createMockBlob("logo data");
      const mockDownload = jest.fn<() => Promise<SupabaseDownloadResponse>>();
      mockDownload.mockResolvedValue({
        data: mockBlob,
        error: null,
      });

      mockGetStorageBucket.mockReturnValue("test-bucket");
      mockCreateAdminClient.mockReturnValue({
        storage: {
          from: jest.fn(() => ({
            download: mockDownload,
          })),
        },
      } as unknown as SupabaseClient);

      const result = await downloadEventLogo("user/event/logo.png");

      expect(result).toMatchObject({
        name: "event-logo",
        type: "image/png",
        size: expect.any(Number),
      });
      expect(Buffer.isBuffer(result.data)).toBe(true);
      expect(mockGetStorageBucket).toHaveBeenCalled();
      expect(mockDownload).toHaveBeenCalledWith("user/event/logo.png");
    });

    it("should use blob type as file type", async () => {
      const mockBlob = createMockBlob("jpeg data", "image/jpeg");
      const mockDownload = jest.fn<() => Promise<SupabaseDownloadResponse>>();
      mockDownload.mockResolvedValue({
        data: mockBlob,
        error: null,
      });

      mockGetStorageBucket.mockReturnValue("test-bucket");
      mockCreateAdminClient.mockReturnValue({
        storage: {
          from: jest.fn(() => ({
            download: mockDownload,
          })),
        },
      } as unknown as SupabaseClient);

      const result = await downloadEventLogo("path/logo.jpg");

      expect(result.type).toBe("image/jpeg");
    });

    it("should use default type when blob type is missing", async () => {
      const mockBlob = {
        arrayBuffer: async () => new ArrayBuffer(10),
        type: "",
      } as Blob;

      const mockDownload = jest.fn<() => Promise<SupabaseDownloadResponse>>();
      mockDownload.mockResolvedValue({
        data: mockBlob,
        error: null,
      });

      mockGetStorageBucket.mockReturnValue("test-bucket");
      mockCreateAdminClient.mockReturnValue({
        storage: {
          from: jest.fn(() => ({
            download: mockDownload,
          })),
        },
      } as unknown as SupabaseClient);

      const result = await downloadEventLogo("path/logo.png");

      expect(result.type).toBe("image/png");
    });

    it("should throw error when download fails with error", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const mockDownload = jest.fn<() => Promise<SupabaseDownloadResponse>>();
      mockDownload.mockResolvedValue({
        data: null,
        error: { message: "File not found" },
      });

      mockGetStorageBucket.mockReturnValue("test-bucket");
      mockCreateAdminClient.mockReturnValue({
        storage: {
          from: jest.fn(() => ({
            download: mockDownload,
          })),
        },
      } as unknown as SupabaseClient);

      await expect(downloadEventLogo("invalid/path.png")).rejects.toThrow(
        "Logo download failed: Failed to download logo: File not found",
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error downloading event logo:",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it("should throw error when data is null", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const mockDownload = jest.fn<() => Promise<SupabaseDownloadResponse>>();
      mockDownload.mockResolvedValue({
        data: null,
        error: null,
      });

      mockGetStorageBucket.mockReturnValue("test-bucket");
      mockCreateAdminClient.mockReturnValue({
        storage: {
          from: jest.fn(() => ({
            download: mockDownload,
          })),
        },
      } as unknown as SupabaseClient);

      await expect(downloadEventLogo("missing/logo.png")).rejects.toThrow(
        "Logo download failed: Failed to download logo: Logo not found",
      );

      consoleErrorSpy.mockRestore();
    });

    it("should handle non-Error exceptions", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      mockGetStorageBucket.mockReturnValue("test-bucket");
      mockCreateAdminClient.mockImplementation(() => {
        throw "String error";
      });

      await expect(downloadEventLogo("path/logo.png")).rejects.toThrow(
        "Logo download failed: Unknown error",
      );

      consoleErrorSpy.mockRestore();
    });

    it("should correctly convert blob to buffer", async () => {
      const testContent = "test logo content";
      const mockBlob = createMockBlob(testContent);
      const mockDownload = jest.fn<() => Promise<SupabaseDownloadResponse>>();
      mockDownload.mockResolvedValue({
        data: mockBlob,
        error: null,
      });

      mockGetStorageBucket.mockReturnValue("test-bucket");
      mockCreateAdminClient.mockReturnValue({
        storage: {
          from: jest.fn(() => ({
            download: mockDownload,
          })),
        },
      } as unknown as SupabaseClient);

      const result = await downloadEventLogo("path/logo.png");

      expect(result.data.toString()).toBe(testContent);
      expect(result.size).toBe(testContent.length);
    });
  });

  describe("hasEventLogo", () => {
    describe("valid logo URLs", () => {
      const validUrls = [
        { name: "simple path", url: "user/event/logo.png" },
        { name: "full URL", url: "https://example.com/logo.png" },
        { name: "relative path", url: "./logo.png" },
        { name: "absolute path", url: "/user/logo.png" },
        { name: "with query params", url: "logo.png?v=1" },
        { name: "with spaces trimmed", url: "  logo.png  " },
      ];

      validUrls.forEach((testCase) => {
        it(`should return true for ${testCase.name}`, () => {
          const result = hasEventLogo(testCase.url);
          expect(result).toBe(true);
        });
      });
    });

    describe("invalid logo URLs", () => {
      type Case = {
        name: string;
        url: string | null | undefined;
      };

      const invalidCases: Case[] = [
        { name: "null", url: null },
        { name: "undefined", url: undefined },
        { name: "empty string", url: "" },
        { name: "whitespace only", url: "   " },
        { name: "tabs only", url: "\t\t" },
        { name: "newlines only", url: "\n\n" },
        { name: "mixed whitespace", url: " \t\n " },
      ];

      invalidCases.forEach((testCase) => {
        it(`should return false for ${testCase.name}`, () => {
          const result = hasEventLogo(testCase.url);
          expect(result).toBe(false);
        });
      });
    });

    describe("edge cases", () => {
      it("should return true for single character", () => {
        const result = hasEventLogo("a");
        expect(result).toBe(true);
      });

      it("should return true for URL with only spaces around", () => {
        const result = hasEventLogo("   url   ");
        expect(result).toBe(true);
      });

      it("should return true for zero-width space", () => {
        const result = hasEventLogo("\u200B");
        expect(result).toBe(true);
      });

      it("should return false for space at start of string", () => {
        const result = hasEventLogo("  ");
        expect(result).toBe(false);
      });
    });
  });

  describe("integration scenarios", () => {
    it("should download logo and validate it exists", async () => {
      const logoUrl = "user123/event456/logo.png";
      const mockBlob = createMockBlob("logo content");
      const mockDownload = jest.fn<() => Promise<SupabaseDownloadResponse>>();
      mockDownload.mockResolvedValue({
        data: mockBlob,
        error: null,
      });

      mockGetStorageBucket.mockReturnValue("PhotoBooth");
      mockCreateAdminClient.mockReturnValue({
        storage: {
          from: jest.fn(() => ({
            download: mockDownload,
          })),
        },
      } as unknown as SupabaseClient);

      const hasLogo = hasEventLogo(logoUrl);
      expect(hasLogo).toBe(true);

      const logo = await downloadEventLogo(logoUrl);
      expect(logo).toBeDefined();
      expect(logo.name).toBe("event-logo");
    });

    it("should handle empty logo URL scenario", () => {
      const logoUrl = "";
      const hasLogo = hasEventLogo(logoUrl);

      expect(hasLogo).toBe(false);
    });

    it("should handle null logo URL scenario", () => {
      const logoUrl = null;
      const hasLogo = hasEventLogo(logoUrl);

      expect(hasLogo).toBe(false);
    });
  });
});
