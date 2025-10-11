import { describe, it, expect, beforeAll, beforeEach, jest } from "@jest/globals";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UploadFile, UploadOptions } from "~~/server/types/storage";

type SupabaseSignedUrlResponse = {
  data: { signedUrl: string } | null;
  error: { message: string } | null;
};

type SupabaseDownloadResponse = {
  data: Blob | null;
  error: { message: string } | null;
};

const mockCreateAdminClient = jest.fn<() => SupabaseClient>();
const mockGetStorageBucket = jest.fn<() => string>();
const mockGenerateQRCodeFile = jest.fn<(data: string, filename?: string) => Promise<UploadFile>>();
const mockUploadToSupabase =
  jest.fn<
    (
      supabase: SupabaseClient,
      file: UploadFile,
      options: UploadOptions,
    ) => Promise<{ path: string }>
  >();

jest.mock("~~/server/clients", () => ({
  createAdminClient: mockCreateAdminClient,
}));

jest.mock("~~/server/utils/storage/path.utils", () => ({
  getStorageBucket: mockGetStorageBucket,
}));

jest.mock("~~/server/utils/qrcode", () => ({
  generateQRCodeFile: mockGenerateQRCodeFile,
}));

jest.mock("~~/server/utils/storage/upload.utils", () => ({
  uploadToSupabase: mockUploadToSupabase,
}));

let createSignedUrlForAIPhoto: (aiPhotoUrl: string, expiresInSeconds?: number) => Promise<string>;
let generateAndUploadQRCode: (
  aiPhotoUrl: string,
  userId: string,
  eventId: string,
  sessionId: string,
  expiresInSeconds?: number,
) => Promise<string>;
let getQRCodeFromStorage: (qrCodePath: string) => Promise<Buffer | null>;

beforeAll(async () => {
  const module = await import("~/server/utils/share/share.utils");
  createSignedUrlForAIPhoto = module.createSignedUrlForAIPhoto;
  generateAndUploadQRCode = module.generateAndUploadQRCode;
  getQRCodeFromStorage = module.getQRCodeFromStorage;
});

const createMockFile = (name = "qr.png"): UploadFile => ({
  name,
  type: "image/png",
  data: Buffer.from("mock qr code data"),
  size: 20,
});

const createMockBlob = (content = "blob data"): Blob => {
  return new Blob([content], { type: "image/png" });
};

