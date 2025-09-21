import { createError } from "h3";

export function assertPathOwnedByUser(userId: string, path: string) {
  if (!path || typeof path !== "string") {
    throw createError({ statusCode: 400, statusMessage: "Invalid path" });
  }
  if (path.includes("..") || path.startsWith("/") || path.startsWith("\\")) {
    throw createError({ statusCode: 400, statusMessage: "Invalid path" });
  }
  if (!path.startsWith(`${userId}/`)) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }
}

export function looksLikeImage(type: string, buf: Buffer) {
  const s = buf.subarray(0, 12);
  const isPNG =
    s[0] === 0x89 && s[1] === 0x50 && s[2] === 0x4e && s[3] === 0x47;
  const isJPEG = s[0] === 0xff && s[1] === 0xd8 && s[2] === 0xff;
  const isWEBP =
    s[0] === 0x52 &&
    s[1] === 0x49 &&
    s[2] === 0x46 &&
    s[3] === 0x46 &&
    s[8] === 0x57 &&
    s[9] === 0x45 &&
    s[10] === 0x42 &&
    s[11] === 0x50;
  if (type === "image/png") return isPNG;
  if (type === "image/jpeg") return isJPEG;
  if (type === "image/webp") return isWEBP;
  return false;
}
