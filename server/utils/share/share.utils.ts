import { createAdminClient } from "~~/server/clients";
import { getStorageBucket } from "~~/server/utils/storage/path.utils";
import { generateQRCodeFile } from "~~/server/utils/qrcode";
import { uploadToSupabase } from "~~/server/utils/storage/upload.utils";

export async function createSignedUrlForAIPhoto(
  aiPhotoUrl: string,
  expiresInSeconds: number = 7 * 24 * 60 * 60,
): Promise<string> {
  const supabase = createAdminClient();
  const bucket = getStorageBucket();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(aiPhotoUrl, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${error?.message}`);
  }

  return data.signedUrl;
}

export async function generateAndUploadQRCode(
  aiPhotoUrl: string,
  userId: string,
  eventId: string,
  sessionId: string,
  expiresInSeconds: number = 7 * 24 * 60 * 60,
): Promise<string> {
  try {
    const supabase = createAdminClient();

    const signedUrl = await createSignedUrlForAIPhoto(
      aiPhotoUrl,
      expiresInSeconds,
    );
    const qrCodeFile = await generateQRCodeFile(signedUrl, "qr.png");

    const qrCodePath = `qr.png`;
    const fullPath = `${userId}/${eventId}/Photos/${sessionId}/${qrCodePath}`;

    const uploadResult = await uploadToSupabase(supabase, qrCodeFile, {
      bucket: getStorageBucket(),
      path: fullPath,
      upsert: true,
      cacheControl: "3600",
    });
    return uploadResult.path;
  } catch (error) {
    console.error("Error in generateAndUploadQRCode:", error);
    throw error;
  }
}

export async function getQRCodeFromStorage(
  qrCodePath: string,
): Promise<Buffer | null> {
  const supabase = createAdminClient();
  const bucket = getStorageBucket();

  const { data, error } = await supabase.storage
    .from(bucket)
    .download(qrCodePath);

  if (error || !data) {
    console.error("QR Code download error:", error);
    return null;
  }

  const arrayBuf = await data.arrayBuffer();
  return Buffer.from(arrayBuf);
}
