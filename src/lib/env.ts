export type RuntimeEnvStatus = {
  tourApiKey: boolean;
  weatherApiKey: boolean;
  tourApiBaseUrl: string;
  weatherApiBaseUrl: string;
};

const DEFAULT_TOUR_API_BASE_URL = "https://apis.data.go.kr/B551011/KorService2";
const DEFAULT_WEATHER_API_BASE_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0";

export const TOUR_API_BASE_URL = getOptionalEnv("TOUR_API_BASE_URL", DEFAULT_TOUR_API_BASE_URL);

export const WEATHER_API_BASE_URL = getOptionalEnv("WEATHER_API_BASE_URL", DEFAULT_WEATHER_API_BASE_URL);

export function getRuntimeEnvStatus(): RuntimeEnvStatus {
  return {
    tourApiKey: Boolean(process.env.TOUR_API_KEY),
    weatherApiKey: Boolean(process.env.WEATHER_API_KEY),
    tourApiBaseUrl: TOUR_API_BASE_URL,
    weatherApiBaseUrl: WEATHER_API_BASE_URL,
  };
}

export function requireEnv(name: "TOUR_API_KEY" | "WEATHER_API_KEY"): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

function getOptionalEnv(name: "TOUR_API_BASE_URL" | "WEATHER_API_BASE_URL", fallback: string) {
  const value = process.env[name]?.trim();
  return value || fallback;
}
