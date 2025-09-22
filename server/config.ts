type AppConfig = {
  STORAGE_BUCKET: string;
};

export const config = (): AppConfig => {
  const rc = useRuntimeConfig();
  return {
    STORAGE_BUCKET: rc.storageBucket ?? "PhotoBooth",
  };
};
