import { createAdminClient } from "~~/server/clients";
import { getStorageBucket } from "~~/server/utils/storage/path.utils";
import type { UploadFile } from "~~/server/types/storage";

export async function downloadEventLogo(logoUrl: string): Promise<UploadFile> {
  try {
    const supabase = createAdminClient();
    const bucket = getStorageBucket();

    const { data, error } = await supabase.storage
      .from(bucket)
      .download(logoUrl);

    if (error || !data) {
      throw new Error(
        `Failed to download logo: ${error?.message || "Logo not found"}`,
      );
    }

    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return {
      name: "event-logo",
      type: data.type || "image/png",
      data: buffer,
      size: buffer.length,
    };
  } catch (error) {
    console.error("Error downloading event logo:", error);
    throw new Error(
      `Logo download failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export function hasEventLogo(logoUrl: string | null | undefined): boolean {
  return !!(logoUrl && logoUrl.trim().length > 0);
}
