import { describe, it, expect, beforeAll, beforeEach, jest } from "@jest/globals";
import type QRCodeType from "qrcode";
import type { UploadFile } from "~~/server/types/storage";

const mockToBuffer =
  jest.fn<(text: string, options?: QRCodeType.QRCodeToBufferOptions) => Promise<Buffer>>();

jest.mock("qrcode", () => ({
  __esModule: true,
  default: {
    toBuffer: mockToBuffer,
  },
}));

let generateQRCode: (data: string, options?: QRCodeType.QRCodeToBufferOptions) => Promise<Buffer>;
let createQRCodeFile: (buffer: Buffer, filename?: string) => UploadFile;
let generateQRCodeFile: (
  data: string,
  filename?: string,
  options?: QRCodeType.QRCodeToBufferOptions,
) => Promise<UploadFile>;

beforeAll(async () => {
  const module = await import("~/server/utils/qrcode/qrcode.utils");
  generateQRCode = module.generateQRCode;
  createQRCodeFile = module.createQRCodeFile;
  generateQRCodeFile = module.generateQRCodeFile;
});

const createMockBuffer = (content = "mock qr code data"): Buffer => {
  return Buffer.from(content);
};

describe("QRCode Utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateQRCode", () => {
    describe("basic functionality", () => {
      it("should generate QR code buffer successfully with simple URL", async () => {
        const mockBuffer = createMockBuffer();
        mockToBuffer.mockResolvedValueOnce(mockBuffer);

        const result = await generateQRCode("https://example.com");

        expect(result).toBe(mockBuffer);
        expect(mockToBuffer).toHaveBeenCalledWith("https://example.com", {
          type: "png",
          width: 300,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });
      });

      it("should use default configuration (width=300, margin=2)", async () => {
        const mockBuffer = createMockBuffer();
        mockToBuffer.mockResolvedValueOnce(mockBuffer);

        await generateQRCode("test data");

        expect(mockToBuffer).toHaveBeenCalledWith(
          "test data",
          expect.objectContaining({
            width: 300,
            margin: 2,
          }),
        );
      });

      it("should generate QR code with custom width", async () => {
        const mockBuffer = createMockBuffer();
        mockToBuffer.mockResolvedValueOnce(mockBuffer);

        await generateQRCode("test", { width: 500 });

        expect(mockToBuffer).toHaveBeenCalledWith(
          "test",
          expect.objectContaining({
            width: 500,
          }),
        );
      });

      it("should generate QR code with custom colors", async () => {
        const mockBuffer = createMockBuffer();
        mockToBuffer.mockResolvedValueOnce(mockBuffer);

        await generateQRCode("test", {
          color: {
            dark: "#FF0000",
            light: "#00FF00",
          },
        });

        expect(mockToBuffer).toHaveBeenCalledWith(
          "test",
          expect.objectContaining({
            color: {
              dark: "#FF0000",
              light: "#00FF00",
            },
          }),
        );
      });

      it("should generate QR code with custom margin", async () => {
        const mockBuffer = createMockBuffer();
        mockToBuffer.mockResolvedValueOnce(mockBuffer);

        await generateQRCode("test", { margin: 5 });

        expect(mockToBuffer).toHaveBeenCalledWith(
          "test",
          expect.objectContaining({
            margin: 5,
          }),
        );
      });

      it("should override default options with custom options", async () => {
        const mockBuffer = createMockBuffer();
        mockToBuffer.mockResolvedValueOnce(mockBuffer);

        await generateQRCode("test", {
          width: 600,
          margin: 10,
          color: {
            dark: "#0000FF",
            light: "#FFFF00",
          },
        });

        expect(mockToBuffer).toHaveBeenCalledWith("test", {
          type: "png",
          width: 600,
          margin: 10,
          color: {
            dark: "#0000FF",
            light: "#FFFF00",
          },
        });
      });
    });

    describe("boundary cases", () => {
      it("should handle empty string input", async () => {
        const mockBuffer = createMockBuffer();
        mockToBuffer.mockResolvedValueOnce(mockBuffer);

        const result = await generateQRCode("");

        expect(result).toBe(mockBuffer);
        expect(mockToBuffer).toHaveBeenCalledWith("", expect.any(Object));
      });

      it("should handle very long data input", async () => {
        const longData = "a".repeat(3000);
        const mockBuffer = createMockBuffer();
        mockToBuffer.mockResolvedValueOnce(mockBuffer);

        const result = await generateQRCode(longData);

        expect(result).toBe(mockBuffer);
        expect(mockToBuffer).toHaveBeenCalledWith(longData, expect.any(Object));
      });

      it("should handle special characters", async () => {
        const specialData = "Hello Wrold! \n\t@#$%^&*()";
        const mockBuffer = createMockBuffer();
        mockToBuffer.mockResolvedValueOnce(mockBuffer);

        const result = await generateQRCode(specialData);

        expect(result).toBe(mockBuffer);
        expect(mockToBuffer).toHaveBeenCalledWith(specialData, expect.any(Object));
      });

      it("should handle Chinese characters", async () => {
        const mockBuffer = createMockBuffer();
        mockToBuffer.mockResolvedValueOnce(mockBuffer);

        const result = await generateQRCode("Hello World!");

        expect(result).toBe(mockBuffer);
      });

      it("should handle emoji characters", async () => {
        const mockBuffer = createMockBuffer();
        mockToBuffer.mockResolvedValueOnce(mockBuffer);

        const result = await generateQRCode("1233456");

        expect(result).toBe(mockBuffer);
      });

      it("should handle newlines and tabs", async () => {
        const mockBuffer = createMockBuffer();
        mockToBuffer.mockResolvedValueOnce(mockBuffer);

        const result = await generateQRCode("line1\nline2\tcolumn");

        expect(result).toBe(mockBuffer);
      });

      it("should handle URL encoded data", async () => {
        const encodedUrl = "https://example.com?param=%E4%B8%AD%E6%96%87";
        const mockBuffer = createMockBuffer();
        mockToBuffer.mockResolvedValueOnce(mockBuffer);

        const result = await generateQRCode(encodedUrl);

        expect(result).toBe(mockBuffer);
      });

      it("should handle data with query parameters", async () => {
        const urlWithParams =
          "https://example.com/path?key1=value1&key2=value2&redirect=http://other.com";
        const mockBuffer = createMockBuffer();
        mockToBuffer.mockResolvedValueOnce(mockBuffer);

        const result = await generateQRCode(urlWithParams);

        expect(result).toBe(mockBuffer);
      });
    });

    describe("error handling", () => {
      it("should throw error when QRCode.toBuffer fails", async () => {
        const mockError = new Error("QR generation failed");
        mockToBuffer.mockRejectedValueOnce(mockError);

        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        await expect(generateQRCode("test")).rejects.toThrow("Failed to generate QR code");

        expect(consoleErrorSpy).toHaveBeenCalledWith("QR Code generation error:", mockError);

        consoleErrorSpy.mockRestore();
      });

      it("should log error to console when generation fails", async () => {
        const mockError = new Error("Buffer creation error");
        mockToBuffer.mockRejectedValueOnce(mockError);

        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        await expect(generateQRCode("test")).rejects.toThrow();

        expect(consoleErrorSpy).toHaveBeenCalledWith("QR Code generation error:", mockError);

        consoleErrorSpy.mockRestore();
      });

      it("should handle non-Error exceptions", async () => {
        mockToBuffer.mockRejectedValueOnce("String error");

        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        await expect(generateQRCode("test")).rejects.toThrow("Failed to generate QR code");

        expect(consoleErrorSpy).toHaveBeenCalledWith("QR Code generation error:", "String error");

        consoleErrorSpy.mockRestore();
      });

      it("should preserve error message in thrown error", async () => {
        const mockError = new Error("Custom error message");
        mockToBuffer.mockRejectedValueOnce(mockError);

        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        try {
          await generateQRCode("test");
          fail("Should have thrown an error");
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          if (error instanceof Error) {
            expect(error.message).toBe("Failed to generate QR code");
          }
        }

        consoleErrorSpy.mockRestore();
      });
    });

    describe("options merging", () => {
      it("should merge custom options with default options", async () => {
        const mockBuffer = createMockBuffer();
        mockToBuffer.mockResolvedValueOnce(mockBuffer);

        await generateQRCode("test", { width: 400 });

        expect(mockToBuffer).toHaveBeenCalledWith("test", {
          type: "png",
          width: 400,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });
      });

      it("should allow partial color override", async () => {
        const mockBuffer = createMockBuffer();
        mockToBuffer.mockResolvedValueOnce(mockBuffer);

        await generateQRCode("test", {
          color: {
            dark: "#FF0000",
            light: "#FFFFFF",
          },
        });

        expect(mockToBuffer).toHaveBeenCalledWith(
          "test",
          expect.objectContaining({
            color: {
              dark: "#FF0000",
              light: "#FFFFFF",
            },
          }),
        );
      });
    });
  });

  describe("createQRCodeFile", () => {
    describe("basic functionality", () => {
      it("should create correct UploadFile object structure", () => {
        const buffer = createMockBuffer();

        const result = createQRCodeFile(buffer);

        expect(result).toEqual({
          name: "qr.png",
          type: "image/png",
          data: buffer,
          size: buffer.length,
        });
      });

      it("should use default filename 'qr.png'", () => {
        const buffer = createMockBuffer();

        const result = createQRCodeFile(buffer);

        expect(result.name).toBe("qr.png");
      });

      it("should use custom filename when provided", () => {
        const buffer = createMockBuffer();

        const result = createQRCodeFile(buffer, "custom-qr.png");

        expect(result.name).toBe("custom-qr.png");
      });

      it("should always set type to 'image/png'", () => {
        const buffer = createMockBuffer();

        const result = createQRCodeFile(buffer, "test.jpg");

        expect(result.type).toBe("image/png");
      });

      it("should set size equal to buffer length", () => {
        const content = "test qr code data with some length";
        const buffer = Buffer.from(content);

        const result = createQRCodeFile(buffer);

        expect(result.size).toBe(buffer.length);
        expect(result.size).toBe(content.length);
      });

      it("should correctly preserve buffer data", () => {
        const content = "specific qr code content";
        const buffer = Buffer.from(content);

        const result = createQRCodeFile(buffer);

        expect(result.data).toBe(buffer);
        expect(result.data.toString()).toBe(content);
      });
    });

    describe("buffer validation", () => {
      it("should handle empty buffer (size=0)", () => {
        const buffer = Buffer.from("");

        const result = createQRCodeFile(buffer);

        expect(result.size).toBe(0);
        expect(result.data).toBe(buffer);
      });

      it("should handle small buffer", () => {
        const buffer = Buffer.from("a");

        const result = createQRCodeFile(buffer);

        expect(result.size).toBe(1);
      });

      it("should handle large buffer (>1MB)", () => {
        const largeContent = "x".repeat(2 * 1024 * 1024);
        const buffer = Buffer.from(largeContent);

        const result = createQRCodeFile(buffer);

        expect(result.size).toBe(buffer.length);
        expect(result.size).toBeGreaterThan(1024 * 1024);
      });

      it("should handle binary buffer data", () => {
        const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

        const result = createQRCodeFile(buffer);

        expect(result.data).toBe(buffer);
        expect(result.size).toBe(8);
      });
    });

    describe("filename edge cases", () => {
      it("should handle filename with path", () => {
        const buffer = createMockBuffer();

        const result = createQRCodeFile(buffer, "path/to/qr.png");

        expect(result.name).toBe("path/to/qr.png");
      });

      it("should handle filename with special characters", () => {
        const buffer = createMockBuffer();

        const result = createQRCodeFile(buffer, "qr-code_2024@event.png");

        expect(result.name).toBe("qr-code_2024@event.png");
      });

      it("should handle filename without extension", () => {
        const buffer = createMockBuffer();

        const result = createQRCodeFile(buffer, "qrcode");

        expect(result.name).toBe("qrcode");
        expect(result.type).toBe("image/png");
      });

      it("should handle filename with different extension", () => {
        const buffer = createMockBuffer();

        const result = createQRCodeFile(buffer, "qr.jpg");

        expect(result.name).toBe("qr.jpg");
        expect(result.type).toBe("image/png");
      });

      it("should handle very long filename", () => {
        const buffer = createMockBuffer();
        const longName = "a".repeat(200) + ".png";

        const result = createQRCodeFile(buffer, longName);

        expect(result.name).toBe(longName);
      });

      it("should handle filename with spaces", () => {
        const buffer = createMockBuffer();

        const result = createQRCodeFile(buffer, "my qr code.png");

        expect(result.name).toBe("my qr code.png");
      });

      it("should handle filename with unicode characters", () => {
        const buffer = createMockBuffer();

        const result = createQRCodeFile(buffer, "qrcode.png");

        expect(result.name).toBe("qrcode.png");
      });
    });

    describe("return type validation", () => {
      it("should return object with all required UploadFile properties", () => {
        const buffer = createMockBuffer();

        const result = createQRCodeFile(buffer);

        expect(result).toHaveProperty("name");
        expect(result).toHaveProperty("type");
        expect(result).toHaveProperty("data");
        expect(result).toHaveProperty("size");
      });

      it("should return object with correct property types", () => {
        const buffer = createMockBuffer();

        const result = createQRCodeFile(buffer);

        expect(typeof result.name).toBe("string");
        expect(typeof result.type).toBe("string");
        expect(Buffer.isBuffer(result.data)).toBe(true);
        expect(typeof result.size).toBe("number");
      });
    });
  });

  describe("generateQRCodeFile", () => {
    describe("integration functionality", () => {
      it("should generate complete QR code file with default filename", async () => {
        const mockBuffer = createMockBuffer();
        mockToBuffer.mockResolvedValueOnce(mockBuffer);

        const result = await generateQRCodeFile("https://example.com");

        expect(result).toEqual({
          name: "qr.png",
          type: "image/png",
          data: mockBuffer,
          size: mockBuffer.length,
        });
        expect(mockToBuffer).toHaveBeenCalledWith("https://example.com", expect.any(Object));
      });

      it("should generate QR code file with custom filename", async () => {
        const mockBuffer = createMockBuffer();
        mockToBuffer.mockResolvedValueOnce(mockBuffer);

        const result = await generateQRCodeFile("test data", "custom.png");

        expect(result.name).toBe("custom.png");
        expect(result.data).toBe(mockBuffer);
      });

      it("should generate QR code file with custom options", async () => {
        const mockBuffer = createMockBuffer();
        mockToBuffer.mockResolvedValueOnce(mockBuffer);

        const result = await generateQRCodeFile("test", "qr.png", { width: 500, margin: 5 });

        expect(result.data).toBe(mockBuffer);
        expect(mockToBuffer).toHaveBeenCalledWith(
          "test",
          expect.objectContaining({
            width: 500,
            margin: 5,
          }),
        );
      });

      it("should return UploadFile with correct structure", async () => {
        const mockBuffer = createMockBuffer("specific content");
        mockToBuffer.mockResolvedValueOnce(mockBuffer);

        const result = await generateQRCodeFile("data", "test.png");

        expect(result).toMatchObject({
          name: "test.png",
          type: "image/png",
          data: mockBuffer,
          size: mockBuffer.length,
        });
      });
    });

    describe("options propagation", () => {
      it("should pass options to generateQRCode", async () => {
        const mockBuffer = createMockBuffer();
        mockToBuffer.mockResolvedValueOnce(mockBuffer);

        await generateQRCodeFile("test", "qr.png", {
          width: 600,
          margin: 10,
        });

        expect(mockToBuffer).toHaveBeenCalledWith(
          "test",
          expect.objectContaining({
            width: 600,
            margin: 10,
          }),
        );
      });

      it("should pass color options correctly", async () => {
        const mockBuffer = createMockBuffer();
        mockToBuffer.mockResolvedValueOnce(mockBuffer);

        await generateQRCodeFile("test", "qr.png", {
          color: {
            dark: "#FF0000",
            light: "#00FF00",
          },
        });

        expect(mockToBuffer).toHaveBeenCalledWith(
          "test",
          expect.objectContaining({
            color: {
              dark: "#FF0000",
              light: "#00FF00",
            },
          }),
        );
      });

      it("should work without options parameter", async () => {
        const mockBuffer = createMockBuffer();
        mockToBuffer.mockResolvedValueOnce(mockBuffer);

        const result = await generateQRCodeFile("test", "qr.png");

        expect(result.data).toBe(mockBuffer);
        expect(mockToBuffer).toHaveBeenCalled();
      });

      it("should use default filename when not provided", async () => {
        const mockBuffer = createMockBuffer();
        mockToBuffer.mockResolvedValueOnce(mockBuffer);

        const result = await generateQRCodeFile("test");

        expect(result.name).toBe("qr.png");
      });
    });

    describe("error propagation", () => {
      it("should propagate errors from generateQRCode", async () => {
        const mockError = new Error("Generation failed");
        mockToBuffer.mockRejectedValueOnce(mockError);

        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        await expect(generateQRCodeFile("test")).rejects.toThrow("Failed to generate QR code");

        consoleErrorSpy.mockRestore();
      });

      it("should include original error message", async () => {
        const specificError = new Error("Specific QR error");
        mockToBuffer.mockRejectedValueOnce(specificError);

        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        try {
          await generateQRCodeFile("test", "qr.png");
          fail("Should have thrown an error");
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          if (error instanceof Error) {
            expect(error.message).toBe("Failed to generate QR code");
          }
        }

        expect(consoleErrorSpy).toHaveBeenCalledWith("QR Code generation error:", specificError);

        consoleErrorSpy.mockRestore();
      });

      it("should handle errors with custom filename", async () => {
        mockToBuffer.mockRejectedValueOnce(new Error("Failed"));

        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        await expect(generateQRCodeFile("test", "custom.png")).rejects.toThrow(
          "Failed to generate QR code",
        );

        consoleErrorSpy.mockRestore();
      });

      it("should handle errors with custom options", async () => {
        mockToBuffer.mockRejectedValueOnce(new Error("Failed"));

        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        await expect(generateQRCodeFile("test", "qr.png", { width: 1000 })).rejects.toThrow(
          "Failed to generate QR code",
        );

        consoleErrorSpy.mockRestore();
      });
    });

    describe("real-world scenarios", () => {
      it("should generate QR code for share URL", async () => {
        const shareUrl =
          "https://example.com/share/photo?id=abc123&token=xyz789&expires=1234567890";
        const mockBuffer = createMockBuffer();
        mockToBuffer.mockResolvedValueOnce(mockBuffer);

        const result = await generateQRCodeFile(shareUrl, "share-qr.png");

        expect(result.name).toBe("share-qr.png");
        expect(result.type).toBe("image/png");
        expect(mockToBuffer).toHaveBeenCalledWith(shareUrl, expect.any(Object));
      });

      it("should generate QR code for event with custom size", async () => {
        const eventUrl = "https://event.example.com/12345";
        const mockBuffer = createMockBuffer();
        mockToBuffer.mockResolvedValueOnce(mockBuffer);

        const result = await generateQRCodeFile(eventUrl, "event-qr.png", {
          width: 800,
          margin: 4,
        });

        expect(result.name).toBe("event-qr.png");
        expect(mockToBuffer).toHaveBeenCalledWith(
          eventUrl,
          expect.objectContaining({
            width: 800,
            margin: 4,
          }),
        );
      });

      it("should generate QR code with branded colors", async () => {
        const mockBuffer = createMockBuffer();
        mockToBuffer.mockResolvedValueOnce(mockBuffer);

        const result = await generateQRCodeFile("https://brand.com", "branded-qr.png", {
          color: {
            dark: "#1E40AF",
            light: "#FFFFFF",
          },
        });

        expect(result.type).toBe("image/png");
        expect(mockToBuffer).toHaveBeenCalledWith(
          "https://brand.com",
          expect.objectContaining({
            color: {
              dark: "#1E40AF",
              light: "#FFFFFF",
            },
          }),
        );
      });
    });
  });

  describe("integration scenarios", () => {
    it("should complete full workflow: generate QR code and create file", async () => {
      const testData = "https://example.com/photo/abc123";
      const mockBuffer = createMockBuffer("actual qr code data");
      mockToBuffer.mockResolvedValueOnce(mockBuffer);

      const result = await generateQRCodeFile(testData, "photo-qr.png");

      expect(result).toEqual({
        name: "photo-qr.png",
        type: "image/png",
        data: mockBuffer,
        size: mockBuffer.length,
      });
      expect(mockToBuffer).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple QR code generations", async () => {
      const mockBuffer1 = createMockBuffer("qr1");
      const mockBuffer2 = createMockBuffer("qr2");
      const mockBuffer3 = createMockBuffer("qr3");

      mockToBuffer
        .mockResolvedValueOnce(mockBuffer1)
        .mockResolvedValueOnce(mockBuffer2)
        .mockResolvedValueOnce(mockBuffer3);

      const result1 = await generateQRCodeFile("data1", "qr1.png");
      const result2 = await generateQRCodeFile("data2", "qr2.png");
      const result3 = await generateQRCodeFile("data3", "qr3.png");

      expect(result1.name).toBe("qr1.png");
      expect(result2.name).toBe("qr2.png");
      expect(result3.name).toBe("qr3.png");
      expect(mockToBuffer).toHaveBeenCalledTimes(3);
    });

    it("should generate QR code with signed URL", async () => {
      const signedUrl =
        "https://supabase.co/storage/v1/object/sign/bucket/path?token=abc123&expires=9999999999";
      const mockBuffer = createMockBuffer();
      mockToBuffer.mockResolvedValueOnce(mockBuffer);

      const result = await generateQRCodeFile(signedUrl);

      expect(result.data).toBe(mockBuffer);
      expect(result.type).toBe("image/png");
    });

    it("should create file from existing buffer", () => {
      const existingBuffer = createMockBuffer("existing qr data");

      const result = createQRCodeFile(existingBuffer, "existing-qr.png");

      expect(result).toEqual({
        name: "existing-qr.png",
        type: "image/png",
        data: existingBuffer,
        size: existingBuffer.length,
      });
    });

    it("should handle generate -> create workflow separately", async () => {
      const mockBuffer = createMockBuffer();
      mockToBuffer.mockResolvedValueOnce(mockBuffer);

      const buffer = await generateQRCode("test data", { width: 400 });
      const file = createQRCodeFile(buffer, "separate.png");

      expect(file).toEqual({
        name: "separate.png",
        type: "image/png",
        data: buffer,
        size: buffer.length,
      });
    });

    it("should generate different sizes for different use cases", async () => {
      const mockSmall = createMockBuffer("small");
      const mockMedium = createMockBuffer("medium");
      const mockLarge = createMockBuffer("large");

      mockToBuffer
        .mockResolvedValueOnce(mockSmall)
        .mockResolvedValueOnce(mockMedium)
        .mockResolvedValueOnce(mockLarge);

      await generateQRCodeFile("data", "small.png", { width: 200 });
      await generateQRCodeFile("data", "medium.png", { width: 300 });
      await generateQRCodeFile("data", "large.png", { width: 500 });

      expect(mockToBuffer).toHaveBeenNthCalledWith(
        1,
        "data",
        expect.objectContaining({ width: 200 }),
      );
      expect(mockToBuffer).toHaveBeenNthCalledWith(
        2,
        "data",
        expect.objectContaining({ width: 300 }),
      );
      expect(mockToBuffer).toHaveBeenNthCalledWith(
        3,
        "data",
        expect.objectContaining({ width: 500 }),
      );
    });
  });
});
