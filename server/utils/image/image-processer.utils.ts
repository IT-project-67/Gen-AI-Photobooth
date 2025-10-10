import sharp from "sharp";
import type { UploadFile } from "~~/server/types/storage";
import type { MergeOptions, ImageMergeResult } from "~~/server/types/image";

export class ImageMerger {
  private readonly defaultOptions: Required<MergeOptions> = {
    logoSize: { width: 180, height: 180 },
    borderWidth: 7,
    borderColor: "#FFFFFF",
    quality: 90,
    outputFormat: "jpeg",
  };

  async mergeImages(
    mainImage: UploadFile,
    logoImage: UploadFile,
    options: MergeOptions = {},
  ): Promise<ImageMergeResult> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      const mainSharp = sharp(mainImage.data);
      const mainMetadata = await mainSharp.metadata();

      const isLandscape = (mainMetadata.width || 0) >= (mainMetadata.height || 0);
      const targetWidth = isLandscape ? 1248 : 832;
      const targetHeight = isLandscape ? 832 : 1248;

      console.log(
        `Original image: ${mainMetadata.width}x${mainMetadata.height}, detected as ${isLandscape ? "landscape" : "portrait"}`,
      );
      console.log(`Target size: ${targetWidth}x${targetHeight}`);

      if (mainMetadata.width !== targetWidth || mainMetadata.height !== targetHeight) {
        console.log(
          `Resizing main image from ${mainMetadata.width}x${mainMetadata.height} to ${targetWidth}x${targetHeight}`,
        );
        mainSharp.resize(targetWidth, targetHeight, { fit: "fill" });
      }

      const logoSharp = sharp(logoImage.data);
      const logoResized = logoSharp.resize(opts.logoSize.width, opts.logoSize.height, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      });

      const borderWidth = opts.borderWidth;
      const canvasWidth = targetWidth + borderWidth * 2;
      const canvasHeight = targetHeight + borderWidth * 2;

      const logoX = canvasWidth - opts.logoSize.width - borderWidth;
      const logoY = canvasHeight - opts.logoSize.height - borderWidth;

      const canvas = sharp({
        create: {
          width: canvasWidth,
          height: canvasHeight,
          channels: 3,
          background: { r: 255, g: 255, b: 255 },
        },
      });

      const mainBuffer = await mainSharp.toBuffer();
      const logoBuffer = await logoResized.toBuffer();

      const finalImage = await canvas
        .composite([
          {
            input: mainBuffer,
            left: borderWidth,
            top: borderWidth,
          },
          {
            input: logoBuffer,
            left: logoX,
            top: logoY,
          },
        ])
        .jpeg({ quality: opts.quality })
        .toBuffer();

      const mimeType = this.getMimeType(opts.outputFormat);

      return {
        data: finalImage,
        mimeType,
        dimensions: {
          width: canvasWidth,
          height: canvasHeight,
        },
      };
    } catch (error) {
      console.error("Image merge error:", error);
      throw new Error(
        `Failed to merge images: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private getMimeType(format: string): string {
    const mimeMap: Record<string, string> = {
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
    };
    return mimeMap[format] || "image/jpeg";
  }

  validateImageFile(file: UploadFile): void {
    if (!file.data || file.data.length === 0) {
      throw new Error("Image file data is empty");
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Unsupported image type: ${file.type}`);
    }
  }

  async getImageMetadata(file: UploadFile): Promise<sharp.Metadata> {
    return await sharp(file.data).metadata();
  }
}

export function createImageMerger(): ImageMerger {
  return new ImageMerger();
}

export async function mergeImages(
  mainImage: UploadFile,
  logoImage: UploadFile,
  options: MergeOptions = {},
): Promise<ImageMergeResult> {
  const merger = createImageMerger();
  merger.validateImageFile(mainImage);
  merger.validateImageFile(logoImage);
  return await merger.mergeImages(mainImage, logoImage, options);
}
