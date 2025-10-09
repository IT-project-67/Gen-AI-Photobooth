import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UploadFile, UploadOptions } from "~~/server/types/storage";
import { ERROR_STATUS_MAP } from "~~/server/types/core";

type SupabaseResponse<T> = {
  data: T | null;
  error: { message: string } | null;
};

const mockGeneratePublicUrl = jest.fn<(supabaseUrl: string, path: string) => string>();

jest.mock("~/server/utils/storage/path.utils", () => ({
  generatePublicUrl: mockGeneratePublicUrl,
}));

let uploadToSupabase: (
  supabase: SupabaseClient,
  file: UploadFile,
  options: UploadOptions,
) => Promise<{ path: string }>;

let uploadToSupabaseWithUrl: (
  supabase: SupabaseClient,
  file: UploadFile,
  options: UploadOptions,
  supabaseUrl: string,
) => Promise<{ path: string; url: string }>;

let deleteFromSupabase: (
  supabase: SupabaseClient,
  bucket: string,
  path: string,
) => Promise<void>;

let fileExistsInSupabase: (
  supabase: SupabaseClient,
  bucket: string,
  path: string,
) => Promise<boolean>;

let getFileInfoFromSupabase: (
  supabase: SupabaseClient,
  bucket: string,
  path: string,
) => Promise<{ size: number; lastModified: string; contentType: string } | null>;

beforeAll(async () => {
  const module = await import("~/server/utils/storage/upload.utils");
  uploadToSupabase = module.uploadToSupabase;
  uploadToSupabaseWithUrl = module.uploadToSupabaseWithUrl;
  deleteFromSupabase = module.deleteFromSupabase;
  fileExistsInSupabase = module.fileExistsInSupabase;
  getFileInfoFromSupabase = module.getFileInfoFromSupabase;
});

const createMockFile = (): UploadFile => ({
  name: "test.png",
  type: "image/png",
  data: Buffer.from("mock file data"),
  size: 14,
});

