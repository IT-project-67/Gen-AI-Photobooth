import { describe, it, expect, beforeAll, jest } from "@jest/globals";
import type { UploadFile } from "~~/server/types/storage";
import type { MergeOptions, ImageMergeResult } from "~~/server/types/image";
import type { Metadata } from "sharp";

interface MockSharpInstance {
  metadata: jest.Mock<() => Promise<Partial<Metadata>>>;
  resize: jest.Mock<() => MockSharpInstance>;
  toBuffer: jest.Mock<() => Promise<Buffer>>;
  composite: jest.Mock<() => MockSharpInstance>;
  jpeg: jest.Mock<() => MockSharpInstance>;
}

const mockMetadata = jest.fn<() => Promise<Partial<Metadata>>>();
const mockResize = jest.fn<() => MockSharpInstance>();
const mockToBuffer = jest.fn<() => Promise<Buffer>>();
const mockComposite = jest.fn<() => MockSharpInstance>();
const mockJpeg = jest.fn<() => MockSharpInstance>();

const mockSharpInstance: MockSharpInstance = {
  metadata: mockMetadata,
  resize: mockResize,
  toBuffer: mockToBuffer,
  composite: mockComposite,
  jpeg: mockJpeg,
};

const mockSharp = jest.fn(() => {
  mockResize.mockReturnValue(mockSharpInstance);
  mockComposite.mockReturnValue(mockSharpInstance);
  mockJpeg.mockReturnValue(mockSharpInstance);
  return mockSharpInstance;
});

jest.mock("sharp", () => ({
  __esModule: true,
  default: mockSharp,
}));

interface ImageMergerClass {
  new (): ImageMergerInstance;
}

interface ImageMergerInstance {
  validateImageFile(file: UploadFile): void;
  getImageMetadata(file: UploadFile): Promise<Partial<Metadata>>;
  mergeImages(
    mainImage: UploadFile,
    logoImage: UploadFile,
    options?: MergeOptions,
  ): Promise<ImageMergeResult>;
}

let ImageMerger: ImageMergerClass;
let createImageMerger: () => ImageMergerInstance;
let mergeImages: (
  mainImage: UploadFile,
  logoImage: UploadFile,
  options?: MergeOptions,
) => Promise<ImageMergeResult>;
let addWhiteBorder: (mainImage: UploadFile, options?: MergeOptions) => Promise<ImageMergeResult>;

beforeAll(async () => {
  const module = await import("~/server/utils/image/image-processer.utils");
  ImageMerger = module.ImageMerger;
  createImageMerger = module.createImageMerger;
  mergeImages = module.mergeImages;
  addWhiteBorder = module.addWhiteBorder;
});

const createMockFile = (
  name = "test.png",
  type = "image/png",
  content = "mock image data",
): UploadFile => ({
  name,
  type,
  data: Buffer.from(content),
  size: Buffer.from(content).length,
});

