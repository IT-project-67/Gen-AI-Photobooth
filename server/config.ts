type AppConfig = {
  STORAGE_BUCKET: string;
  LEONARDO_API_KEY: string;
  LEONARDO_MODEL_ID: string;
  LEONARDO_STYLE_ID: string;
  LEONARDO_DEFAULT_PROMPTS: [string, string, string, string];
};

export const config = (): AppConfig => {
  const rc = useRuntimeConfig();
  return {
    STORAGE_BUCKET: rc.storageBucket ?? "PhotoBooth",
    LEONARDO_API_KEY: rc.leonardoApiKey,
    LEONARDO_MODEL_ID: rc.leonardoModelId ?? "28aeddf8-bd19-4803-80fc-79602d1a9989",
    LEONARDO_STYLE_ID: rc.leonardoStyleId ?? "111dc692-d470-4eec-b791-3475abac4c46",
    LEONARDO_DEFAULT_PROMPTS: [
      "Anime style: Keep everything from the original photo (people, faces, expressions, composition, background). Only change the art style into anime style.",
      "Watercolor painting: Keep everything from the original photo (people, faces, expressions, composition, background). Only change the art style into soft watercolor painting style.",
      "Oil Painting Style: Keep everything from the original photo (people, faces, expressions, composition, background). Only change the art style into Oil Painting Style.",
      "Disney Fairytale Style: Keep everything from the original photo (people, faces, expressions, composition, background). Only change the art style into Disney Fairytale Style.",
    ],
  };
};
