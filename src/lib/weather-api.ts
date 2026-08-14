import { WEATHER_API_BASE_URL, requireEnv } from "./env";

const allowedWeatherOperations = new Set(["getVilageFcst", "getUltraSrtFcst"]);

export type WeatherApiOperation = "getVilageFcst" | "getUltraSrtFcst";

export type WeatherApiRequest = {
  operation: WeatherApiOperation;
  params?: Record<string, string | number | undefined>;
};

export function isWeatherApiOperation(value: string): value is WeatherApiOperation {
  return allowedWeatherOperations.has(value);
}

export function getLatestForecastBase(now = new Date()) {
  const baseTimes = ["0200", "0500", "0800", "1100", "1400", "1700", "2000", "2300"];
  const kst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const hhmm = `${String(kst.getHours()).padStart(2, "0")}${String(kst.getMinutes()).padStart(2, "0")}`;
  let baseTime = [...baseTimes].reverse().find((time) => time <= hhmm);

  if (!baseTime) {
    kst.setDate(kst.getDate() - 1);
    baseTime = "2300";
  }

  const yyyy = kst.getFullYear();
  const mm = String(kst.getMonth() + 1).padStart(2, "0");
  const dd = String(kst.getDate()).padStart(2, "0");

  return {
    baseDate: `${yyyy}${mm}${dd}`,
    baseTime,
  };
}

export function buildWeatherApiUrl({ operation, params = {} }: WeatherApiRequest) {
  const serviceKey = requireEnv("WEATHER_API_KEY");
  const { baseDate, baseTime } = getLatestForecastBase();
  const url = new URL(`${WEATHER_API_BASE_URL}/${operation}`);

  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("dataType", "JSON");
  url.searchParams.set("numOfRows", "80");
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("base_date", baseDate);
  url.searchParams.set("base_time", baseTime);
  url.searchParams.set("nx", "73");
  url.searchParams.set("ny", "134");

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

export async function fetchWeatherApi(request: WeatherApiRequest) {
  const response = await fetch(buildWeatherApiUrl(request), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Weather API request failed with ${response.status}`);
  }

  return response.json();
}
