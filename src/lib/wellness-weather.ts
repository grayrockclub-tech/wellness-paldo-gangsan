import { getCached } from "./cache";
import { fetchWeatherApi } from "./weather-api";

type WeatherApiItem = {
  category?: string;
  fcstDate?: string;
  fcstTime?: string;
  fcstValue?: string;
};

type WeatherApiResponse = {
  response?: {
    header?: {
      resultCode?: string;
      resultMsg?: string;
    };
    body?: {
      items?: {
        item?: WeatherApiItem | WeatherApiItem[];
      };
    };
  };
};

export type WeatherActivityLevel = "good" | "normal" | "caution";

export type WellnessWeatherSummary = {
  source: "weatherapi" | "fallback";
  generatedAt: string;
  nx: number;
  ny: number;
  forecastTime?: string;
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  rainAmount?: string;
  sky: string;
  precipitation: string;
  activityLevel: WeatherActivityLevel;
  activityLabel: string;
  message: string;
  recommendationHint: string;
  warnings?: string[];
};

const fallbackWeather: Omit<WellnessWeatherSummary, "generatedAt" | "nx" | "ny"> = {
  source: "fallback",
  sky: "날씨 확인 필요",
  precipitation: "정보 없음",
  activityLevel: "normal",
  activityLabel: "기상 확인 대기",
  message: "기상 API 응답을 아직 확인하지 못했습니다.",
  recommendationHint: "실제 운영에서는 선택한 장소 좌표 기준의 초단기예보로 추천 사유를 보강합니다.",
};

export async function getWellnessWeather(lat: number, lng: number): Promise<WellnessWeatherSummary> {
  const { nx, ny } = convertLatLngToGrid(lat, lng);
  const cacheKey = `wellness-weather:ultra:${nx}:${ny}`;

  try {
    const result = await getCached(cacheKey, 60 * 20, () =>
      fetchWeatherApi({
        operation: "getUltraSrtFcst",
        params: { nx, ny, numOfRows: "60" },
      }),
    );

    return {
      ...buildWeatherSummary(result.data as WeatherApiResponse, nx, ny),
      source: "weatherapi",
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      ...fallbackWeather,
      generatedAt: new Date().toISOString(),
      nx,
      ny,
      warnings: [error instanceof Error ? error.message : "Weather API request failed"],
    };
  }
}

function buildWeatherSummary(data: WeatherApiResponse, nx: number, ny: number): Omit<WellnessWeatherSummary, "source" | "generatedAt"> {
  const header = data.response?.header;
  if (header?.resultCode && header.resultCode !== "00") {
    throw new Error(header.resultMsg ?? `Weather API result code ${header.resultCode}`);
  }

  const rawItems = data.response?.body?.items?.item;
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
  if (items.length === 0) {
    throw new Error("Weather API returned no forecast items");
  }

  const selectedTime = findSelectedForecastTime(items);
  const values = new Map(
    items
      .filter((item) => item.fcstDate && item.fcstTime && `${item.fcstDate}${item.fcstTime}` === selectedTime)
      .map((item) => [item.category, item.fcstValue]),
  );

  const temperature = toNumber(values.get("T1H"));
  const humidity = toNumber(values.get("REH"));
  const windSpeed = toNumber(values.get("WSD"));
  const sky = getSkyLabel(values.get("SKY"));
  const precipitation = getPrecipitationLabel(values.get("PTY"));
  const rainAmount = values.get("RN1") || undefined;
  const activityLevel = getActivityLevel({ temperature, windSpeed, precipitation, rainAmount });

  return {
    nx,
    ny,
    forecastTime: formatForecastTime(selectedTime),
    temperature,
    humidity,
    windSpeed,
    rainAmount,
    sky,
    precipitation,
    activityLevel,
    activityLabel: getActivityLabel(activityLevel),
    message: getWeatherMessage({ temperature, sky, precipitation }),
    recommendationHint: getRecommendationHint(activityLevel, precipitation),
  };
}

function findSelectedForecastTime(items: WeatherApiItem[]) {
  const now = getKstYyyymmddhhmm();
  const times = [...new Set(items.map((item) => `${item.fcstDate ?? ""}${item.fcstTime ?? ""}`).filter(Boolean))].sort();
  return times.find((time) => time >= now) ?? times[0];
}

