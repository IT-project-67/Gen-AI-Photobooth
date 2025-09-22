export const config = {
  STORAGE_BUCKET: useRuntimeConfig().storageBucket ?? "PhotoBooth",
} satisfies {
  STORAGE_BUCKET: string;
};
