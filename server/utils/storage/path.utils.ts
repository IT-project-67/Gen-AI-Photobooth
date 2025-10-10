import type { UploadFile } from "~~/server/types/storage";
import { PATH_TEMPLATES } from "~~/server/types/storage";
import { config } from "~~/server/config";
import { getExtLower } from "./validation.utils";

export function generateFilePath(
  template: string,
  params: Record<string, string>,
  file: UploadFile,
): string {
  let path = template;

  Object.entries(params).forEach(([key, value]) => {
    path = path.replace(`{${key}}`, value);
  });

  const ext = getExtLower(file.name);
  path = path.replace("{ext}", ext);
  return path;
}

export function generateLogoPath(userId: string, eventId: string, file: UploadFile): string {
  return generateFilePath(
    PATH_TEMPLATES.LOGO,
    {
      userId,
      eventId,
    },
    file,
  );
}

export function generatePhotoPath(
  userId: string,
  eventId: string,
  sessionId: string,
  photoId: string,
  file: UploadFile,
): string {
  return generateFilePath(
    PATH_TEMPLATES.PHOTO,
    {
      userId,
      eventId,
      sessionId,
      photoId,
    },
    file,
  );
}

export function generateAIPhotoPath(
  userId: string,
  eventId: string,
  sessionId: string,
  style: string,
  filename: string,
  file: UploadFile,
): string {
  return generateFilePath(
    PATH_TEMPLATES.AI_PHOTO,
    {
      userId,
      eventId,
      sessionId,
      style: style.toLowerCase(),
      filename,
    },
    file,
  );
}

export function getStorageBucket(): string {
  try {
    return config().STORAGE_BUCKET;
  } catch (error) {
    console.error("Error getting storage bucket:", error);
    return "PhotoBooth";
  }
}

export function generatePublicUrl(supabaseUrl: string, path: string): string {
  const bucket = getStorageBucket();
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}
