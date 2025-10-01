import { config } from "~~/server/config";
import type {
  GenerationResponse,
  GenerationStatusResponse,
} from "~~/server/types/leonardo";
import sharp from "sharp";
import { ERROR_STATUS_MAP } from "~~/server/types/core";
import { Style } from "@prisma/client";
import { createAIPhoto, updateAIPhotoUrl } from "~~/server/model";
import { createAdminClient, prismaClient } from "~~/server/clients";
import { uploadAIPhoto } from "~~/server/utils/storage";
import { requireAuth } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const formData = await readMultipartFormData(event);

  if (!formData || formData.length === 0) {
    throw createError({
      statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
      statusMessage: "No file uploaded",
    });
  }

  const file = formData.find((item) => item.name === "image");
  const eventIdField = formData.find((item) => item.name === "eventId");
  const sessionIdField = formData.find((item) => item.name === "sessionId");

  if (!file) {
    throw createError({
      statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
      statusMessage: "Image is required",
    });
  }

  if (!eventIdField || !sessionIdField) {
    throw createError({
      statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
      statusMessage: "Event ID and Session ID are required",
    });
  }

  const eventId = eventIdField.data.toString();
  const sessionId = sessionIdField.data.toString();

  const ev = await prismaClient.event.findFirst({
    where: {
      id: eventId,
      userId: user.id,
      isDeleted: false,
    },
  });

  if (!ev) {
    throw createError({
      statusCode: ERROR_STATUS_MAP.NOT_FOUND,
      statusMessage: "Event not found",
    });
  }

  const photoSession = await prismaClient.photoSession.findFirst({
    where: {
      id: sessionId,
      eventId: eventId,
    },
  });

  if (!photoSession) {
    throw createError({
      statusCode: ERROR_STATUS_MAP.NOT_FOUND,
      statusMessage: "Photo session not found",
    });
  }

  const modelId = config().LEONARDO_MODEL_ID;
  const styleId = config().LEONARDO_STYLE_ID;
  const prompts = config().LEONARDO_DEFAULT_PROMPTS;

  const filename = file.filename || "image.jpg";
  const extension = filename.split(".").pop()?.toLowerCase() || "jpg";

  const { leonardoApiKey } = useRuntimeConfig();
  const { LeonardoClient } = await import("~~/server/clients");
  const client = new LeonardoClient(leonardoApiKey);

  const metadata = await sharp(file.data).metadata();
  const isLandscape = (metadata.width || 0) > (metadata.height || 0);

  const imageId = await client.uploadImage(file.data, extension);
  const generations = await Promise.all([
    client.generateFromImageId({
      prompt: prompts[0],
      modelId: modelId,
      styleId: styleId,
      initImageId: imageId,
      isLandscape,
    }),
    client.generateFromImageId({
      prompt: prompts[1],
      modelId: modelId,
      styleId: styleId,
      initImageId: imageId,
      isLandscape,
    }),
    client.generateFromImageId({
      prompt: prompts[2],
      modelId: modelId,
      styleId: styleId,
      initImageId: imageId,
      isLandscape,
    }),
    client.generateFromImageId({
      prompt: prompts[3],
      modelId: modelId,
      styleId: styleId,
      initImageId: imageId,
      isLandscape,
    }),
  ]);

  const generationIds = (generations as GenerationResponse[]).map(
    (g) => g.sdGenerationJob.generationId,
  );

  const styles = Object.values(Style) as Style[];
  const aiPhotos = await Promise.all(
    styles.map((style) => createAIPhoto(sessionId, style))
  );

  async function waitForGenerations(generationId: string): Promise<string> {
    while (true) {
      const result = (await client.getGeneration(
        generationId,
      )) as GenerationStatusResponse;

      if (result.generations_by_pk.status === "COMPLETE") {
        return result.generations_by_pk.generated_images[0].url;
      }

      if (result.generations_by_pk.status === "FAILED") {
        throw new Error("Generation failed");
      }
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  const imageUrls = await Promise.all(
    generationIds.map((id) => waitForGenerations(id)),
  );

    const supabase = createAdminClient();
  const runtimeConfig = useRuntimeConfig();

  const uploadResults = await Promise.all(
    imageUrls.map(async (leonardoUrl, index) => {
      try {
        const response = await fetch(leonardoUrl);
        if (!response.ok) {
          throw new Error(`Failed to download image: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const style = styles[index];
        const styleFolder = style.toLowerCase();
        const uploadFile = {
          data: buffer,
          name: `${style.toLowerCase()}.jpg`,
          type: "image/jpeg",
          size: buffer.length,
        };

        const uploadResult = await uploadAIPhoto(
          supabase,
          uploadFile,
          user.id,
          eventId,
          sessionId,
          styleFolder,
          style.toLowerCase(),
          runtimeConfig.public.supabaseUrl,
        );

        await updateAIPhotoUrl(aiPhotos[index].id, uploadResult.path);

        return {
          aiPhotoId: aiPhotos[index].id,
          style,
          storageUrl: uploadResult.path,
          publicUrl: leonardoUrl,
          generationId: generationIds[index],
        };
      } catch (error) {
        console.error(`Failed to process ${styles[index]} photo:`, error);
        throw error;
      }
    }),
  );

  return {
    imageId,
    sessionId,
    eventId,
    images: uploadResults,
  };
});