describe("Image Processer Utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("ImageMerger class", () => {
    describe("constructor and defaults", () => {
      it("should create instance with default options", () => {
        const merger = new ImageMerger();
        expect(merger).toBeDefined();
        expect(merger).toBeInstanceOf(ImageMerger);
      });

      it("should have correct default options", () => {
        const merger = new ImageMerger();
        expect(merger).toHaveProperty("defaultOptions");
      });
    });

    describe("validateImageFile", () => {
      it("should validate valid JPEG file", () => {
        const merger = new ImageMerger();
        const file = createMockFile("test.jpg", "image/jpeg");

        expect(() => merger.validateImageFile(file)).not.toThrow();
      });

      it("should validate valid PNG file", () => {
        const merger = new ImageMerger();
        const file = createMockFile("test.png", "image/png");

        expect(() => merger.validateImageFile(file)).not.toThrow();
      });

      it("should validate valid WebP file", () => {
        const merger = new ImageMerger();
        const file = createMockFile("test.webp", "image/webp");

        expect(() => merger.validateImageFile(file)).not.toThrow();
      });

      it("should throw error for empty file data", () => {
        const merger = new ImageMerger();
        const file: UploadFile = {
          name: "test.png",
          type: "image/png",
          data: Buffer.from(""),
          size: 0,
        };

        expect(() => merger.validateImageFile(file)).toThrow("Image file data is empty");
      });

      it("should throw error for unsupported file type", () => {
        const merger = new ImageMerger();
        const file = createMockFile("test.gif", "image/gif");

        expect(() => merger.validateImageFile(file)).toThrow("Unsupported image type: image/gif");
      });

      it("should throw error for PDF file", () => {
        const merger = new ImageMerger();
        const file = createMockFile("test.pdf", "application/pdf");

        expect(() => merger.validateImageFile(file)).toThrow(
          "Unsupported image type: application/pdf",
        );
      });

      it("should throw error for text file", () => {
        const merger = new ImageMerger();
        const file = createMockFile("test.txt", "text/plain");

        expect(() => merger.validateImageFile(file)).toThrow("Unsupported image type: text/plain");
      });
    });

    describe("getImageMetadata", () => {
      it("should return metadata for valid image", async () => {
        const merger = new ImageMerger();
        const file = createMockFile();

        const expectedMetadata = {
          width: 1920,
          height: 1080,
        };

        mockMetadata.mockResolvedValueOnce(expectedMetadata);

        const result = await merger.getImageMetadata(file);

        expect(result).toMatchObject(expectedMetadata);
        expect(mockSharp).toHaveBeenCalledWith(file.data);
      });
    });

    describe("mergeImages", () => {
      it("should merge landscape images successfully", async () => {
        const merger = new ImageMerger();
        const mainFile = createMockFile("main.jpg", "image/jpeg");
        const logoFile = createMockFile("logo.png", "image/png");

        const mockMainBuffer = Buffer.from("main image");
        const mockLogoBuffer = Buffer.from("logo image");
        const mockFinalBuffer = Buffer.from("final image");

        mockMetadata.mockResolvedValueOnce({ width: 1248, height: 832 });
        mockToBuffer
          .mockResolvedValueOnce(mockMainBuffer)
          .mockResolvedValueOnce(mockLogoBuffer)
          .mockResolvedValueOnce(mockFinalBuffer);

        const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

        const result = await merger.mergeImages(mainFile, logoFile);

        expect(result).toMatchObject({
          data: mockFinalBuffer,
          mimeType: "image/jpeg",
          dimensions: {
            width: 1262,
            height: 846,
          },
        });

        expect(mockMetadata).toHaveBeenCalled();
        expect(mockComposite).toHaveBeenCalled();
        expect(mockJpeg).toHaveBeenCalled();

        consoleLogSpy.mockRestore();
      });

      it("should merge portrait images successfully", async () => {
        const merger = new ImageMerger();
        const mainFile = createMockFile("main.jpg", "image/jpeg");
        const logoFile = createMockFile("logo.png", "image/png");

        const mockFinalBuffer = Buffer.from("final image");

        mockMetadata.mockResolvedValueOnce({ width: 832, height: 1248 });
        mockToBuffer.mockResolvedValue(Buffer.from("mock")).mockResolvedValueOnce(mockFinalBuffer);

        const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

        const result = await merger.mergeImages(mainFile, logoFile);

        expect(result.dimensions).toEqual({
          width: 846,
          height: 1262,
        });

        consoleLogSpy.mockRestore();
      });

      it("should resize main image if dimensions do not match target", async () => {
        const merger = new ImageMerger();
        const mainFile = createMockFile();
        const logoFile = createMockFile();

        mockMetadata.mockResolvedValueOnce({ width: 1920, height: 1080 });
        mockToBuffer.mockResolvedValue(Buffer.from("mock"));

        const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

        await merger.mergeImages(mainFile, logoFile);

        expect(mockResize).toHaveBeenCalledWith(1248, 832, {
          fit: "fill",
        });

        consoleLogSpy.mockRestore();
      });

      it("should handle sharp processing errors", async () => {
        const merger = new ImageMerger();
        const mainFile = createMockFile();
        const logoFile = createMockFile();

        const mockError = new Error("Sharp processing failed");
        mockMetadata.mockRejectedValueOnce(mockError);

        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        await expect(merger.mergeImages(mainFile, logoFile)).rejects.toThrow(
          "Failed to merge images: Sharp processing failed",
        );

        expect(consoleErrorSpy).toHaveBeenCalledWith("Image merge error:", mockError);

        consoleErrorSpy.mockRestore();
      });

      it("should handle non-Error exceptions", async () => {
        const merger = new ImageMerger();
        const mainFile = createMockFile();
        const logoFile = createMockFile();

        mockMetadata.mockRejectedValueOnce("String error");

        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        await expect(merger.mergeImages(mainFile, logoFile)).rejects.toThrow(
          "Failed to merge images: Unknown error",
        );

        consoleErrorSpy.mockRestore();
      });

      it("should handle images with undefined width", async () => {
        const merger = new ImageMerger();
        const mainFile = createMockFile();
        const logoFile = createMockFile();

        mockMetadata.mockResolvedValueOnce({ width: undefined, height: 1080 });
        mockToBuffer.mockResolvedValue(Buffer.from("mock"));

        const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

        await merger.mergeImages(mainFile, logoFile);

        expect(mockResize).toHaveBeenCalledWith(832, 1248, {
          fit: "fill",
        });

        consoleLogSpy.mockRestore();
      });

      it("should handle images with undefined height", async () => {
        const merger = new ImageMerger();
        const mainFile = createMockFile();
        const logoFile = createMockFile();

        mockMetadata.mockResolvedValueOnce({ width: 1920, height: undefined });
        mockToBuffer.mockResolvedValue(Buffer.from("mock"));

        const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

        await merger.mergeImages(mainFile, logoFile);

        expect(mockResize).toHaveBeenCalledWith(1248, 832, {
          fit: "fill",
        });

        consoleLogSpy.mockRestore();
      });

      it("should not resize main image if dimensions already match target", async () => {
        const merger = new ImageMerger();
        const mainFile = createMockFile();
        const logoFile = createMockFile();

        mockMetadata.mockResolvedValueOnce({ width: 1248, height: 832 });
        mockToBuffer.mockResolvedValue(Buffer.from("mock"));

        const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

        await merger.mergeImages(mainFile, logoFile);

        expect(mockResize).toHaveBeenCalledWith(180, 180, {
          fit: "contain",
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        });
        expect(mockResize).not.toHaveBeenCalledWith(1248, 832, {
          fit: "fill",
        });

        consoleLogSpy.mockRestore();
      });

      it("should use default mime type for unsupported format (defensive programming)", async () => {
        const merger = new ImageMerger();
        const mainFile = createMockFile();
        const logoFile = createMockFile();

        const customOptions: MergeOptions = {
          outputFormat: "bmp" as "jpeg",
        };

        mockMetadata.mockResolvedValueOnce({ width: 1248, height: 832 });
        mockToBuffer.mockResolvedValue(Buffer.from("mock"));

        const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

        const result = await merger.mergeImages(mainFile, logoFile, customOptions);
        expect(result.mimeType).toBe("image/jpeg");

        consoleLogSpy.mockRestore();
      });
    });
  });

  describe("createImageMerger", () => {
    it("should create a new ImageMerger instance", () => {
      const merger = createImageMerger();
      expect(merger).toBeInstanceOf(ImageMerger);
    });

    it("should create independent instances", () => {
      const merger1 = createImageMerger();
      const merger2 = createImageMerger();
      expect(merger1).not.toBe(merger2);
    });
  });

  describe("mergeImages function", () => {
    it("should validate and merge images successfully", async () => {
      const mainFile = createMockFile("main.jpg", "image/jpeg");
      const logoFile = createMockFile("logo.png", "image/png");

      const mockBuffer = Buffer.from("final image");

      mockMetadata.mockResolvedValueOnce({ width: 1248, height: 832 });
      mockToBuffer.mockResolvedValue(mockBuffer);

      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      const result = await mergeImages(mainFile, logoFile);

      expect(result.data).toBe(mockBuffer);
      expect(result.mimeType).toBe("image/jpeg");

      consoleLogSpy.mockRestore();
    });

    it("should throw error for invalid main image", async () => {
      const mainFile = createMockFile("main.pdf", "application/pdf");
      const logoFile = createMockFile("logo.png", "image/png");

      await expect(mergeImages(mainFile, logoFile)).rejects.toThrow(
        "Unsupported image type: application/pdf",
      );
    });

    it("should throw error for invalid logo image", async () => {
      const mainFile = createMockFile("main.jpg", "image/jpeg");
      const logoFile = createMockFile("logo.txt", "text/plain");

      await expect(mergeImages(mainFile, logoFile)).rejects.toThrow(
        "Unsupported image type: text/plain",
      );
    });

    it("should throw error for empty main image", async () => {
      const mainFile: UploadFile = {
        name: "main.jpg",
        type: "image/jpeg",
        data: Buffer.from(""),
        size: 0,
      };
      const logoFile = createMockFile();

      await expect(mergeImages(mainFile, logoFile)).rejects.toThrow("Image file data is empty");
    });

    it("should throw error for empty logo image", async () => {
      const mainFile = createMockFile();
      const logoFile: UploadFile = {
        name: "logo.png",
        type: "image/png",
        data: Buffer.from(""),
        size: 0,
      };

      await expect(mergeImages(mainFile, logoFile)).rejects.toThrow("Image file data is empty");
    });
  });

  describe("addWhiteBorder function", () => {
    it("should add white border to landscape image", async () => {
      const mainFile = createMockFile("photo.jpg", "image/jpeg");

      const mockFinalBuffer = Buffer.from("final image");

      mockMetadata.mockResolvedValueOnce({ width: 1248, height: 832 });
      mockToBuffer.mockResolvedValue(mockFinalBuffer);

      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      const result = await addWhiteBorder(mainFile);

      expect(result).toMatchObject({
        data: mockFinalBuffer,
        mimeType: "image/jpeg",
        dimensions: {
          width: 1262,
          height: 846,
        },
      });

      expect(mockComposite).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });

    it("should add white border to portrait image", async () => {
      const mainFile = createMockFile("photo.jpg", "image/jpeg");

      mockMetadata.mockResolvedValueOnce({ width: 832, height: 1248 });
      mockToBuffer.mockResolvedValue(Buffer.from("mock"));

      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      const result = await addWhiteBorder(mainFile);

      expect(result.dimensions).toEqual({
        width: 846,
        height: 1262,
      });

      consoleLogSpy.mockRestore();
    });

    it("should resize image before adding border if needed", async () => {
      const mainFile = createMockFile();

      mockMetadata.mockResolvedValueOnce({ width: 1920, height: 1080 });
      mockToBuffer.mockResolvedValue(Buffer.from("mock"));

      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      await addWhiteBorder(mainFile);

      expect(mockResize).toHaveBeenCalledWith(1248, 832, {
        fit: "fill",
      });

      consoleLogSpy.mockRestore();
    });

    it("should use custom border width when provided", async () => {
      const mainFile = createMockFile();
      const options: MergeOptions = {
        borderWidth: 15,
      };

      mockMetadata.mockResolvedValueOnce({ width: 1248, height: 832 });
      mockToBuffer.mockResolvedValue(Buffer.from("mock"));

      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      const result = await addWhiteBorder(mainFile, options);

      expect(result.dimensions).toEqual({
        width: 1278,
        height: 862,
      });

      consoleLogSpy.mockRestore();
    });

    it("should use custom quality when provided", async () => {
      const mainFile = createMockFile();
      const options: MergeOptions = {
        quality: 80,
      };

      mockMetadata.mockResolvedValueOnce({ width: 1248, height: 832 });
      mockToBuffer.mockResolvedValue(Buffer.from("mock"));

      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      await addWhiteBorder(mainFile, options);

      expect(mockJpeg).toHaveBeenCalledWith({ quality: 80 });

      consoleLogSpy.mockRestore();
    });

    it("should return correct mime type for png format", async () => {
      const mainFile = createMockFile();
      const options: MergeOptions = {
        outputFormat: "png",
      };

      mockMetadata.mockResolvedValueOnce({ width: 1248, height: 832 });
      mockToBuffer.mockResolvedValue(Buffer.from("mock"));

      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      const result = await addWhiteBorder(mainFile, options);

      expect(result.mimeType).toBe("image/png");

      consoleLogSpy.mockRestore();
    });

    it("should return correct mime type for webp format", async () => {
      const mainFile = createMockFile();
      const options: MergeOptions = {
        outputFormat: "webp",
      };

      mockMetadata.mockResolvedValueOnce({ width: 1248, height: 832 });
      mockToBuffer.mockResolvedValue(Buffer.from("mock"));

      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      const result = await addWhiteBorder(mainFile, options);

      expect(result.mimeType).toBe("image/webp");

      consoleLogSpy.mockRestore();
    });

    it("should handle sharp processing errors", async () => {
      const mainFile = createMockFile();

      const mockError = new Error("Sharp failed");
      mockMetadata.mockRejectedValueOnce(mockError);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      await expect(addWhiteBorder(mainFile)).rejects.toThrow(
        "Failed to add white border: Sharp failed",
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith("Add white border error:", mockError);

      consoleErrorSpy.mockRestore();
    });

    it("should handle non-Error exceptions", async () => {
      const mainFile = createMockFile();

      mockMetadata.mockRejectedValueOnce("String error");

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      await expect(addWhiteBorder(mainFile)).rejects.toThrow(
        "Failed to add white border: Unknown error",
      );

      consoleErrorSpy.mockRestore();
    });

    it("should handle images with undefined width", async () => {
      const mainFile = createMockFile();

      mockMetadata.mockResolvedValueOnce({ width: undefined, height: 1080 });
      mockToBuffer.mockResolvedValue(Buffer.from("mock"));

      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      await addWhiteBorder(mainFile);

      expect(mockResize).toHaveBeenCalledWith(832, 1248, {
        fit: "fill",
      });

      consoleLogSpy.mockRestore();
    });

    it("should handle images with undefined height", async () => {
      const mainFile = createMockFile();

      mockMetadata.mockResolvedValueOnce({ width: 1920, height: undefined });
      mockToBuffer.mockResolvedValue(Buffer.from("mock"));

      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      await addWhiteBorder(mainFile);

      expect(mockResize).toHaveBeenCalledWith(1248, 832, {
        fit: "fill",
      });

      consoleLogSpy.mockRestore();
    });

    it("should not resize if dimensions already match target", async () => {
      const mainFile = createMockFile();

      mockMetadata.mockResolvedValueOnce({ width: 1248, height: 832 });
      mockToBuffer.mockResolvedValue(Buffer.from("mock"));

      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      await addWhiteBorder(mainFile);

      expect(mockResize).not.toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });

    it("should use default mime type for unknown format", async () => {
      const mainFile = createMockFile();

      mockMetadata.mockResolvedValueOnce({ width: 1248, height: 832 });
      mockToBuffer.mockResolvedValue(Buffer.from("mock"));

      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      const result = await addWhiteBorder(mainFile, {
        outputFormat: "jpeg",
      });

      expect(result.mimeType).toBe("image/jpeg");

      consoleLogSpy.mockRestore();
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete workflow: validate and merge images", async () => {
      const mainFile = createMockFile("photo.jpg", "image/jpeg", "photo data");
      const logoFile = createMockFile("logo.png", "image/png", "logo data");

      const mockFinalBuffer = Buffer.from("merged result");

      mockMetadata.mockResolvedValueOnce({ width: 1248, height: 832 });
      mockToBuffer.mockResolvedValue(mockFinalBuffer);

      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      const result = await mergeImages(mainFile, logoFile, {
        logoSize: { width: 180, height: 180 },
        borderWidth: 7,
        quality: 90,
      });

      expect(result.data).toBe(mockFinalBuffer);
      expect(result.dimensions.width).toBe(1262);
      expect(result.dimensions.height).toBe(846);

      consoleLogSpy.mockRestore();
    });

    it("should handle complete workflow: add border only", async () => {
      const mainFile = createMockFile("photo.jpg", "image/jpeg");

      const mockFinalBuffer = Buffer.from("bordered");

      mockMetadata.mockResolvedValueOnce({ width: 1248, height: 832 });
      mockToBuffer.mockResolvedValue(mockFinalBuffer);

      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      const result = await addWhiteBorder(mainFile, {
        borderWidth: 10,
        quality: 85,
      });

      expect(result.data).toBe(mockFinalBuffer);

      consoleLogSpy.mockRestore();
    });

    it("should create multiple merger instances independently", async () => {
      const merger1 = createImageMerger();
      const merger2 = createImageMerger();

      expect(merger1).toBeInstanceOf(ImageMerger);
      expect(merger2).toBeInstanceOf(ImageMerger);
      expect(merger1).not.toBe(merger2);
    });
  });
});
