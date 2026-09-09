export type RuntimeEnvStatus = {
  tourApiKey: boolean;
  gangwonRestaurantApiKey: boolean;
  weatherApiKey: boolean;
  kakaoMapKey: boolean;
  kakaoRestApiKey: boolean;
  tourApiBaseUrl: string;
  gangwonRestaurantApiBaseUrl: string;
  weatherApiBaseUrl: string;
};

const DEFAULT_TOUR_API_BASE_URL = "https://apis.data.go.kr/B551011/KorService2";
const DEFAULT_GANGWON_RESTAURANT_API_BASE_URL = "https://api.odcloud.kr/api/3034242/v1";
const DEFAULT_WEATHER_API_BASE_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0";

export const TOUR_API_BASE_URL = getOptionalEnv("TOUR_API_BASE_URL", DEFAULT_TOUR_API_BASE_URL);

export const GANGWON_RESTAURANT_API_BASE_URL = getOptionalEnv(
  "GANGWON_RESTAURANT_API_BASE_URL",
  DEFAULT_GANGWON_RESTAURANT_API_BASE_URL,
);

export const WEATHER_API_BASE_URL = getOptionalEnv("WEATHER_API_BASE_URL", DEFAULT_WEATHER_API_BASE_URL);

export function getRuntimeEnvStatus(): RuntimeEnvStatus {
  return {
    tourApiKey: Boolean(process.env.TOUR_API_KEY),
    gangwonRestaurantApiKey: Boolean(getGangwonRestaurantApiKey()),
    weatherApiKey: Boolean(process.env.WEATHER_API_KEY),
    kakaoMapKey: Boolean(process.env.NEXT_PUBLIC_KAKAO_MAP_KEY),
    kakaoRestApiKey: Boolean(process.env.KAKAO_REST_API_KEY),
    tourApiBaseUrl: TOUR_API_BASE_URL,
    gangwonRestaurantApiBaseUrl: GANGWON_RESTAURANT_API_BASE_URL,
    weatherApiBaseUrl: WEATHER_API_BASE_URL,
  };
}

export function requireEnv(name: "TOUR_API_KEY" | "GANGWON_RESTAURANT_API_KEY" | "WEATHER_API_KEY"): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

export function getGangwonRestaurantApiKey() {
  return process.env.GANGWON_RESTAURANT_API_KEY?.trim() || process.env.TOUR_API_KEY?.trim() || "";
}

function getOptionalEnv(
  name: "TOUR_API_BASE_URL" | "GANGWON_RESTAURANT_API_BASE_URL" | "WEATHER_API_BASE_URL",
  fallback: string,
) {
  const value = process.env[name]?.trim();
  return value || fallback;
}
