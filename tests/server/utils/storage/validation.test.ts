import { describe, it, expect } from "@jest/globals";
import {
  inferMimeFromFilename,
  getExtLower,
  normalizeFilePart,
  validateFileExtension,
  validateFileType,
  validateFileSize,
  validateFileOrThrow,
} from "~/server/utils/storage/validation.utils";
import type { UploadFile, FilePart } from "~~/server/types/storage";
import { MAX_FILE_SIZE } from "~~/server/types/storage";
import { ERROR_STATUS_MAP } from "~~/server/types/core";

describe("Storage Validation Utils", () => {
  describe("inferMimeFromFilename", () => {
    type Case = {
      name: string;
      filename: string;
      expected: string;
    };

    const cases: Case[] = [
      {
        name: "png extension",
        filename: "image.png",
        expected: "image/png",
      },
      {
        name: "jpg extension",
        filename: "photo.jpg",
        expected: "image/jpeg",
      },
      {
        name: "jpeg extension",
        filename: "picture.jpeg",
        expected: "image/jpeg",
      },
      {
        name: "webp extension",
        filename: "modern.webp",
        expected: "image/webp",
      },
      {
        name: "svg extension",
        filename: "icon.svg",
        expected: "image/svg+xml",
      },
      {
        name: "ico extension",
        filename: "favicon.ico",
        expected: "image/x-icon",
      },
    ];

    cases.forEach((testCase) => {
      it(`should infer MIME type for ${testCase.name}`, () => {
        const result = inferMimeFromFilename(testCase.filename);
        expect(result).toBe(testCase.expected);
      });
    });

    it("should return fallback for unknown extension", () => {
      const result = inferMimeFromFilename("file.unknown");
      expect(result).toBe("image/jpeg");
    });

    it("should return custom fallback for unknown extension", () => {
      const result = inferMimeFromFilename("file.xyz", "image/png");
      expect(result).toBe("image/png");
    });

    it("should handle filename without extension", () => {
      const result = inferMimeFromFilename("noextension");
      expect(result).toBe("image/jpeg");
    });

    it("should handle uppercase extensions", () => {
      const result = inferMimeFromFilename("IMAGE.PNG");
      expect(result).toBe("image/png");
    });

    it("should handle mixed case extensions", () => {
      const result = inferMimeFromFilename("photo.JpG");
      expect(result).toBe("image/jpeg");
    });

    it("should handle multiple dots in filename", () => {
      const result = inferMimeFromFilename("my.photo.file.webp");
      expect(result).toBe("image/webp");
    });
  });

  describe("getExtLower", () => {
    type Case = {
      name: string;
      filename: string;
      expected: string;
    };

    const cases: Case[] = [
      { name: "lowercase extension", filename: "file.png", expected: "png" },
      { name: "uppercase extension", filename: "FILE.PNG", expected: "png" },
      {
        name: "mixed case extension",
        filename: "Image.JpEg",
        expected: "jpeg",
      },
      { name: "multiple dots", filename: "my.file.name.jpg", expected: "jpg" },
    ];

    cases.forEach((testCase) => {
      it(`should extract ${testCase.name}`, () => {
        const result = getExtLower(testCase.filename);
        expect(result).toBe(testCase.expected);
      });
    });

    it("should return filename for no extension", () => {
      const result = getExtLower("filename");
      expect(result).toBe("filename");
    });

    it("should return empty string for dot only", () => {
      const result = getExtLower(".");
      expect(result).toBe("");
    });

    it("should handle empty filename", () => {
      const result = getExtLower("");
      expect(result).toBe("");
    });
  });

  describe("normalizeFilePart", () => {
    it("should normalize file part with all fields", () => {
      const filePart: FilePart = {
        filename: "test.png",
        type: "image/png",
        data: Buffer.from("test data"),
      };

      const result = normalizeFilePart(filePart);

      expect(result).not.toBeNull();
      expect(result?.name).toBe("test.png");
      expect(result?.type).toBe("image/png");
      expect(result?.size).toBe(9);
      expect(Buffer.isBuffer(result?.data)).toBe(true);
    });

    it("should return null when filename is missing", () => {
      const filePart: FilePart = {
        data: Buffer.from("test data"),
      };

      const result = normalizeFilePart(filePart);

      expect(result).toBeNull();
    });

    it("should return null when data is missing", () => {
      const filePart: FilePart = {
        filename: "test.png",
      };

      const result = normalizeFilePart(filePart);

      expect(result).toBeNull();
    });

    it("should return null when both filename and data are missing", () => {
      const filePart: FilePart = {};

      const result = normalizeFilePart(filePart);

      expect(result).toBeNull();
    });

    it("should infer MIME type when type is not provided", () => {
      const filePart: FilePart = {
        filename: "photo.jpg",
        data: Buffer.from("image data"),
      };

      const result = normalizeFilePart(filePart);

      expect(result?.type).toBe("image/jpeg");
    });

    it("should convert string data to Buffer", () => {
      const filePart: FilePart = {
        filename: "test.txt",
        data: "string data",
      };

      const result = normalizeFilePart(filePart);

      expect(result).not.toBeNull();
      expect(Buffer.isBuffer(result?.data)).toBe(true);
      expect(result?.size).toBeGreaterThan(0);
    });

    it("should convert Uint8Array data to Buffer", () => {
      const uint8Data = new Uint8Array([1, 2, 3, 4]);
      const filePart: FilePart = {
        filename: "binary.bin",
        data: uint8Data,
      };

      const result = normalizeFilePart(filePart);

      expect(result).not.toBeNull();
      expect(Buffer.isBuffer(result?.data)).toBe(true);
      expect(result?.size).toBe(4);
    });

    it("should handle null filename", () => {
      const filePart: FilePart = {
        filename: null,
        data: Buffer.from("data"),
      };

      const result = normalizeFilePart(filePart);

      expect(result).toBeNull();
    });

    it("should handle null data", () => {
      const filePart: FilePart = {
        filename: "test.png",
        data: null,
      };

      const result = normalizeFilePart(filePart);

      expect(result).toBeNull();
    });
  });

  describe("validateFileExtension", () => {
    const allowedExts = ["png", "jpg", "jpeg"];

    it("should not throw for valid extension", () => {
      expect(() => {
        validateFileExtension("image.png", allowedExts);
      }).not.toThrow();
    });

    it("should not throw for valid extension regardless of case", () => {
      expect(() => {
        validateFileExtension("IMAGE.PNG", allowedExts);
      }).not.toThrow();
    });

    it("should throw error for invalid extension", () => {
      expect(() => {
        validateFileExtension("file.gif", allowedExts);
      }).toThrow(
        expect.objectContaining({
          statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
          statusMessage: "Invalid file extension. Allowed: png, jpg, jpeg",
        }),
      );
    });

    it("should throw error for missing extension", () => {
      expect(() => {
        validateFileExtension("filename", allowedExts);
      }).toThrow(
        expect.objectContaining({
          statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
          statusMessage: "Invalid file extension. Allowed: png, jpg, jpeg",
        }),
      );
    });

    it("should throw error for empty filename", () => {
      expect(() => {
        validateFileExtension("", allowedExts);
      }).toThrow(
        expect.objectContaining({
          statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
          statusMessage: "File must have a valid extension",
        }),
      );
    });

    it("should validate against default allowed extensions", () => {
      expect(() => {
        validateFileExtension("icon.svg", ["svg", "ico"]);
      }).not.toThrow();
    });
  });

  describe("validateFileType", () => {
    const allowedTypes = ["image/png", "image/jpeg"];

    it("should not throw for valid MIME type", () => {
      expect(() => {
        validateFileType("image/png", allowedTypes);
      }).not.toThrow();
    });

    it("should throw error for invalid MIME type", () => {
      expect(() => {
        validateFileType("image/gif", allowedTypes);
      }).toThrow(
        expect.objectContaining({
          statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
          statusMessage: "Invalid file type. Allowed: image/png, image/jpeg",
        }),
      );
    });

    it("should throw error for non-image type", () => {
      expect(() => {
        validateFileType("application/pdf", allowedTypes);
      }).toThrow(
        expect.objectContaining({
          statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
        }),
      );
    });

    it("should validate exact MIME type match", () => {
      expect(() => {
        validateFileType("image/jpeg", [
          "image/png",
          "image/jpeg",
          "image/webp",
        ]);
      }).not.toThrow();
    });
  });

  describe("validateFileSize", () => {
    const maxSize = 5 * 1024 * 1024;

    it("should not throw for file within size limit", () => {
      expect(() => {
        validateFileSize(1024, maxSize);
      }).not.toThrow();
    });

    it("should not throw for file exactly at size limit", () => {
      expect(() => {
        validateFileSize(maxSize, maxSize);
      }).not.toThrow();
    });

    it("should throw error for file exceeding size limit", () => {
      expect(() => {
        validateFileSize(maxSize + 1, maxSize);
      }).toThrow(
        expect.objectContaining({
          statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
          statusMessage: "File too large. Maximum size is 5MB",
        }),
      );
    });

    it("should calculate MB correctly in error message", () => {
      const size = 10 * 1024 * 1024;
      expect(() => {
        validateFileSize(size + 1, size);
      }).toThrow(
        expect.objectContaining({
          statusMessage: "File too large. Maximum size is 10MB",
        }),
      );
    });

    it("should handle zero size", () => {
      expect(() => {
        validateFileSize(0, maxSize);
      }).not.toThrow();
    });

    it("should handle very large files", () => {
      const largeSize = 100 * 1024 * 1024;
      expect(() => {
        validateFileSize(largeSize, maxSize);
      }).toThrow(
        expect.objectContaining({
          statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
        }),
      );
    });
  });

  describe("validateFileOrThrow", () => {
    const createMockFile = (
      name: string,
      type: string,
      size: number,
    ): UploadFile => ({
      name,
      type,
      data: Buffer.alloc(size),
      size,
    });

    describe("valid files", () => {
      it("should not throw for valid PNG file", () => {
        const file = createMockFile("image.png", "image/png", 1024);
        expect(() => {
          validateFileOrThrow(file);
        }).not.toThrow();
      });

      it("should not throw for valid JPEG file", () => {
        const file = createMockFile("photo.jpg", "image/jpeg", 2048);
        expect(() => {
          validateFileOrThrow(file);
        }).not.toThrow();
      });

      it("should not throw for file at maximum size", () => {
        const file = createMockFile("large.png", "image/png", MAX_FILE_SIZE);
        expect(() => {
          validateFileOrThrow(file);
        }).not.toThrow();
      });
    });

    describe("invalid extension", () => {
      it("should throw for invalid extension", () => {
        const file = createMockFile("image.gif", "image/gif", 1024);
        expect(() => {
          validateFileOrThrow(file);
        }).toThrow(
          expect.objectContaining({
            statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
            statusMessage: expect.stringContaining("Invalid file extension"),
          }),
        );
      });

      it("should throw for missing extension", () => {
        const file = createMockFile("filename", "image/png", 1024);
        expect(() => {
          validateFileOrThrow(file);
        }).toThrow(
          expect.objectContaining({
            statusMessage: expect.stringContaining("Invalid file extension"),
          }),
        );
      });
    });

    describe("invalid type", () => {
      it("should throw for invalid MIME type", () => {
        const file = createMockFile("document.pdf", "application/pdf", 1024);
        expect(() => {
          validateFileOrThrow(file);
        }).toThrow(
          expect.objectContaining({
            statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
            statusMessage: expect.stringContaining("Invalid file extension"),
          }),
        );
      });

      it("should throw for wrong MIME type", () => {
        const file = createMockFile("image.png", "image/gif", 1024);
        expect(() => {
          validateFileOrThrow(file);
        }).toThrow(
          expect.objectContaining({
            statusMessage: expect.stringContaining("Invalid file type"),
          }),
        );
      });
    });

    describe("invalid size", () => {
      it("should throw for file exceeding size limit", () => {
        const file = createMockFile("huge.png", "image/png", MAX_FILE_SIZE + 1);
        expect(() => {
          validateFileOrThrow(file);
        }).toThrow(
          expect.objectContaining({
            statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
            statusMessage: expect.stringContaining("File too large"),
          }),
        );
      });
    });

    describe("custom options", () => {
      it("should validate with custom allowed types", () => {
        const file = createMockFile("image.webp", "image/webp", 1024);
        expect(() => {
          validateFileOrThrow(file, {
            allowTypes: ["image/webp"],
          });
        }).not.toThrow();
      });

      it("should validate with custom allowed extensions", () => {
        const file = createMockFile("icon.svg", "image/svg+xml", 1024);
        expect(() => {
          validateFileOrThrow(file, {
            allowExts: ["svg"],
          });
        }).not.toThrow();
      });

      it("should validate with custom max size", () => {
        const customMaxSize = 1024;
        const file = createMockFile("small.png", "image/png", 512);
        expect(() => {
          validateFileOrThrow(file, {
            maxSize: customMaxSize,
          });
        }).not.toThrow();
      });

      it("should throw when exceeding custom max size", () => {
        const customMaxSize = 1024;
        const file = createMockFile("large.png", "image/png", 2048);
        expect(() => {
          validateFileOrThrow(file, {
            maxSize: customMaxSize,
          });
        }).toThrow(
          expect.objectContaining({
            statusMessage: expect.stringContaining("File too large"),
          }),
        );
      });

      it("should validate with all custom options", () => {
        const file = createMockFile("custom.webp", "image/webp", 512);
        expect(() => {
          validateFileOrThrow(file, {
            allowTypes: ["image/webp"],
            allowExts: ["webp"],
            maxSize: 1024,
          });
        }).not.toThrow();
      });
    });

    describe("edge cases", () => {
      it("should validate empty options object", () => {
        const file = createMockFile("test.png", "image/png", 1024);
        expect(() => {
          validateFileOrThrow(file, {});
        }).not.toThrow();
      });

      it("should validate with undefined options", () => {
        const file = createMockFile("test.jpg", "image/jpeg", 1024);
        expect(() => {
          validateFileOrThrow(file, undefined);
        }).not.toThrow();
      });

      it("should handle zero-sized file", () => {
        const file = createMockFile("empty.png", "image/png", 0);
        expect(() => {
          validateFileOrThrow(file);
        }).not.toThrow();
      });
    });
  });

  describe("error response structure", () => {
    type ValidationError = {
      statusCode: number;
      statusMessage: string;
      data: {
        success: boolean;
        error: {
          code: string;
          type: string;
          message: string;
          statusCode: number;
        };
      };
    };

    it("should include error data in validation error", () => {
      const file: UploadFile = {
        name: "test.gif",
        type: "image/gif",
        data: Buffer.alloc(1024),
        size: 1024,
      };

      try {
        validateFileOrThrow(file);
        fail("Should have thrown an error");
      } catch (error) {
        const validationError = error as ValidationError;
        expect(validationError).toHaveProperty(
          "statusCode",
          ERROR_STATUS_MAP.VALIDATION_ERROR,
        );
        expect(validationError).toHaveProperty("statusMessage");
        expect(validationError).toHaveProperty("data");
        expect(validationError.data).toHaveProperty("success", false);
        expect(validationError.data).toHaveProperty("error");
      }
    });

    it("should include error code in validation error", () => {
      const file: UploadFile = {
        name: "test",
        type: "image/png",
        data: Buffer.alloc(1024),
        size: 1024,
      };

      try {
        validateFileOrThrow(file);
        fail("Should have thrown an error");
      } catch (error) {
        const validationError = error as ValidationError;
        expect(validationError.data.error).toHaveProperty(
          "code",
          "INVALID_FILE_EXTENSION",
        );
        expect(validationError.data.error).toHaveProperty(
          "type",
          "VALIDATION_ERROR",
        );
      }
    });
  });
});