describe("Storage Upload Utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("uploadToSupabase", () => {
    it("should upload file successfully with default options", async () => {
      const file = createMockFile();
      const options: UploadOptions = {
        bucket: "test-bucket",
        path: "test/path.png",
      };

      const mockUpload = jest.fn<() => Promise<SupabaseResponse<{ path: string }>>>();
      mockUpload.mockResolvedValue({
        data: { path: options.path },
        error: null,
      });

      const mockSupabase = {
        storage: {
          from: jest.fn(() => ({
            upload: mockUpload,
          })),
        },
      } as unknown as SupabaseClient;

      const result = await uploadToSupabase(mockSupabase, file, options);

      expect(result).toEqual({ path: "test/path.png" });
      expect(mockSupabase.storage.from).toHaveBeenCalledWith("test-bucket");
      expect(mockUpload).toHaveBeenCalledWith("test/path.png", file.data, {
        contentType: "image/png",
        cacheControl: "3600",
        upsert: true,
      });
    });

    it("should upload file with custom cache control", async () => {
      const file = createMockFile();
      const options: UploadOptions = {
        bucket: "test-bucket",
        path: "test/path.png",
        cacheControl: "7200",
      };

      const mockUpload = jest.fn<() => Promise<SupabaseResponse<{ path: string }>>>();
      mockUpload.mockResolvedValue({
        data: { path: options.path },
        error: null,
      });

      const mockSupabase = {
        storage: {
          from: jest.fn(() => ({
            upload: mockUpload,
          })),
        },
      } as unknown as SupabaseClient;

      await uploadToSupabase(mockSupabase, file, options);

      expect(mockUpload).toHaveBeenCalledWith("test/path.png", file.data, {
        contentType: "image/png",
        cacheControl: "7200",
        upsert: true,
      });
    });

    it("should upload file with upsert disabled", async () => {
      const file = createMockFile();
      const options: UploadOptions = {
        bucket: "test-bucket",
        path: "test/path.png",
        upsert: false,
      };

      const mockUpload = jest.fn<() => Promise<SupabaseResponse<{ path: string }>>>();
      mockUpload.mockResolvedValue({
        data: { path: options.path },
        error: null,
      });

      const mockSupabase = {
        storage: {
          from: jest.fn(() => ({
            upload: mockUpload,
          })),
        },
      } as unknown as SupabaseClient;

      await uploadToSupabase(mockSupabase, file, options);

      expect(mockUpload).toHaveBeenCalledWith("test/path.png", file.data, {
        contentType: "image/png",
        cacheControl: "3600",
        upsert: false,
      });
    });

    it("should throw error when upload fails", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const file = createMockFile();
      const options: UploadOptions = {
        bucket: "test-bucket",
        path: "test/path.png",
      };

      const uploadError = { message: "Upload failed" };
      const mockUpload = jest.fn<() => Promise<SupabaseResponse<{ path: string }>>>();
      mockUpload.mockResolvedValue({
        data: null,
        error: uploadError,
      });

      const mockSupabase = {
        storage: {
          from: jest.fn(() => ({
            upload: mockUpload,
          })),
        },
      } as unknown as SupabaseClient;

      await expect(uploadToSupabase(mockSupabase, file, options)).rejects.toMatchObject({
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
        statusMessage: "Upload failed",
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Supabase upload error:",
        uploadError,
      );
      consoleErrorSpy.mockRestore();
    });

    it("should include error data in thrown error", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const file = createMockFile();
      const options: UploadOptions = {
        bucket: "test-bucket",
        path: "test/path.png",
      };

      const mockUpload = jest.fn<() => Promise<SupabaseResponse<{ path: string }>>>();
      mockUpload.mockResolvedValue({
        data: null,
        error: { message: "Storage quota exceeded" },
      });

      const mockSupabase = {
        storage: {
          from: jest.fn(() => ({
            upload: mockUpload,
          })),
        },
      } as unknown as SupabaseClient;

      try {
        await uploadToSupabase(mockSupabase, file, options);
        fail("Should have thrown an error");
      } catch (error) {
        const uploadError = error as {
          statusCode: number;
          statusMessage: string;
          data: { success: boolean; error: { code: string; message: string } };
        };
        expect(uploadError.data).toHaveProperty("success", false);
        expect(uploadError.data.error).toHaveProperty(
          "code",
          "STORAGE_UPLOAD_ERROR",
        );
        expect(uploadError.data.error).toHaveProperty(
          "message",
          "Storage quota exceeded",
        );
      }

      consoleErrorSpy.mockRestore();
    });
  });

  describe("uploadToSupabaseWithUrl", () => {
    it("should upload file and generate public URL", async () => {
      const file = createMockFile();
      const options: UploadOptions = {
        bucket: "test-bucket",
        path: "test/path.png",
      };

      const mockUpload = jest.fn<() => Promise<SupabaseResponse<{ path: string }>>>();
      mockUpload.mockResolvedValue({
        data: { path: options.path },
        error: null,
      });

      const mockSupabase = {
        storage: {
          from: jest.fn(() => ({
            upload: mockUpload,
          })),
        },
      } as unknown as SupabaseClient;

      mockGeneratePublicUrl.mockReturnValue(
        "https://example.supabase.co/storage/v1/object/public/test-bucket/test/path.png",
      );

      const result = await uploadToSupabaseWithUrl(
        mockSupabase,
        file,
        options,
        "https://example.supabase.co",
      );

      expect(result).toEqual({
        path: "test/path.png",
        url: "https://example.supabase.co/storage/v1/object/public/test-bucket/test/path.png",
      });
      expect(mockGeneratePublicUrl).toHaveBeenCalledWith(
        "https://example.supabase.co",
        "test/path.png",
      );
    });

    it("should propagate upload errors", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const file = createMockFile();
      const options: UploadOptions = {
        bucket: "test-bucket",
        path: "test/path.png",
      };

      const mockUpload = jest.fn<() => Promise<SupabaseResponse<{ path: string }>>>();
      mockUpload.mockResolvedValue({
        data: null,
        error: { message: "Network error" },
      });

      const mockSupabase = {
        storage: {
          from: jest.fn(() => ({
            upload: mockUpload,
          })),
        },
      } as unknown as SupabaseClient;

      await expect(
        uploadToSupabaseWithUrl(
          mockSupabase,
          file,
          options,
          "https://example.supabase.co",
        ),
      ).rejects.toMatchObject({
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
        statusMessage: "Upload failed",
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe("deleteFromSupabase", () => {
    it("should delete file successfully", async () => {
      const mockRemove = jest.fn<() => Promise<SupabaseResponse<null>>>();
      mockRemove.mockResolvedValue({
        data: null,
        error: null,
      });

      const mockSupabase = {
        storage: {
          from: jest.fn(() => ({
            remove: mockRemove,
          })),
        },
      } as unknown as SupabaseClient;

      await expect(
        deleteFromSupabase(mockSupabase, "test-bucket", "test/path.png"),
      ).resolves.toBeUndefined();

      expect(mockSupabase.storage.from).toHaveBeenCalledWith("test-bucket");
      expect(mockRemove).toHaveBeenCalledWith(["test/path.png"]);
    });

    it("should throw error when delete fails", async () => {
      const mockRemove = jest.fn<() => Promise<SupabaseResponse<null>>>();
      mockRemove.mockResolvedValue({
        data: null,
        error: { message: "File not found" },
      });

      const mockSupabase = {
        storage: {
          from: jest.fn(() => ({
            remove: mockRemove,
          })),
        },
      } as unknown as SupabaseClient;

      await expect(
        deleteFromSupabase(mockSupabase, "test-bucket", "test/path.png"),
      ).rejects.toMatchObject({
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
        statusMessage: "Delete failed",
      });
    });

    it("should include error data in thrown error", async () => {
      const mockRemove = jest.fn<() => Promise<SupabaseResponse<null>>>();
      mockRemove.mockResolvedValue({
        data: null,
        error: { message: "Permission denied" },
      });

      const mockSupabase = {
        storage: {
          from: jest.fn(() => ({
            remove: mockRemove,
          })),
        },
      } as unknown as SupabaseClient;

      try {
        await deleteFromSupabase(mockSupabase, "test-bucket", "test/path.png");
        fail("Should have thrown an error");
      } catch (error) {
        const deleteError = error as {
          statusCode: number;
          statusMessage: string;
          data: { success: boolean; error: { code: string; message: string } };
        };
        expect(deleteError.data).toHaveProperty("success", false);
        expect(deleteError.data.error).toHaveProperty(
          "code",
          "STORAGE_DELETE_ERROR",
        );
        expect(deleteError.data.error).toHaveProperty(
          "message",
          "Permission denied",
        );
      }
    });
  });

  describe("fileExistsInSupabase", () => {
    it("should return true when file exists", async () => {
      const mockList = jest.fn<() => Promise<SupabaseResponse<unknown[]>>>();
      mockList.mockResolvedValue({
        data: [{ name: "path.png", id: "123" }],
        error: null,
      });

      const mockSupabase = {
        storage: {
          from: jest.fn(() => ({
            list: mockList,
          })),
        },
      } as unknown as SupabaseClient;

      const result = await fileExistsInSupabase(
        mockSupabase,
        "test-bucket",
        "test/path.png",
      );

      expect(result).toBe(true);
      expect(mockSupabase.storage.from).toHaveBeenCalledWith("test-bucket");
      expect(mockList).toHaveBeenCalledWith("test", { search: "path.png" });
    });

    it("should return false when file does not exist", async () => {
      const mockList = jest.fn<() => Promise<SupabaseResponse<unknown[]>>>();
      mockList.mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSupabase = {
        storage: {
          from: jest.fn(() => ({
            list: mockList,
          })),
        },
      } as unknown as SupabaseClient;

      const result = await fileExistsInSupabase(
        mockSupabase,
        "test-bucket",
        "test/path.png",
      );

      expect(result).toBe(false);
    });

    it("should return false when list operation fails", async () => {
      const mockList = jest.fn<() => Promise<SupabaseResponse<unknown[]>>>();
      mockList.mockResolvedValue({
        data: null,
        error: { message: "Access denied" },
      });

      const mockSupabase = {
        storage: {
          from: jest.fn(() => ({
            list: mockList,
          })),
        },
      } as unknown as SupabaseClient;

      const result = await fileExistsInSupabase(
        mockSupabase,
        "test-bucket",
        "test/path.png",
      );

      expect(result).toBe(false);
    });

    it("should handle root level files", async () => {
      const mockList = jest.fn<() => Promise<SupabaseResponse<unknown[]>>>();
      mockList.mockResolvedValue({
        data: [{ name: "file.png" }],
        error: null,
      });

      const mockSupabase = {
        storage: {
          from: jest.fn(() => ({
            list: mockList,
          })),
        },
      } as unknown as SupabaseClient;

      const result = await fileExistsInSupabase(
        mockSupabase,
        "test-bucket",
        "file.png",
      );

      expect(result).toBe(true);
      expect(mockList).toHaveBeenCalledWith("", { search: "file.png" });
    });

    it("should handle deeply nested files", async () => {
      const mockList = jest.fn<() => Promise<SupabaseResponse<unknown[]>>>();
      mockList.mockResolvedValue({
        data: [{ name: "image.png" }],
        error: null,
      });

      const mockSupabase = {
        storage: {
          from: jest.fn(() => ({
            list: mockList,
          })),
        },
      } as unknown as SupabaseClient;

      const result = await fileExistsInSupabase(
        mockSupabase,
        "test-bucket",
        "user/event/photos/session/image.png",
      );

      expect(result).toBe(true);
      expect(mockList).toHaveBeenCalledWith("user/event/photos/session", {
        search: "image.png",
      });
    });
  });

  describe("getFileInfoFromSupabase", () => {
    it("should return file info when file exists", async () => {
      const mockList = jest.fn<() => Promise<SupabaseResponse<unknown[]>>>();
      mockList.mockResolvedValue({
        data: [
          {
            name: "path.png",
            metadata: {
              size: 1024,
              mimetype: "image/png",
            },
            updated_at: "2024-01-01T12:00:00Z",
            created_at: "2024-01-01T10:00:00Z",
          },
        ],
        error: null,
      });

      const mockSupabase = {
        storage: {
          from: jest.fn(() => ({
            list: mockList,
          })),
        },
      } as unknown as SupabaseClient;

      const result = await getFileInfoFromSupabase(
        mockSupabase,
        "test-bucket",
        "test/path.png",
      );

      expect(result).toEqual({
        size: 1024,
        lastModified: "2024-01-01T12:00:00Z",
        contentType: "image/png",
      });
    });

    it("should use created_at when updated_at is missing", async () => {
      const mockList = jest.fn<() => Promise<SupabaseResponse<unknown[]>>>();
      mockList.mockResolvedValue({
        data: [
          {
            name: "path.png",
            metadata: { size: 2048, mimetype: "image/jpeg" },
            created_at: "2024-01-01T10:00:00Z",
          },
        ],
        error: null,
      });

      const mockSupabase = {
        storage: {
          from: jest.fn(() => ({
            list: mockList,
          })),
        },
      } as unknown as SupabaseClient;

      const result = await getFileInfoFromSupabase(
        mockSupabase,
        "test-bucket",
        "test/path.png",
      );

      expect(result?.lastModified).toBe("2024-01-01T10:00:00Z");
    });

    it("should return default values when metadata is missing", async () => {
      const mockList = jest.fn<() => Promise<SupabaseResponse<unknown[]>>>();
      mockList.mockResolvedValue({
        data: [
          {
            name: "path.png",
            metadata: {},
            updated_at: "2024-01-01T12:00:00Z",
          },
        ],
        error: null,
      });

      const mockSupabase = {
        storage: {
          from: jest.fn(() => ({
            list: mockList,
          })),
        },
      } as unknown as SupabaseClient;

      const result = await getFileInfoFromSupabase(
        mockSupabase,
        "test-bucket",
        "test/path.png",
      );

      expect(result).toEqual({
        size: 0,
        lastModified: "2024-01-01T12:00:00Z",
        contentType: "application/octet-stream",
      });
    });

    it("should return null when file does not exist", async () => {
      const mockList = jest.fn<() => Promise<SupabaseResponse<unknown[]>>>();
      mockList.mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSupabase = {
        storage: {
          from: jest.fn(() => ({
            list: mockList,
          })),
        },
      } as unknown as SupabaseClient;

      const result = await getFileInfoFromSupabase(
        mockSupabase,
        "test-bucket",
        "test/path.png",
      );

      expect(result).toBeNull();
    });

    it("should return null when list operation fails", async () => {
      const mockList = jest.fn<() => Promise<SupabaseResponse<unknown[]>>>();
      mockList.mockResolvedValue({
        data: null,
        error: { message: "Access denied" },
      });

      const mockSupabase = {
        storage: {
          from: jest.fn(() => ({
            list: mockList,
          })),
        },
      } as unknown as SupabaseClient;

      const result = await getFileInfoFromSupabase(
        mockSupabase,
        "test-bucket",
        "test/path.png",
      );

      expect(result).toBeNull();
    });

    it("should return null when data is null", async () => {
      const mockList = jest.fn<() => Promise<SupabaseResponse<unknown[]>>>();
      mockList.mockResolvedValue({
        data: null,
        error: null,
      });

      const mockSupabase = {
        storage: {
          from: jest.fn(() => ({
            list: mockList,
          })),
        },
      } as unknown as SupabaseClient;

      const result = await getFileInfoFromSupabase(
        mockSupabase,
        "test-bucket",
        "test/path.png",
      );

      expect(result).toBeNull();
    });

    it("should handle empty string timestamps", async () => {
      const mockList = jest.fn<() => Promise<SupabaseResponse<unknown[]>>>();
      mockList.mockResolvedValue({
        data: [
          {
            name: "path.png",
            metadata: { size: 512 },
          },
        ],
        error: null,
      });

      const mockSupabase = {
        storage: {
          from: jest.fn(() => ({
            list: mockList,
          })),
        },
      } as unknown as SupabaseClient;

      const result = await getFileInfoFromSupabase(
        mockSupabase,
        "test-bucket",
        "test/path.png",
      );

      expect(result?.lastModified).toBe("");
    });

    it("should use fallback size when metadata size is missing", async () => {
      const mockList = jest.fn<() => Promise<SupabaseResponse<unknown[]>>>();
      mockList.mockResolvedValue({
        data: [
          {
            name: "path.png",
            metadata: {},
            updated_at: "2024-01-01T12:00:00Z",
          },
        ],
        error: null,
      });

      const mockSupabase = {
        storage: {
          from: jest.fn(() => ({
            list: mockList,
          })),
        },
      } as unknown as SupabaseClient;

      const result = await getFileInfoFromSupabase(
        mockSupabase,
        "test-bucket",
        "test/path.png",
      );

      expect(result?.size).toBe(0);
    });

    it("should use fallback contentType when mimetype is missing", async () => {
      const mockList = jest.fn<() => Promise<SupabaseResponse<unknown[]>>>();
      mockList.mockResolvedValue({
        data: [
          {
            name: "path.png",
            metadata: { size: 1024 },
            updated_at: "2024-01-01T12:00:00Z",
          },
        ],
        error: null,
      });

      const mockSupabase = {
        storage: {
          from: jest.fn(() => ({
            list: mockList,
          })),
        },
      } as unknown as SupabaseClient;

      const result = await getFileInfoFromSupabase(
        mockSupabase,
        "test-bucket",
        "test/path.png",
      );

      expect(result?.contentType).toBe("application/octet-stream");
    });

    it("should handle file without metadata object", async () => {
      const mockList = jest.fn<() => Promise<SupabaseResponse<unknown[]>>>();
      mockList.mockResolvedValue({
        data: [
          {
            name: "path.png",
            updated_at: "2024-01-01T12:00:00Z",
          },
        ],
        error: null,
      });

      const mockSupabase = {
        storage: {
          from: jest.fn(() => ({
            list: mockList,
          })),
        },
      } as unknown as SupabaseClient;

      const result = await getFileInfoFromSupabase(
        mockSupabase,
        "test-bucket",
        "test/path.png",
      );

      expect(result?.size).toBe(0);
      expect(result?.contentType).toBe("application/octet-stream");
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete upload workflow", async () => {
      const file = createMockFile();
      const options: UploadOptions = {
        bucket: "photos",
        path: "user123/event456/photo001.png",
        upsert: true,
        cacheControl: "3600",
      };

      const mockUpload = jest.fn<() => Promise<SupabaseResponse<{ path: string }>>>();
      mockUpload.mockResolvedValue({
        data: { path: options.path },
        error: null,
      });

      const mockSupabase = {
        storage: {
          from: jest.fn(() => ({
            upload: mockUpload,
          })),
        },
      } as unknown as SupabaseClient;

      mockGeneratePublicUrl.mockReturnValue(
        "https://example.supabase.co/storage/v1/object/public/photos/user123/event456/photo001.png",
      );

      const result = await uploadToSupabaseWithUrl(
        mockSupabase,
        file,
        options,
        "https://example.supabase.co",
      );

      expect(result.path).toBe("user123/event456/photo001.png");
      expect(result.url).toContain("user123/event456/photo001.png");
    });

    it("should handle file existence check before upload", async () => {
      const mockList = jest.fn<() => Promise<SupabaseResponse<unknown[]>>>();
      mockList.mockResolvedValue({
        data: [{ name: "existing.png" }],
        error: null,
      });

      const mockSupabase = {
        storage: {
          from: jest.fn(() => ({
            list: mockList,
          })),
        },
      } as unknown as SupabaseClient;

      const exists = await fileExistsInSupabase(
        mockSupabase,
        "test-bucket",
        "test/existing.png",
      );

      expect(exists).toBe(true);
    });

    it("should handle delete and verify workflow", async () => {
      const mockRemove = jest.fn<() => Promise<SupabaseResponse<null>>>();
      mockRemove.mockResolvedValue({
        data: null,
        error: null,
      });

      const mockList = jest.fn<() => Promise<SupabaseResponse<unknown[]>>>();
      mockList.mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSupabaseDelete = {
        storage: {
          from: jest.fn(() => ({
            remove: mockRemove,
          })),
        },
      } as unknown as SupabaseClient;

      const mockSupabaseCheck = {
        storage: {
          from: jest.fn(() => ({
            list: mockList,
          })),
        },
      } as unknown as SupabaseClient;

      await deleteFromSupabase(
        mockSupabaseDelete,
        "test-bucket",
        "test/deleted.png",
      );

      const exists = await fileExistsInSupabase(
        mockSupabaseCheck,
        "test-bucket",
        "test/deleted.png",
      );

      expect(exists).toBe(false);
    });
  });
});
