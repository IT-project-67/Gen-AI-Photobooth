import type {
  UploadFile,
  ValidationOptions,
  FilePart,
} from "~~/server/types/storage";
import {
  ALLOWED_TYPES,
  ALLOWED_EXTS,
  MAX_FILE_SIZE,
  MIME_MAP,
} from "~~/server/types/storage";
import { createErrorResponse } from "~~/server/utils/core";
import { ERROR_STATUS_MAP } from "~~/server/types/core";

export function inferMimeFromFilename(
  filename: string,
  fallback = "image/jpeg",
): string {
  const ext = (filename.split(".").pop() || "").toLowerCase();
  return MIME_MAP[ext] || fallback;
}

export function getExtLower(filename: string): string {
  const ext = filename.split(".").pop();
  return (ext || "").toLowerCase();
}

export function normalizeFilePart(filePart: FilePart): UploadFile | null {
  if (!filePart?.filename || !filePart?.data) {
    return null;
  }

  const data = Buffer.isBuffer(filePart.data)
    ? filePart.data
    : Buffer.from(filePart.data as Buffer | string | Uint8Array);

  const type = filePart.type || inferMimeFromFilename(filePart.filename);

  return {
    name: filePart.filename,
    type,
    data,
    size: data.length,
  };
}

export function validateFileExtension(
  filename: string,
  allowedExts: string[],
): void {
  const extLower = getExtLower(filename);

  if (!extLower) {
    throw createH3ValidationError(
      "INVALID_FILE_NAME",
      "File must have a valid extension",
    );
  }

  if (!allowedExts.includes(extLower)) {
    throw createH3ValidationError(
      "INVALID_FILE_EXTENSION",
      `Invalid file extension. Allowed: ${allowedExts.join(", ")}`,
    );
  }
}

export function validateFileType(
  mimeType: string,
  allowedTypes: string[],
): void {
  if (!allowedTypes.includes(mimeType)) {
    throw createH3ValidationError(
      "INVALID_FILE_TYPE",
      `Invalid file type. Allowed: ${allowedTypes.join(", ")}`,
    );
  }
}

export function validateFileSize(size: number, maxSize: number): void {
  if (size > maxSize) {
    const maxSizeMB = Math.floor(maxSize / (1024 * 1024));
    throw createH3ValidationError(
      "FILE_TOO_LARGE",
      `File too large. Maximum size is ${maxSizeMB}MB`,
    );
  }
}

export function validateFileOrThrow(
  file: UploadFile,
  options: ValidationOptions = {},
): void {
  const allowTypes = options.allowTypes ?? ALLOWED_TYPES;
  const allowExts = options.allowExts ?? ALLOWED_EXTS;
  const maxSize = options.maxSize ?? MAX_FILE_SIZE;
  validateFileExtension(file.name, allowExts);
  validateFileType(file.type, allowTypes);
  validateFileSize(file.size, maxSize);
}

function createH3ValidationError(code: string, message: string) {
  return {
    statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
    statusMessage: message,
    data: createErrorResponse({
      type: "VALIDATION_ERROR" as const,
      code,
      message,
      statusCode: ERROR_STATUS_MAP.VALIDATION_ERROR,
    }),
  };
}
