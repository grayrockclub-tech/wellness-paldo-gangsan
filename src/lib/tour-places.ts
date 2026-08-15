import { getCached } from "./cache";
import { GANGWON_AREA_CODE, fetchTourApi } from "./tour-api";

export type WellnessPlaceCategory = "spot" | "food" | "stay";

export type WellnessPlace = {
  id: string;
  region: string;
  category: WellnessPlaceCategory;
  subCategory:
    | "forest"
    | "yoga"
    | "meditation"
    | "healthy"
    | "local"
    | "resort"
    | "wellness"
    | "healing"
    | "hotel";
  name: string;
  addr: string;
  desc: string;
  score: number;
  lat: number;
  lng: number;
  image?: string;
  contentId?: string;
  contentTypeId?: string;
};

type TourItem = {
  addr1?: string;
  addr2?: string;
  areacode?: string;
  contentid?: string | number;
  contenttypeid?: string | number;
  firstimage?: string;
  firstimage2?: string;
  mapx?: string | number;
  mapy?: string | number;
  sigungucode?: string | number;
  tel?: string;
  title?: string;
};

type WellnessPlacesResult = {
  source: "tourapi" | "mixed" | "fallback";
  generatedAt: string;
  places: WellnessPlace[];
  warnings: string[];
};

const regionBySigunguCode: Record<string, string> = {
  "1": "강릉",
  "2": "고성",
  "3": "동해",
  "4": "삼척",
  "5": "속초",
  "6": "양구",
  "7": "양양",
  "8": "영월",
  "9": "원주",
  "10": "인제",
  "11": "정선",
  "12": "철원",
  "13": "춘천",
  "14": "태백",
  "15": "평창",
  "16": "홍천",
  "17": "화천",
  "18": "횡성",
};

const fallbackPlaces: WellnessPlace[] = [
  { id: "gw-1", region: "평창", category: "spot", subCategory: "forest", name: "용평리조트 발왕산 기 스카이워크", addr: "강원도 평창군 대관령면 올림픽로 715", desc: "해발 1,458m 정상에서 즐기는 산림욕과 맑은 공기.", score: 4.8, lat: 37.6433, lng: 128.68 },
  { id: "gw-2", region: "정선", category: "spot", subCategory: "yoga", name: "파크로쉬 리조트앤웰니스", addr: "강원도 정선군 북평면 중봉길 9-12", desc: "요가와 명상, 숙면에 최적화된 프리미엄 웰니스 센터.", score: 4.9, lat: 37.4722, lng: 128.6541 },
  { id: "gw-3", region: "홍천", category: "spot", subCategory: "meditation", name: "힐리언스 선마을", addr: "강원도 홍천군 서면 종자산길 122", desc: "디지털 디톡스와 함께하는 진정한 쉼, 명상 프로그램.", score: 4.9, lat: 37.6681, lng: 127.6536 },
  { id: "gw-5", region: "평창", category: "spot", subCategory: "meditation", name: "월정사 전나무숲길", addr: "강원도 평창군 진부면 오대산로 374-8", desc: "천년의 숲을 걸으며 심신을 정화하는 걷기 명상 코스.", score: 4.9, lat: 37.7308, lng: 128.5925 },
  { id: "food-1", region: "평창", category: "food", subCategory: "healthy", name: "오대산물레방아식당", addr: "강원도 평창군 진부면 오대산로 152", desc: "산채정식과 황태구이로 건강하고 담백한 한 끼를 즐기는 맛집.", score: 4.7, lat: 37.73, lng: 128.59 },
  { id: "food-2", region: "정선", category: "food", subCategory: "local", name: "회동집", addr: "강원도 정선군 정선읍 시장로 62", desc: "곤드레밥과 메밀부침 등 강원도 향토 음식을 선보이는 정선 5일장 명소.", score: 4.8, lat: 37.38, lng: 128.66 },
  { id: "stay-1", region: "평창", category: "stay", subCategory: "resort", name: "켄싱턴 호텔 평창", addr: "강원도 평창군 진부면 진고개로 231", desc: "대규모 프랑스 정원과 포근한 객실이 어우러진 힐링 리조트.", score: 4.8, lat: 37.72, lng: 128.58 },
  { id: "stay-2", region: "정선", category: "stay", subCategory: "wellness", name: "파크로쉬 리조트앤웰니스 (숙박)", addr: "강원도 정선군 북평면 중봉길 9-12", desc: "깊은 산속에서 완벽한 휴식과 숙면을 제공하는 프리미엄 숙소.", score: 4.9, lat: 37.4722, lng: 128.6541 },
];

export function getFallbackWellnessPlaces() {
  return fallbackPlaces;
}

