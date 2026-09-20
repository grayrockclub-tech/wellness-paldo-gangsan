import { getCached } from "./cache";
import type { WellnessPlace } from "./tour-places";

const WELLNESS_TOUR_BASE_URL = "https://apis.data.go.kr/B551011/WellnessTursmService";
const GANGWON_REGION_CODE = "51";
const LIST_CACHE_SECONDS = 60 * 60 * 12;
const DETAIL_CACHE_SECONDS = 60 * 60 * 24 * 7;

type WellnessTourItem = {
  contentId?: string | number;
  contentTypeId?: string | number;
  title?: string;
  baseAddr?: string;
  detailAddr?: string;
  mapX?: string | number;
  mapY?: string | number;
  orgImage?: string;
  thumbImage?: string;
  wellnessThemaCd?: string;
};

type WellnessTourDetailItem = {
  contentId?: string | number;
  overview?: string;
};

export async function getGangwonWellnessTourPlaces(): Promise<WellnessPlace[]> {
  const { data: items } = await getCached(
    `wellness-tour:gangwon:${koreanDateKey()}`,
    LIST_CACHE_SECONDS,
    fetchGangwonWellnessTourItems,
  );

  const details = await mapWithConcurrency(items, 4, async (item) => {
    const contentId = String(item.contentId ?? "");
    if (!contentId) return null;
    const { data } = await getCached(
      `wellness-tour:detail:${contentId}`,
      DETAIL_CACHE_SECONDS,
      () => fetchWellnessTourDetail(contentId),
    );
    return data;
  });
  const overviewByContentId = new Map(
    details.flatMap((detail) => {
      const contentId = String(detail?.contentId ?? "");
      const overview = cleanOverview(detail?.overview);
      return contentId && overview ? [[contentId, overview] as const] : [];
    }),
  );

  return items
    .map((item) => mapWellnessTourItem(item, overviewByContentId.get(String(item.contentId ?? ""))))
    .filter((place): place is WellnessPlace => Boolean(place));
}

async function fetchGangwonWellnessTourItems() {
  const data = await fetchWellnessTourApi("areaBasedList", {
    langDivCd: "KOR",
    lDongRegnCd: GANGWON_REGION_CODE,
    numOfRows: "100",
    pageNo: "1",
    arrange: "A",
  });
  return extractItems<WellnessTourItem>(data);
}

async function fetchWellnessTourDetail(contentId: string) {
  const data = await fetchWellnessTourApi("detailCommon", {
    contentId,
    langDivCd: "KOR",
    numOfRows: "1",
    pageNo: "1",
  });
  return extractItems<WellnessTourDetailItem>(data)[0] ?? null;
}

async function fetchWellnessTourApi(operation: "areaBasedList" | "detailCommon", params: Record<string, string>) {
  const serviceKey = process.env.WELLNESS_TOUR_API_KEY?.trim();
  if (!serviceKey) throw new Error("WELLNESS_TOUR_API_KEY is not configured");

  const url = new URL(`${WELLNESS_TOUR_BASE_URL}/${operation}`);
  url.searchParams.set("serviceKey", decodeServiceKey(serviceKey));
  url.searchParams.set("MobileOS", "ETC");
  url.searchParams.set("MobileApp", "WellnessPaldoGangsan");
  url.searchParams.set("_type", "json");
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Wellness tourism API request failed with ${response.status}`);

  const data = await response.json();
  const header = record(record(data)?.response)?.header;
  const resultCode = String(record(header)?.resultCode ?? "");
  if (resultCode && resultCode !== "0000" && resultCode !== "00") {
    throw new Error(`Wellness tourism API returned ${resultCode}: ${String(record(header)?.resultMsg ?? "Unknown error")}`);
  }
  return data;
}

function mapWellnessTourItem(item: WellnessTourItem, overview?: string): WellnessPlace | null {
  const name = item.title?.trim();
  const lat = Number(item.mapY);
  const lng = Number(item.mapX);
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const addr = [item.baseAddr, item.detailAddr].filter(Boolean).join(" ") || "강원특별자치도";
  const subCategory = subCategoryForTheme(item.wellnessThemaCd, `${name} ${addr}`);
  return {
    id: `wellness-tour-${String(item.contentId ?? name)}`,
    region: regionFromAddress(addr),
    category: "spot",
    subCategory,
    name,
    addr,
    desc: overview || descriptionForTheme(name, item.wellnessThemaCd),
    score: 4.7,
    lat,
    lng,
    image: item.orgImage || item.thumbImage || undefined,
    contentId: item.contentId ? String(item.contentId) : undefined,
    contentTypeId: item.contentTypeId ? String(item.contentTypeId) : undefined,
    dataSource: "wellness-tour",
    descriptionSource: overview ? "wellness-tour-overview" : "generated",
  };
}

function subCategoryForTheme(themeCode = "", text = ""): WellnessPlace["subCategory"] {
  if (themeCode === "EX050600" || /치유의 숲|건강숲|숲/.test(text)) return "forest";
  if (themeCode === "EX050400" || /명상|힐링원|포레스트/.test(text)) return "meditation";
  if (themeCode === "EX050100" || themeCode === "EX050200" || /온천|사우나|스파|찜질/.test(text)) return "spa";
  return "yoga";
}

function descriptionForTheme(name: string, themeCode?: string) {
  if (themeCode === "EX050600") return `${name}은(는) 자연 속에서 산림 치유를 경험할 수 있는 공식 웰니스 관광지입니다.`;
  if (themeCode === "EX050100" || themeCode === "EX050200") return `${name}은(는) 휴식과 회복을 위한 공식 웰니스 관광지입니다.`;
  return `${name}은(는) 한국관광공사 웰니스 관광 정보에 등록된 강원도 힐링스팟입니다.`;
}

function extractItems<T>(data: unknown): T[] {
  const response = record(data)?.response;
  const body = record(response)?.body;
  const items = record(body)?.items;
  const item = record(items)?.item;
  if (Array.isArray(item)) return item.filter(record) as T[];
  return record(item) ? [item as T] : [];
}

function regionFromAddress(address: string) {
  const match = address.match(/강원(?:특별자치도|도)\s+([^\s]+?[시군])/);
  return match?.[1].replace(/[시군]$/, "") ?? "강원";
}

function cleanOverview(overview?: string) {
  return overview
    ?.replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeServiceKey(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>) {
  const result: R[] = [];
  let nextIndex = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      result[index] = await mapper(items[index]);
    }
  }));
  return result;
}

function koreanDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
