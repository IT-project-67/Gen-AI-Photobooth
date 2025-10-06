import QRCode from "qrcode";
import type { UploadFile } from "~~/server/types/storage";

export async function generateQRCode(
  data: string,
  options?: QRCode.QRCodeToBufferOptions,
): Promise<Buffer> {
  try {
    const buffer = await QRCode.toBuffer(data, {
      type: "png",
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
      ...options,
    });
    return buffer;
  } catch (error) {
    console.error("QR Code generation error:", error);
    throw new Error("Failed to generate QR code");
  }
}

export function createQRCodeFile(
  buffer: Buffer,
  filename: string = "qr.png",
): UploadFile {
  return {
    name: filename,
    type: "image/png",
    data: buffer,
    size: buffer.length,
  };
}

export async function generateQRCodeFile(
  data: string,
  filename: string = "qr.png",
  options?: QRCode.QRCodeToBufferOptions,
): Promise<UploadFile> {
  const buffer = await generateQRCode(data, options);
  return createQRCodeFile(buffer, filename);
}

