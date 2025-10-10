import type { SupabaseClient } from "@supabase/supabase-js";
import type { UploadFile, UploadOptions, UploadResult } from "~~/server/types/storage";
import { createErrorResponse } from "~~/server/utils/core";
import { ERROR_STATUS_MAP } from "~~/server/types/core";
import { generatePublicUrl } from "./path.utils";

export async function uploadToSupabase(
  supabase: SupabaseClient,
  file: UploadFile,
  options: UploadOptions,
): Promise<UploadResult> {
  const { bucket, path, upsert = true, cacheControl = "3600" } = options;
  const { error } = await supabase.storage.from(bucket).upload(path, file.data, {
    contentType: file.type,
    cacheControl,
    upsert,
  });

  if (error) {
    console.error("Supabase upload error:", error);
    throw {
      statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      statusMessage: "Upload failed",
      data: createErrorResponse({
        type: "SERVER_ERROR" as const,
        code: "STORAGE_UPLOAD_ERROR",
        message: error.message,
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      }),
    };
  }
  return { path };
}

export async function uploadToSupabaseWithUrl(
  supabase: SupabaseClient,
  file: UploadFile,
  options: UploadOptions,
  supabaseUrl: string,
): Promise<UploadResult & { url: string }> {
  const result = await uploadToSupabase(supabase, file, options);
  const url = generatePublicUrl(supabaseUrl, result.path);

  return {
    ...result,
    url,
  };
}

export async function deleteFromSupabase(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    throw {
      statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      statusMessage: "Delete failed",
      data: createErrorResponse({
        type: "SERVER_ERROR" as const,
        code: "STORAGE_DELETE_ERROR",
        message: error.message,
        statusCode: ERROR_STATUS_MAP.INTERNAL_ERROR,
      }),
    };
  }
}

export async function fileExistsInSupabase(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
): Promise<boolean> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(path.split("/").slice(0, -1).join("/"), {
      search: path.split("/").pop(),
    });

  if (error) {
    return false;
  }

  return data && data.length > 0;
}

export async function getFileInfoFromSupabase(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
): Promise<{ size: number; lastModified: string; contentType: string } | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(path.split("/").slice(0, -1).join("/"), {
      search: path.split("/").pop(),
    });

  if (error || !data || data.length === 0) {
    return null;
  }

  const file = data[0];
  return {
    size: file.metadata?.size || 0,
    lastModified: file.updated_at || file.created_at || "",
    contentType: file.metadata?.mimetype || "application/octet-stream",
  };
}
