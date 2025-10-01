import {
  generateLogoPath,
  generatePhotoPath,
  generateAIPhotoPath,
  getStorageBucket,
} from "./path.utils";
import { uploadToSupabaseWithUrl } from "./upload.utils";
import type { UploadFile } from "~~/server/types/storage";
import type { SupabaseClient } from "@supabase/supabase-js";

export type {
  UploadFile,
  UploadOptions,
  ValidationOptions,
  FilePart,
  UploadResult,
  ValidationError,
} from "~~/server/types/storage";

export {
  ALLOWED_TYPES,
  ALLOWED_EXTS,
  MAX_FILE_SIZE,
  DEFAULT_CACHE_CONTROL,
  MIME_MAP,
  PATH_TEMPLATES,
} from "~~/server/types/storage";

export async function uploadLogo(
  supabase: SupabaseClient,
  file: UploadFile,
  userId: string,
  eventId: string,
  supabaseUrl: string,
  bucket?: string,
) {
  const path = generateLogoPath(userId, eventId, file);
  const storageBucket = bucket || getStorageBucket();
  return uploadToSupabaseWithUrl(
    supabase,
    file,
    { bucket: storageBucket, path },
    supabaseUrl,
  );
}

export async function uploadPhoto(
  supabase: SupabaseClient,
  file: UploadFile,
  userId: string,
  eventId: string,
  sessionId: string,
  photoId: string,
  supabaseUrl: string,
) {
  const path = generatePhotoPath(userId, eventId, sessionId, photoId, file);
  const bucket = getStorageBucket();

  return uploadToSupabaseWithUrl(supabase, file, { bucket, path }, supabaseUrl);
}

export async function uploadAIPhoto(
  supabase: SupabaseClient,
  file: UploadFile,
  userId: string,
  eventId: string,
  sessionId: string,
  style: string,
  filename: string,
  supabaseUrl: string,
) {
  const path = generateAIPhotoPath(
    userId,
    eventId,
    sessionId,
    style,
    filename,
    file,
  );
  const bucket = getStorageBucket();

  return uploadToSupabaseWithUrl(supabase, file, { bucket, path }, supabaseUrl);
}
