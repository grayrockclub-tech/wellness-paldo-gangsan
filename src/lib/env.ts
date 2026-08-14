export type RuntimeEnvStatus = {
  tourApiKey: boolean;
  weatherApiKey: boolean;
  tourApiBaseUrl: string;
  weatherApiBaseUrl: string;
};

export const TOUR_API_BASE_URL =
  process.env.TOUR_API_BASE_URL ?? "https://apis.data.go.kr/B551011/KorService2";

export const WEATHER_API_BASE_URL =
  process.env.WEATHER_API_BASE_URL ??
  "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0";

export function getRuntimeEnvStatus(): RuntimeEnvStatus {
  return {
    tourApiKey: Boolean(process.env.TOUR_API_KEY),
    weatherApiKey: Boolean(process.env.WEATHER_API_KEY),
    tourApiBaseUrl: TOUR_API_BASE_URL,
    weatherApiBaseUrl: WEATHER_API_BASE_URL,
  };
}

export function requireEnv(name: "TOUR_API_KEY" | "WEATHER_API_KEY"): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}
