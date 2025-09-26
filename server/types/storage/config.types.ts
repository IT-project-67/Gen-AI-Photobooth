export const ALLOWED_TYPES: string[] = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
  "image/x-icon",
];

export const ALLOWED_EXTS: string[] = [
  "png",
  "jpg",
  "jpeg",
  "webp",
  "svg",
  "ico",
];

export const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const DEFAULT_CACHE_CONTROL = "3600";

export const MIME_MAP: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
};

export const PATH_TEMPLATES = {
  LOGO: "{userId}/{eventId}/Logo/logo.{ext}",
  PHOTO: "{userId}/{eventId}/Photos/{sessionId}/{photoId}.{ext}",
} as const;