function getKstYyyymmddhhmm() {
  const kst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const yyyy = kst.getFullYear();
  const mm = String(kst.getMonth() + 1).padStart(2, "0");
  const dd = String(kst.getDate()).padStart(2, "0");
  const hh = String(kst.getHours()).padStart(2, "0");
  const min = String(kst.getMinutes()).padStart(2, "0");
  return `${yyyy}${mm}${dd}${hh}${min}`;
}

function formatForecastTime(value?: string) {
  if (!value || value.length !== 12) return undefined;
  return `${value.slice(4, 6)}.${value.slice(6, 8)} ${value.slice(8, 10)}:${value.slice(10, 12)}`;
}

function getSkyLabel(value?: string) {
  return {
    "1": "맑음",
    "3": "구름 많음",
    "4": "흐림",
  }[value ?? ""] ?? "날씨 확인 필요";
}

function getPrecipitationLabel(value?: string) {
  return {
    "0": "없음",
    "1": "비",
    "2": "비/눈",
    "3": "눈",
    "5": "빗방울",
    "6": "빗방울/눈날림",
    "7": "눈날림",
  }[value ?? ""] ?? "정보 없음";
}

function getActivityLevel({
  temperature,
  windSpeed,
  precipitation,
  rainAmount,
}: {
  temperature?: number;
  windSpeed?: number;
  precipitation: string;
  rainAmount?: string;
}): WeatherActivityLevel {
  const hasRain = precipitation !== "없음" && precipitation !== "정보 없음";
  const rainNumber = rainAmount ? Number(rainAmount.replace(/[^0-9.]/g, "")) : 0;

  if (hasRain || rainNumber >= 1 || (windSpeed ?? 0) >= 8 || (temperature ?? 20) <= -5 || (temperature ?? 20) >= 33) {
    return "caution";
  }

  if ((windSpeed ?? 0) >= 5 || (temperature ?? 20) <= 3 || (temperature ?? 20) >= 29) {
    return "normal";
  }

  return "good";
}

function getActivityLabel(level: WeatherActivityLevel) {
  return {
    good: "야외 웰니스 적합",
    normal: "가벼운 야외 활동 가능",
    caution: "실내·숙소형 코스 권장",
  }[level];
}

function getWeatherMessage({
  temperature,
  sky,
  precipitation,
}: {
  temperature?: number;
  sky: string;
  precipitation: string;
}) {
  const tempText = temperature === undefined ? "현재 기온 정보 없음" : `예상 기온 ${temperature.toFixed(0)}도`;
  return `${tempText}, 하늘은 ${sky}, 강수는 ${precipitation}입니다.`;
}

function getRecommendationHint(level: WeatherActivityLevel, precipitation: string) {
  if (level === "caution") {
    return precipitation === "없음"
      ? "기온이나 바람 조건을 고려해 실내 휴식형 장소를 우선 추천합니다."
      : "강수 예보가 있어 숙소, 식당, 실내 명상형 장소를 우선 추천합니다.";
  }

  if (level === "normal") {
    return "무리한 장거리 이동보다 짧은 산책과 실내 휴식을 섞은 코스를 추천합니다.";
  }

  return "야외 산책, 숲길, 전망형 웰니스 스팟을 우선 추천하기 좋은 조건입니다.";
}

function toNumber(value?: string) {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function convertLatLngToGrid(lat: number, lng: number) {
  const earthRadius = 6371.00877;
  const grid = 5.0;
  const slat1 = 30.0;
  const slat2 = 60.0;
  const olon = 126.0;
  const olat = 38.0;
  const xo = 43;
  const yo = 136;
  const degToRad = Math.PI / 180.0;

  const re = earthRadius / grid;
  const slat1Rad = slat1 * degToRad;
  const slat2Rad = slat2 * degToRad;
  const olonRad = olon * degToRad;
  const olatRad = olat * degToRad;

  let sn = Math.tan(Math.PI * 0.25 + slat2Rad * 0.5) / Math.tan(Math.PI * 0.25 + slat1Rad * 0.5);
  sn = Math.log(Math.cos(slat1Rad) / Math.cos(slat2Rad)) / Math.log(sn);

  let sf = Math.tan(Math.PI * 0.25 + slat1Rad * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1Rad)) / sn;

  let ro = Math.tan(Math.PI * 0.25 + olatRad * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  let ra = Math.tan(Math.PI * 0.25 + lat * degToRad * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);

  let theta = lng * degToRad - olonRad;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  return {
    nx: Math.floor(ra * Math.sin(theta) + xo + 0.5),
    ny: Math.floor(ro - ra * Math.cos(theta) + yo + 0.5),
  };
}
