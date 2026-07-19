export function getMiMoConfig() {
  return {
    apiKey:
      process.env.MIMO_API_KEY?.trim() ||
      process.env.XIAOMIMIMO_API_KEY?.trim(),
    baseURL:
      process.env.MIMO_BASE_URL?.trim() ||
      process.env.XIAOMIMIMO_BASE_URL?.trim() ||
      "https://api.xiaomimimo.com/v1",
    model:
      process.env.MIMO_MODEL?.trim() ||
      process.env.XIAOMIMIMO_MODEL?.trim() ||
      "mimo-v2.5",
  };
}
