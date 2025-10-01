import { config } from "~~/server/config";
import type {
  GenerationResponse,
  GenerationStatusResponse,
} from "~~/server/types/leonardo";
import sharp from "sharp";
import { ERROR_STATUS_MAP } from "~~/server/types/core";

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event);

  if (!formData || formData.length === 0) {
    throw createError({
      statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
      statusMessage: "No file uploaded",
    });
  }

  const file = formData.find((item) => item.name === "image");

  if (!file) {
    throw createError({
      statusCode: ERROR_STATUS_MAP.BAD_REQUEST,
      statusMessage: "Image is required",
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

  return {
    imageId,
    images: imageUrls.map((url, index) => ({
      url,
      generationId: generationIds[index],
    })),
  };
});