describe("Share Utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createSignedUrlForAIPhoto", () => {
    describe("successful signed URL creation", () => {
      it("should create signed URL successfully with default expiration", async () => {
        const aiPhotoUrl = "user123/event456/Photos/session789/photo.png";
        const expectedSignedUrl = "https://supabase.co/storage/signed/url?token=abc123";

        const mockCreateSignedUrl = jest.fn<() => Promise<SupabaseSignedUrlResponse>>();
        mockCreateSignedUrl.mockResolvedValueOnce({
          data: { signedUrl: expectedSignedUrl },
          error: null,
        });

        mockGetStorageBucket.mockReturnValue("PhotoBooth");
        mockCreateAdminClient.mockReturnValue({
          storage: {
            from: jest.fn(() => ({
              createSignedUrl: mockCreateSignedUrl,
            })),
          },
        } as unknown as SupabaseClient);

        const result = await createSignedUrlForAIPhoto(aiPhotoUrl);

        expect(result).toBe(expectedSignedUrl);
        expect(mockGetStorageBucket).toHaveBeenCalled();
        expect(mockCreateSignedUrl).toHaveBeenCalledWith(aiPhotoUrl, 7 * 24 * 60 * 60);
      });

      it("should use default expiration time (7 days)", async () => {
        const mockCreateSignedUrl = jest.fn<() => Promise<SupabaseSignedUrlResponse>>();
        mockCreateSignedUrl.mockResolvedValueOnce({
          data: { signedUrl: "https://example.com/signed" },
          error: null,
        });

        mockGetStorageBucket.mockReturnValue("test-bucket");
        mockCreateAdminClient.mockReturnValue({
          storage: {
            from: jest.fn(() => ({
              createSignedUrl: mockCreateSignedUrl,
            })),
          },
        } as unknown as SupabaseClient);

        await createSignedUrlForAIPhoto("path/to/photo.png");

        expect(mockCreateSignedUrl).toHaveBeenCalledWith("path/to/photo.png", 604800);
      });

      it("should create signed URL with custom expiration time", async () => {
        const customExpiration = 24 * 60 * 60;
        const mockCreateSignedUrl = jest.fn<() => Promise<SupabaseSignedUrlResponse>>();
        mockCreateSignedUrl.mockResolvedValueOnce({
          data: { signedUrl: "https://example.com/signed" },
          error: null,
        });

        mockGetStorageBucket.mockReturnValue("test-bucket");
        mockCreateAdminClient.mockReturnValue({
          storage: {
            from: jest.fn(() => ({
              createSignedUrl: mockCreateSignedUrl,
            })),
          },
        } as unknown as SupabaseClient);

        await createSignedUrlForAIPhoto("photo.png", customExpiration);

        expect(mockCreateSignedUrl).toHaveBeenCalledWith("photo.png", customExpiration);
      });

      it("should use correct bucket from getStorageBucket", async () => {
        const mockCreateSignedUrl = jest.fn<() => Promise<SupabaseSignedUrlResponse>>();
        mockCreateSignedUrl.mockResolvedValue({
          data: { signedUrl: "https://example.com/signed" },
          error: null,
        });

        const mockFrom = jest.fn();
        mockFrom.mockReturnValue({
          createSignedUrl: mockCreateSignedUrl,
        });

        mockGetStorageBucket.mockReturnValue("CustomBucket");
        mockCreateAdminClient.mockReturnValue({
          storage: {
            from: mockFrom,
          },
        } as unknown as SupabaseClient);

        await createSignedUrlForAIPhoto("photo.png");

        expect(mockFrom).toHaveBeenCalledWith("CustomBucket");
      });
    });

    describe("error handling", () => {
      it("should throw error when Supabase returns error", async () => {
        const mockCreateSignedUrl = jest.fn<() => Promise<SupabaseSignedUrlResponse>>();
        mockCreateSignedUrl.mockResolvedValueOnce({
          data: null,
          error: { message: "Storage error" },
        });

        mockGetStorageBucket.mockReturnValue("test-bucket");
        mockCreateAdminClient.mockReturnValue({
          storage: {
            from: jest.fn(() => ({
              createSignedUrl: mockCreateSignedUrl,
            })),
          },
        } as unknown as SupabaseClient);

        await expect(createSignedUrlForAIPhoto("photo.png")).rejects.toThrow(
          "Failed to create signed URL: Storage error",
        );
      });

      it("should throw error when signedUrl is null", async () => {
        const mockCreateSignedUrl = jest.fn<() => Promise<SupabaseSignedUrlResponse>>();
        mockCreateSignedUrl.mockResolvedValueOnce({
          data: null,
          error: null,
        });

        mockGetStorageBucket.mockReturnValue("test-bucket");
        mockCreateAdminClient.mockReturnValue({
          storage: {
            from: jest.fn(() => ({
              createSignedUrl: mockCreateSignedUrl,
            })),
          },
        } as unknown as SupabaseClient);

        await expect(createSignedUrlForAIPhoto("photo.png")).rejects.toThrow(
          "Failed to create signed URL: undefined",
        );
      });

      it("should include error message in thrown error", async () => {
        const mockCreateSignedUrl = jest.fn<() => Promise<SupabaseSignedUrlResponse>>();
        mockCreateSignedUrl.mockResolvedValueOnce({
          data: null,
          error: { message: "Permission denied" },
        });

        mockGetStorageBucket.mockReturnValue("test-bucket");
        mockCreateAdminClient.mockReturnValue({
          storage: {
            from: jest.fn(() => ({
              createSignedUrl: mockCreateSignedUrl,
            })),
          },
        } as unknown as SupabaseClient);

        try {
          await createSignedUrlForAIPhoto("photo.png");
          fail("Should have thrown an error");
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          if (error instanceof Error) {
            expect(error.message).toContain("Permission denied");
          }
        }
      });

      it("should throw error when data is present but signedUrl is missing", async () => {
        const mockCreateSignedUrl = jest.fn<() => Promise<SupabaseSignedUrlResponse>>();
        mockCreateSignedUrl.mockResolvedValueOnce({
          data: { signedUrl: "" } as { signedUrl: string },
          error: null,
        });

        mockGetStorageBucket.mockReturnValue("test-bucket");
        mockCreateAdminClient.mockReturnValue({
          storage: {
            from: jest.fn(() => ({
              createSignedUrl: mockCreateSignedUrl,
            })),
          },
        } as unknown as SupabaseClient);

        await expect(createSignedUrlForAIPhoto("photo.png")).rejects.toThrow(
          "Failed to create signed URL",
        );
      });
    });

    describe("parameter validation", () => {
      it("should handle different path formats", async () => {
        const paths = [
          "simple.png",
          "path/to/file.png",
          "user/event/Photos/session/photo.png",
          "deep/nested/path/to/image.jpg",
        ];

        for (const path of paths) {
          const mockCreateSignedUrl = jest.fn<() => Promise<SupabaseSignedUrlResponse>>();
          mockCreateSignedUrl.mockResolvedValueOnce({
            data: { signedUrl: `https://example.com/${path}` },
            error: null,
          });

          mockGetStorageBucket.mockReturnValue("test-bucket");
          const mockFrom = jest.fn();
          mockFrom.mockReturnValue({
            createSignedUrl: mockCreateSignedUrl,
          });
          mockCreateAdminClient.mockReturnValue({
            storage: {
              from: mockFrom,
            },
          } as unknown as SupabaseClient);

          const result = await createSignedUrlForAIPhoto(path);
          expect(result).toBe(`https://example.com/${path}`);
        }
      });

      it("should handle special characters in path", async () => {
        const specialPath = "user@test.com/event-2024/photo 001.png";
        const mockCreateSignedUrl = jest.fn<() => Promise<SupabaseSignedUrlResponse>>();
        mockCreateSignedUrl.mockResolvedValueOnce({
          data: { signedUrl: "https://example.com/signed" },
          error: null,
        });

        mockGetStorageBucket.mockReturnValue("test-bucket");
        mockCreateAdminClient.mockReturnValue({
          storage: {
            from: jest.fn(() => ({
              createSignedUrl: mockCreateSignedUrl,
            })),
          },
        } as unknown as SupabaseClient);

        await createSignedUrlForAIPhoto(specialPath);

        expect(mockCreateSignedUrl).toHaveBeenCalledWith(specialPath, expect.any(Number));
      });
    });

    describe("expiration time edge cases", () => {
      it("should handle very short expiration (1 second)", async () => {
        const mockCreateSignedUrl = jest.fn<() => Promise<SupabaseSignedUrlResponse>>();
        mockCreateSignedUrl.mockResolvedValueOnce({
          data: { signedUrl: "https://example.com/signed" },
          error: null,
        });

        mockGetStorageBucket.mockReturnValue("test-bucket");
        mockCreateAdminClient.mockReturnValue({
          storage: {
            from: jest.fn(() => ({
              createSignedUrl: mockCreateSignedUrl,
            })),
          },
        } as unknown as SupabaseClient);

        await createSignedUrlForAIPhoto("photo.png", 1);

        expect(mockCreateSignedUrl).toHaveBeenCalledWith("photo.png", 1);
      });

      it("should handle long expiration (30 days)", async () => {
        const thirtyDays = 30 * 24 * 60 * 60;
        const mockCreateSignedUrl = jest.fn<() => Promise<SupabaseSignedUrlResponse>>();
        mockCreateSignedUrl.mockResolvedValueOnce({
          data: { signedUrl: "https://example.com/signed" },
          error: null,
        });

        mockGetStorageBucket.mockReturnValue("test-bucket");
        mockCreateAdminClient.mockReturnValue({
          storage: {
            from: jest.fn(() => ({
              createSignedUrl: mockCreateSignedUrl,
            })),
          },
        } as unknown as SupabaseClient);

        await createSignedUrlForAIPhoto("photo.png", thirtyDays);

        expect(mockCreateSignedUrl).toHaveBeenCalledWith("photo.png", thirtyDays);
      });
    });
  });

  describe("generateAndUploadQRCode", () => {
    describe("successful QR code generation and upload", () => {
      it("should complete full workflow successfully", async () => {
        const aiPhotoUrl = "user123/event456/photo.png";
        const userId = "user123";
        const eventId = "event456";
        const sessionId = "session789";
        const signedUrl = "https://supabase.co/signed/url";
        const mockQRFile = createMockFile();

        const mockCreateSignedUrl = jest.fn<() => Promise<SupabaseSignedUrlResponse>>();
        mockCreateSignedUrl.mockResolvedValueOnce({
          data: { signedUrl },
          error: null,
        });

        mockGetStorageBucket.mockReturnValue("PhotoBooth");
        mockCreateAdminClient.mockReturnValue({
          storage: {
            from: jest.fn(() => ({
              createSignedUrl: mockCreateSignedUrl,
            })),
          },
        } as unknown as SupabaseClient);

        mockGenerateQRCodeFile.mockResolvedValueOnce(mockQRFile);

        const expectedPath = `${userId}/${eventId}/Photos/${sessionId}/qr.png`;
        mockUploadToSupabase.mockResolvedValueOnce({ path: expectedPath });

        const result = await generateAndUploadQRCode(aiPhotoUrl, userId, eventId, sessionId);

        expect(result).toBe(expectedPath);
        expect(mockCreateSignedUrl).toHaveBeenCalledWith(aiPhotoUrl, 7 * 24 * 60 * 60);
        expect(mockGenerateQRCodeFile).toHaveBeenCalledWith(signedUrl, "qr.png");
        expect(mockUploadToSupabase).toHaveBeenCalledWith(
          expect.any(Object),
          mockQRFile,
          expect.objectContaining({
            bucket: "PhotoBooth",
            path: expectedPath,
            upsert: true,
            cacheControl: "3600",
          }),
        );
      });

      it("should generate correct path format", async () => {
        const mockCreateSignedUrl = jest.fn<() => Promise<SupabaseSignedUrlResponse>>();
        mockCreateSignedUrl.mockResolvedValueOnce({
          data: { signedUrl: "https://example.com/signed" },
          error: null,
        });

        mockGetStorageBucket.mockReturnValue("test-bucket");
        mockCreateAdminClient.mockReturnValue({
          storage: {
            from: jest.fn(() => ({
              createSignedUrl: mockCreateSignedUrl,
            })),
          },
        } as unknown as SupabaseClient);

        mockGenerateQRCodeFile.mockResolvedValueOnce(createMockFile());
        mockUploadToSupabase.mockResolvedValueOnce({
          path: "user1/event2/Photos/session3/qr.png",
        });

        await generateAndUploadQRCode("photo.png", "user1", "event2", "session3");

        expect(mockUploadToSupabase).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(Object),
          expect.objectContaining({
            path: "user1/event2/Photos/session3/qr.png",
          }),
        );
      });

      it("should use custom expiration time", async () => {
        const customExpiration = 24 * 60 * 60;
        const mockCreateSignedUrl = jest.fn<() => Promise<SupabaseSignedUrlResponse>>();
        mockCreateSignedUrl.mockResolvedValueOnce({
          data: { signedUrl: "https://example.com/signed" },
          error: null,
        });

        mockGetStorageBucket.mockReturnValue("test-bucket");
        mockCreateAdminClient.mockReturnValue({
          storage: {
            from: jest.fn(() => ({
              createSignedUrl: mockCreateSignedUrl,
            })),
          },
        } as unknown as SupabaseClient);

        mockGenerateQRCodeFile.mockResolvedValueOnce(createMockFile());
        mockUploadToSupabase.mockResolvedValueOnce({ path: "path/qr.png" });

        await generateAndUploadQRCode("photo.png", "user1", "event1", "session1", customExpiration);

        expect(mockCreateSignedUrl).toHaveBeenCalledWith("photo.png", customExpiration);
      });
    });

    describe("upload options validation", () => {
      it("should set upsert to true", async () => {
        const mockCreateSignedUrl = jest.fn<() => Promise<SupabaseSignedUrlResponse>>();
        mockCreateSignedUrl.mockResolvedValueOnce({
          data: { signedUrl: "https://example.com/signed" },
          error: null,
        });

        mockGetStorageBucket.mockReturnValue("test-bucket");
        mockCreateAdminClient.mockReturnValue({
          storage: {
            from: jest.fn(() => ({
              createSignedUrl: mockCreateSignedUrl,
            })),
          },
        } as unknown as SupabaseClient);

        mockGenerateQRCodeFile.mockResolvedValueOnce(createMockFile());
        mockUploadToSupabase.mockResolvedValueOnce({ path: "path/qr.png" });

        await generateAndUploadQRCode("photo.png", "u1", "e1", "s1");

        expect(mockUploadToSupabase).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(Object),
          expect.objectContaining({
            upsert: true,
          }),
        );
      });

      it("should set cacheControl to 3600", async () => {
        const mockCreateSignedUrl = jest.fn<() => Promise<SupabaseSignedUrlResponse>>();
        mockCreateSignedUrl.mockResolvedValueOnce({
          data: { signedUrl: "https://example.com/signed" },
          error: null,
        });

        mockGetStorageBucket.mockReturnValue("test-bucket");
        mockCreateAdminClient.mockReturnValue({
          storage: {
            from: jest.fn(() => ({
              createSignedUrl: mockCreateSignedUrl,
            })),
          },
        } as unknown as SupabaseClient);

        mockGenerateQRCodeFile.mockResolvedValueOnce(createMockFile());
        mockUploadToSupabase.mockResolvedValueOnce({ path: "path/qr.png" });

        await generateAndUploadQRCode("photo.png", "u1", "e1", "s1");

        expect(mockUploadToSupabase).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(Object),
          expect.objectContaining({
            cacheControl: "3600",
          }),
        );
      });

      it("should use correct bucket", async () => {
        const mockCreateSignedUrl = jest.fn<() => Promise<SupabaseSignedUrlResponse>>();
        mockCreateSignedUrl.mockResolvedValueOnce({
          data: { signedUrl: "https://example.com/signed" },
          error: null,
        });

        mockGetStorageBucket.mockReturnValue("CustomBucket");
        mockCreateAdminClient.mockReturnValue({
          storage: {
            from: jest.fn(() => ({
              createSignedUrl: mockCreateSignedUrl,
            })),
          },
        } as unknown as SupabaseClient);

        mockGenerateQRCodeFile.mockResolvedValueOnce(createMockFile());
        mockUploadToSupabase.mockResolvedValueOnce({ path: "path/qr.png" });

        await generateAndUploadQRCode("photo.png", "u1", "e1", "s1");

        expect(mockUploadToSupabase).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(Object),
          expect.objectContaining({
            bucket: "CustomBucket",
          }),
        );
      });
    });

    describe("function call order", () => {
      it("should call functions in correct order", async () => {
        const callOrder: string[] = [];

        const mockCreateSignedUrl = jest.fn<() => Promise<SupabaseSignedUrlResponse>>();
        mockCreateSignedUrl.mockImplementation(async () => {
          callOrder.push("createSignedUrl");
          return { data: { signedUrl: "https://example.com/signed" }, error: null };
        });

        mockGetStorageBucket.mockReturnValue("test-bucket");
        mockCreateAdminClient.mockReturnValue({
          storage: {
            from: jest.fn(() => ({
              createSignedUrl: mockCreateSignedUrl,
            })),
          },
        } as unknown as SupabaseClient);

        mockGenerateQRCodeFile.mockImplementation(async () => {
          callOrder.push("generateQRCodeFile");
          return createMockFile();
        });

        mockUploadToSupabase.mockImplementation(async () => {
          callOrder.push("uploadToSupabase");
          return { path: "path/qr.png" };
        });

        await generateAndUploadQRCode("photo.png", "u1", "e1", "s1");

        expect(callOrder).toEqual(["createSignedUrl", "generateQRCodeFile", "uploadToSupabase"]);
      });

      it("should not call generateQRCodeFile if createSignedUrl fails", async () => {
        const mockCreateSignedUrl = jest.fn<() => Promise<SupabaseSignedUrlResponse>>();
        mockCreateSignedUrl.mockResolvedValueOnce({
          data: null,
          error: { message: "Failed" },
        });

        mockGetStorageBucket.mockReturnValue("test-bucket");
        mockCreateAdminClient.mockReturnValue({
          storage: {
            from: jest.fn(() => ({
              createSignedUrl: mockCreateSignedUrl,
            })),
          },
        } as unknown as SupabaseClient);

        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        try {
          await generateAndUploadQRCode("photo.png", "u1", "e1", "s1");
        } catch {
          // Expected
        }

        expect(mockGenerateQRCodeFile).not.toHaveBeenCalled();
        expect(mockUploadToSupabase).not.toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
      });

      it("should not call uploadToSupabase if generateQRCodeFile fails", async () => {
        const mockCreateSignedUrl = jest.fn<() => Promise<SupabaseSignedUrlResponse>>();
        mockCreateSignedUrl.mockResolvedValueOnce({
          data: { signedUrl: "https://example.com/signed" },
          error: null,
        });

        mockGetStorageBucket.mockReturnValue("test-bucket");
        mockCreateAdminClient.mockReturnValue({
          storage: {
            from: jest.fn(() => ({
              createSignedUrl: mockCreateSignedUrl,
            })),
          },
        } as unknown as SupabaseClient);

        mockGenerateQRCodeFile.mockRejectedValueOnce(new Error("QR generation failed"));

        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        await expect(generateAndUploadQRCode("photo.png", "u1", "e1", "s1")).rejects.toThrow();

        expect(mockUploadToSupabase).not.toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
      });
    });

    describe("error handling", () => {
      it("should throw and log error when createSignedUrl fails", async () => {
        const mockCreateSignedUrl = jest.fn<() => Promise<SupabaseSignedUrlResponse>>();
        mockCreateSignedUrl.mockResolvedValueOnce({
          data: null,
          error: { message: "Signed URL error" },
        });

        mockGetStorageBucket.mockReturnValue("test-bucket");
        mockCreateAdminClient.mockReturnValue({
          storage: {
            from: jest.fn(() => ({
              createSignedUrl: mockCreateSignedUrl,
            })),
          },
        } as unknown as SupabaseClient);

        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        await expect(generateAndUploadQRCode("photo.png", "u1", "e1", "s1")).rejects.toThrow();

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Error in generateAndUploadQRCode:",
          expect.any(Error),
        );

        consoleErrorSpy.mockRestore();
      });

      it("should throw and log error when generateQRCodeFile fails", async () => {
        const mockCreateSignedUrl = jest.fn<() => Promise<SupabaseSignedUrlResponse>>();
        mockCreateSignedUrl.mockResolvedValueOnce({
          data: { signedUrl: "https://example.com/signed" },
          error: null,
        });

        mockGetStorageBucket.mockReturnValue("test-bucket");
        mockCreateAdminClient.mockReturnValue({
          storage: {
            from: jest.fn(() => ({
              createSignedUrl: mockCreateSignedUrl,
            })),
          },
        } as unknown as SupabaseClient);

        const qrError = new Error("QR generation failed");
        mockGenerateQRCodeFile.mockRejectedValueOnce(qrError);

        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        await expect(generateAndUploadQRCode("photo.png", "u1", "e1", "s1")).rejects.toThrow(
          "QR generation failed",
        );

        expect(consoleErrorSpy).toHaveBeenCalledWith("Error in generateAndUploadQRCode:", qrError);

        consoleErrorSpy.mockRestore();
      });

      it("should throw and log error when uploadToSupabase fails", async () => {
        const mockCreateSignedUrl = jest.fn<() => Promise<SupabaseSignedUrlResponse>>();
        mockCreateSignedUrl.mockResolvedValueOnce({
          data: { signedUrl: "https://example.com/signed" },
          error: null,
        });

        mockGetStorageBucket.mockReturnValue("test-bucket");
        mockCreateAdminClient.mockReturnValue({
          storage: {
            from: jest.fn(() => ({
              createSignedUrl: mockCreateSignedUrl,
            })),
          },
        } as unknown as SupabaseClient);

        mockGenerateQRCodeFile.mockResolvedValueOnce(createMockFile());

        const uploadError = new Error("Upload failed");
        mockUploadToSupabase.mockRejectedValueOnce(uploadError);

        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        await expect(generateAndUploadQRCode("photo.png", "u1", "e1", "s1")).rejects.toThrow(
          "Upload failed",
        );

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Error in generateAndUploadQRCode:",
          uploadError,
        );

        consoleErrorSpy.mockRestore();
      });

      it("should propagate original error", async () => {
        const mockCreateSignedUrl = jest.fn<() => Promise<SupabaseSignedUrlResponse>>();
        mockCreateSignedUrl.mockResolvedValueOnce({
          data: { signedUrl: "https://example.com/signed" },
          error: null,
        });

        mockGetStorageBucket.mockReturnValue("test-bucket");
        mockCreateAdminClient.mockReturnValue({
          storage: {
            from: jest.fn(() => ({
              createSignedUrl: mockCreateSignedUrl,
            })),
          },
        } as unknown as SupabaseClient);

        const specificError = new Error("Specific upload error");
        mockGenerateQRCodeFile.mockResolvedValueOnce(createMockFile());
        mockUploadToSupabase.mockRejectedValueOnce(specificError);

        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        try {
          await generateAndUploadQRCode("photo.png", "u1", "e1", "s1");
          fail("Should have thrown an error");
        } catch (error) {
          expect(error).toBe(specificError);
        }

        consoleErrorSpy.mockRestore();
      });
    });

    describe("real-world scenarios", () => {
      it("should handle complete AI photo sharing workflow", async () => {
        const aiPhotoUrl = "user789/event123/Photos/session456/GenPhotos/anime/photo001.png";
        const userId = "user789";
        const eventId = "event123";
        const sessionId = "session456";

        const mockCreateSignedUrl = jest.fn<() => Promise<SupabaseSignedUrlResponse>>();
        mockCreateSignedUrl.mockResolvedValueOnce({
          data: {
            signedUrl:
              "https://supabase.co/storage/v1/object/sign/bucket/path?token=xyz&expires=123456",
          },
          error: null,
        });

        mockGetStorageBucket.mockReturnValue("PhotoBooth");
        mockCreateAdminClient.mockReturnValue({
          storage: {
            from: jest.fn(() => ({
              createSignedUrl: mockCreateSignedUrl,
            })),
          },
        } as unknown as SupabaseClient);

        mockGenerateQRCodeFile.mockResolvedValueOnce(createMockFile());
        mockUploadToSupabase.mockResolvedValueOnce({
          path: `${userId}/${eventId}/Photos/${sessionId}/qr.png`,
        });

        const result = await generateAndUploadQRCode(aiPhotoUrl, userId, eventId, sessionId);

        expect(result).toBe(`${userId}/${eventId}/Photos/${sessionId}/qr.png`);
      });
    });
  });

  describe("getQRCodeFromStorage", () => {
    describe("successful download", () => {
      it("should download QR code successfully", async () => {
        const qrCodePath = "user123/event456/Photos/session789/qr.png";
        const mockBlobContent = "qr code binary data";
        const mockBlob = createMockBlob(mockBlobContent);

        const mockDownload = jest.fn<() => Promise<SupabaseDownloadResponse>>();
        mockDownload.mockResolvedValueOnce({
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

        const result = await getQRCodeFromStorage(qrCodePath);

        expect(result).not.toBeNull();
        expect(Buffer.isBuffer(result)).toBe(true);
        expect(result?.toString()).toBe(mockBlobContent);
        expect(mockDownload).toHaveBeenCalledWith(qrCodePath);
      });

      it("should use correct bucket", async () => {
        const mockDownload = jest.fn<() => Promise<SupabaseDownloadResponse>>();
        mockDownload.mockResolvedValue({
          data: createMockBlob(),
          error: null,
        });

        const mockFrom = jest.fn();
        mockFrom.mockReturnValue({
          download: mockDownload,
        });

        mockGetStorageBucket.mockReturnValue("CustomBucket");
        mockCreateAdminClient.mockReturnValue({
          storage: {
            from: mockFrom,
          },
        } as unknown as SupabaseClient);

        await getQRCodeFromStorage("path/qr.png");

        expect(mockFrom).toHaveBeenCalledWith("CustomBucket");
      });

      it("should convert Blob to Buffer correctly", async () => {
        const binaryData = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
        const mockBlob = new Blob([binaryData], { type: "image/png" });

        const mockDownload = jest.fn<() => Promise<SupabaseDownloadResponse>>();
        mockDownload.mockResolvedValueOnce({
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

        const result = await getQRCodeFromStorage("qr.png");

        expect(result).not.toBeNull();
        expect(Buffer.isBuffer(result)).toBe(true);
        expect(result?.length).toBe(6);
      });
    });

    describe("error handling", () => {
      it("should return null when download fails with error", async () => {
        const mockDownload = jest.fn<() => Promise<SupabaseDownloadResponse>>();
        mockDownload.mockResolvedValueOnce({
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

        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        const result = await getQRCodeFromStorage("nonexistent.png");

        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith("QR Code download error:", {
          message: "File not found",
        });

        consoleErrorSpy.mockRestore();
      });

      it("should return null when data is null", async () => {
        const mockDownload = jest.fn<() => Promise<SupabaseDownloadResponse>>();
        mockDownload.mockResolvedValueOnce({
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

        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        const result = await getQRCodeFromStorage("missing.png");

        expect(result).toBeNull();

        consoleErrorSpy.mockRestore();
      });

      it("should log error to console when download fails", async () => {
        const mockDownload = jest.fn<() => Promise<SupabaseDownloadResponse>>();
        const downloadError = { message: "Permission denied" };
        mockDownload.mockResolvedValueOnce({
          data: null,
          error: downloadError,
        });

        mockGetStorageBucket.mockReturnValue("test-bucket");
        mockCreateAdminClient.mockReturnValue({
          storage: {
            from: jest.fn(() => ({
              download: mockDownload,
            })),
          },
        } as unknown as SupabaseClient);

        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        await getQRCodeFromStorage("restricted.png");

        expect(consoleErrorSpy).toHaveBeenCalledWith("QR Code download error:", downloadError);

        consoleErrorSpy.mockRestore();
      });

      it("should not throw error on failure (graceful handling)", async () => {
        const mockDownload = jest.fn<() => Promise<SupabaseDownloadResponse>>();
        mockDownload.mockResolvedValueOnce({
          data: null,
          error: { message: "Network error" },
        });

        mockGetStorageBucket.mockReturnValue("test-bucket");
        mockCreateAdminClient.mockReturnValue({
          storage: {
            from: jest.fn(() => ({
              download: mockDownload,
            })),
          },
        } as unknown as SupabaseClient);

        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        await expect(getQRCodeFromStorage("qr.png")).resolves.toBeNull();

        consoleErrorSpy.mockRestore();
      });
    });

    describe("data conversion", () => {
      it("should handle empty file (0 bytes)", async () => {
        const emptyBlob = new Blob([], { type: "image/png" });

        const mockDownload = jest.fn<() => Promise<SupabaseDownloadResponse>>();
        mockDownload.mockResolvedValueOnce({
          data: emptyBlob,
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

        const result = await getQRCodeFromStorage("empty.png");

        expect(result).not.toBeNull();
        expect(result?.length).toBe(0);
      });

      it("should handle large file (>5MB)", async () => {
        const largeContent = "x".repeat(6 * 1024 * 1024); // 6MB
        const largeBlob = createMockBlob(largeContent);

        const mockDownload = jest.fn<() => Promise<SupabaseDownloadResponse>>();
        mockDownload.mockResolvedValueOnce({
          data: largeBlob,
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

        const result = await getQRCodeFromStorage("large.png");

        expect(result).not.toBeNull();
        expect(result?.length).toBeGreaterThan(5 * 1024 * 1024);
      });

      it("should preserve binary data integrity", async () => {
        const binaryArray = new Uint8Array([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        ]);
        const mockBlob = new Blob([binaryArray]);

        const mockDownload = jest.fn<() => Promise<SupabaseDownloadResponse>>();
        mockDownload.mockResolvedValueOnce({
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

        const result = await getQRCodeFromStorage("binary.png");

        expect(result).not.toBeNull();
        expect(result?.[0]).toBe(0x89);
        expect(result?.[1]).toBe(0x50);
        expect(result?.[2]).toBe(0x4e);
        expect(result?.[3]).toBe(0x47);
      });
    });

    describe("path handling", () => {
      it("should handle different path formats", async () => {
        const paths = [
          "qr.png",
          "path/qr.png",
          "user/event/Photos/session/qr.png",
          "deep/nested/path/to/qr.png",
        ];

        for (const path of paths) {
          const mockDownload = jest.fn<() => Promise<SupabaseDownloadResponse>>();
          mockDownload.mockResolvedValueOnce({
            data: createMockBlob(),
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

          const result = await getQRCodeFromStorage(path);

          expect(result).not.toBeNull();
          expect(mockDownload).toHaveBeenCalledWith(path);
        }
      });

      it("should handle path with special characters", async () => {
        const specialPath = "user@test.com/event-2024/qr code.png";
        const mockDownload = jest.fn<() => Promise<SupabaseDownloadResponse>>();
        mockDownload.mockResolvedValueOnce({
          data: createMockBlob(),
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

        await getQRCodeFromStorage(specialPath);

        expect(mockDownload).toHaveBeenCalledWith(specialPath);
      });
    });
  });

  describe("integration scenarios", () => {
    it("should complete full workflow: generate, upload, then download QR code", async () => {
      const aiPhotoUrl = "user/event/photo.png";
      const userId = "user123";
      const eventId = "event456";
      const sessionId = "session789";
      const qrContent = "qr code content";

      // Step 1: Generate and upload
      const mockCreateSignedUrl = jest.fn<() => Promise<SupabaseSignedUrlResponse>>();
      mockCreateSignedUrl.mockResolvedValueOnce({
        data: { signedUrl: "https://example.com/signed" },
        error: null,
      });

      const mockDownload = jest.fn<() => Promise<SupabaseDownloadResponse>>();
      mockDownload.mockResolvedValue({
        data: createMockBlob(qrContent),
        error: null,
      });

      mockGetStorageBucket.mockReturnValue("PhotoBooth");
      const mockFrom = jest.fn();
      mockFrom.mockReturnValue({
        createSignedUrl: mockCreateSignedUrl,
        download: mockDownload,
      });
      mockCreateAdminClient.mockReturnValue({
        storage: {
          from: mockFrom,
        },
      } as unknown as SupabaseClient);

      mockGenerateQRCodeFile.mockResolvedValueOnce(createMockFile());
      const uploadedPath = `${userId}/${eventId}/Photos/${sessionId}/qr.png`;
      mockUploadToSupabase.mockResolvedValueOnce({ path: uploadedPath });

      const uploadResult = await generateAndUploadQRCode(aiPhotoUrl, userId, eventId, sessionId);

      expect(uploadResult).toBe(uploadedPath);

      // Step 2: Download the uploaded QR code
      const downloadResult = await getQRCodeFromStorage(uploadedPath);

      expect(downloadResult).not.toBeNull();
      expect(downloadResult?.toString()).toBe(qrContent);
    });

    it("should handle upload failure gracefully", async () => {
      const mockCreateSignedUrl = jest.fn<() => Promise<SupabaseSignedUrlResponse>>();
      mockCreateSignedUrl.mockResolvedValueOnce({
        data: { signedUrl: "https://example.com/signed" },
        error: null,
      });

      mockGetStorageBucket.mockReturnValue("test-bucket");
      mockCreateAdminClient.mockReturnValue({
        storage: {
          from: jest.fn(() => ({
            createSignedUrl: mockCreateSignedUrl,
          })),
        },
      } as unknown as SupabaseClient);

      mockGenerateQRCodeFile.mockResolvedValueOnce(createMockFile());
      mockUploadToSupabase.mockRejectedValueOnce(new Error("Storage quota exceeded"));

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      await expect(generateAndUploadQRCode("photo.png", "u1", "e1", "s1")).rejects.toThrow(
        "Storage quota exceeded",
      );

      consoleErrorSpy.mockRestore();
    });

    it("should handle download of non-existent QR code", async () => {
      const mockDownload = jest.fn<() => Promise<SupabaseDownloadResponse>>();
      mockDownload.mockResolvedValueOnce({
        data: null,
        error: { message: "Object not found" },
      });

      mockGetStorageBucket.mockReturnValue("test-bucket");
      mockCreateAdminClient.mockReturnValue({
        storage: {
          from: jest.fn(() => ({
            download: mockDownload,
          })),
        },
      } as unknown as SupabaseClient);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const result = await getQRCodeFromStorage("nonexistent/qr.png");

      expect(result).toBeNull();

      consoleErrorSpy.mockRestore();
    });

    it("should handle retry scenario with upsert", async () => {
      const mockCreateSignedUrl = jest.fn<() => Promise<SupabaseSignedUrlResponse>>();
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: "https://example.com/signed" },
        error: null,
      });

      mockGetStorageBucket.mockReturnValue("test-bucket");
      const mockFrom = jest.fn();
      mockFrom.mockReturnValue({
        createSignedUrl: mockCreateSignedUrl,
      });
      mockCreateAdminClient.mockReturnValue({
        storage: {
          from: mockFrom,
        },
      } as unknown as SupabaseClient);

      mockGenerateQRCodeFile.mockResolvedValue(createMockFile());
      mockUploadToSupabase.mockResolvedValue({ path: "path/qr.png" });

      await generateAndUploadQRCode("photo.png", "u1", "e1", "s1");
      await generateAndUploadQRCode("photo.png", "u1", "e1", "s1");

      expect(mockUploadToSupabase).toHaveBeenCalledTimes(2);
      expect(mockUploadToSupabase).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        expect.objectContaining({
          upsert: true,
        }),
      );
    });
  });
});