export async function getWellnessPlacesFromTourApi(): Promise<WellnessPlacesResult> {
  const warnings: string[] = [];

  try {
    const [spots, food, stays] = await Promise.all([
      fetchTourList("areaBasedList2", "12", 30),
      fetchTourList("areaBasedList2", "39", 18),
      fetchTourList("areaBasedList2", "32", 18),
    ]);

    const places = [
      ...spots.map((item, index) => mapTourItem(item, "spot", index)),
      ...food.map((item, index) => mapTourItem(item, "food", index)),
      ...stays.map((item, index) => mapTourItem(item, "stay", index)),
    ].filter((place): place is WellnessPlace => Boolean(place));

    if (places.length === 0) {
      warnings.push("TourAPI returned no usable places. Fallback sample data is being used.");
      return fallbackResult(warnings);
    }

    if (places.length < fallbackPlaces.length) {
      warnings.push(`TourAPI returned ${places.length} usable places. Sample places are supplementing the first screen.`);
      return {
        source: "mixed",
        generatedAt: new Date().toISOString(),
        places: mergeWithFallbackPlaces(places),
        warnings,
      };
    }

    return {
      source: "tourapi",
      generatedAt: new Date().toISOString(),
      places,
      warnings,
    };
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : "TourAPI request failed.");
    return fallbackResult(warnings);
  }
}

function mergeWithFallbackPlaces(places: WellnessPlace[]) {
  const usedNames = new Set(places.map((place) => place.name));
  const supplements = fallbackPlaces
    .filter((place) => !usedNames.has(place.name))
    .map((place) => ({ ...place, id: `sample-${place.id}` }));

  return [...places, ...supplements].slice(0, fallbackPlaces.length);
}

async function fetchTourList(operation: "areaBasedList2", contentTypeId: string, numOfRows: number) {
  const cacheKey = `wellness-places:${operation}:${contentTypeId}:${numOfRows}`;
  const data = await getCached(cacheKey, 60 * 60 * 12, () =>
    fetchTourApi({
      operation,
      params: {
        areaCode: GANGWON_AREA_CODE,
        contentTypeId,
        numOfRows,
        pageNo: 1,
        arrange: "O",
        listYN: "Y",
      },
    }),
  );

  return extractTourItems(data);
}

function extractTourItems(data: unknown): TourItem[] {
  if (!isRecord(data)) return [];
  const response = data.response;
  if (!isRecord(response)) return [];
  const body = response.body;
  if (!isRecord(body)) return [];
  const items = body.items;
  if (!isRecord(items)) return [];
  const item = items.item;

  if (Array.isArray(item)) return item.filter(isRecord) as TourItem[];
  if (isRecord(item)) return [item as TourItem];
  return [];
}

function mapTourItem(item: TourItem, category: WellnessPlaceCategory, index: number): WellnessPlace | null {
  const name = item.title?.trim();
  const lat = Number(item.mapy);
  const lng = Number(item.mapx);

  if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    id: String(item.contentid ?? `${category}-${index}`),
    region: regionBySigunguCode[String(item.sigungucode ?? "")] ?? extractRegion(item.addr1) ?? "강원",
    category,
    subCategory: inferSubCategory(name, item.addr1, category),
    name,
    addr: [item.addr1, item.addr2].filter(Boolean).join(" ") || "강원특별자치도",
    desc: buildDescription(name, category),
    score: 4.5 + ((index % 5) * 0.1),
    lat,
    lng,
    image: item.firstimage || item.firstimage2,
    contentId: item.contentid ? String(item.contentid) : undefined,
    contentTypeId: item.contenttypeid ? String(item.contenttypeid) : undefined,
  };
}

function inferSubCategory(name = "", addr = "", category: WellnessPlaceCategory): WellnessPlace["subCategory"] {
  const text = `${name} ${addr}`;

  if (category === "food") {
    return /산채|막국수|황태|순두부|곤드레|약선|한식|두부/.test(text) ? "healthy" : "local";
  }

  if (category === "stay") {
    if (/웰니스|스파|힐|치유|휴양/.test(text)) return "wellness";
    if (/호텔|리조트/.test(text)) return /호텔/.test(text) ? "hotel" : "resort";
    return "healing";
  }

  if (/요가|뮤지엄|문화|체험/.test(text)) return "yoga";
  if (/명상|사찰|월정사|한옥|다도|치유/.test(text)) return "meditation";
  return "forest";
}

function buildDescription(name: string, category: WellnessPlaceCategory) {
  if (category === "food") return `${name}에서 지역 식재료 중심의 건강한 식사를 연결합니다.`;
  if (category === "stay") return `${name}을(를) 루트의 회복형 숙박 거점으로 배치합니다.`;
  return `${name}을(를) 강원 웰니스 활동 후보지로 추천합니다.`;
}

function extractRegion(addr?: string) {
  const match = addr?.match(/강원(?:특별자치도|도)?\s+([가-힣]+시|[가-힣]+군)/);
  return match?.[1]?.replace(/[시군]$/, "");
}

function fallbackResult(warnings: string[]): WellnessPlacesResult {
  return {
    source: "fallback",
    generatedAt: new Date().toISOString(),
    places: fallbackPlaces,
    warnings,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
