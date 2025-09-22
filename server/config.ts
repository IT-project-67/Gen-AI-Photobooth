export const config = {
  STORAGE_BUCKET: useRuntimeConfig().storageBucket,
} satisfies {
  STORAGE_BUCKET: string;
};
