export default defineEventHandler(async () => {
  const { leonardoApiKey } = useRuntimeConfig();
  const { LeonardoClient } = await import("~~/server/clients");
  return new LeonardoClient(leonardoApiKey).getUserInfo();
});
