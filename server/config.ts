type AppConfig = {
  STORAGE_BUCKET: string;
  LEONARDO_API_KEY: string;
};

export const config = (): AppConfig => {
  const rc = useRuntimeConfig();
  return {
    STORAGE_BUCKET: rc.storageBucket ?? "PhotoBooth",
    LEONARDO_API_KEY: rc.leonardoApiKey,
  };
};
