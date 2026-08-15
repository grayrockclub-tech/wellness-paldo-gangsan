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
  lclsSystm1?: string;
  lclsSystm2?: string;
  lclsSystm3?: string;
  mapx?: string | number;
  mapy?: string | number;
  sigungucode?: string | number;
  tel?: string;
  title?: string;
};

type TourDetailItem = {
  contentid?: string | number;
  overview?: string;
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

const categoryTargets: Record<WellnessPlaceCategory, number> = {
  spot: 18,
  food: 10,
  stay: 8,
};

const detailOverviewTargets: Record<WellnessPlaceCategory, number> = {
  spot: 10,
  food: 6,
  stay: 6,
};

const areaListRequests: Array<{ contentTypeId: string; rows: number }> = [
  { contentTypeId: "12", rows: 50 },
  { contentTypeId: "39", rows: 30 },
  { contentTypeId: "32", rows: 30 },
];

const keywordRequests = [
  ...["휴양림", "숲", "사찰"].map((keyword) => ({ keyword, rows: 8 })),
  ...["산채", "곤드레"].map((keyword) => ({ keyword, rows: 8 })),
  ...["리조트", "한옥"].map((keyword) => ({ keyword, rows: 8 })),
];

const stronglyRelevantClassCodes = new Set([
  "EX040100", // 템플스테이
  "EX040200", // 사찰문화체험
  "EX050100", // 온천/사우나/스파
  "EX050500", // 뷰티스파
  "EX050700", // 자연치유
  "NA010100", // 산, 고개, 오름, 봉우리
  "NA010200", // 숲
  "NA010500", // 약수터
  "NA030400", // 생태습지
  "NA040100", // 국립공원
  "NA040200", // 도립공원
  "NA040300", // 군립공원
  "NA040400", // 지질공원
  "NA040500", // 생태관광지
  "NA040600", // 자연휴양림
  "NA040700", // 수목원/정원
  "AC010100", // 호텔
  "AC020100", // 콘도
  "AC030100", // 펜션
  "AC030200", // 한옥스테이
  "AC030300", // 농어촌민박
  "VE050200", // 리조트
  "FD010100", // 관광식당
  "FD010200", // 모범음식점
  "FD050200", // 찻집
]);

const relevantMiddleClassCodes = new Set([
  "EX03", // 농산어촌 체험
  "EX04", // 산사체험
  "EX05", // 웰니스관광
  "NA01", // 자연경관(산)
  "NA02", // 자연경관(하천/해양)
  "NA03", // 자연생태
  "NA04", // 자연공원
  "AC01", // 호텔
  "AC02", // 콘도미니엄
  "AC03", // 펜션/민박
  "FD01", // 한식
  "FD05", // 카페/찻집
  "VE03", // 도시공원
  "VE05", // 복합관광시설
]);

const wellnessKeywordPattern =
  /웰니스|힐링|치유|휴양|휴식|명상|요가|숲|산림|수목원|정원|생태|습지|공원|둘레길|트레킹|산책|온천|스파|사우나|사찰|템플|한옥|다도|차밭|약수|계곡|호수|해변|산채|곤드레|황태|순두부|막국수|약선|한식|로컬|리조트|호텔|펜션/;

const weakFitPattern = /모텔|클럽|주점|펍|노래|유흥|게임|카지노|전쟁|충혼|기념비|묘|유적|사지|성곽|시장|쇼핑/;

export function getFallbackWellnessPlaces() {
  return fallbackPlaces;
}

export async function getWellnessPlacesFromTourApi(): Promise<WellnessPlacesResult> {
  const warnings: string[] = [];

  try {
    const [areaResults, keywordResults] = await Promise.all([
      Promise.allSettled(areaListRequests.map(({ contentTypeId, rows }) => fetchAreaList(contentTypeId, rows))),
      Promise.allSettled(keywordRequests.map(({ keyword, rows }) => fetchKeywordList(keyword, rows))),
    ]);
    const areaItems = collectTourItems(areaResults, warnings, "area");
    const keywordItems = collectTourItems(keywordResults, warnings, "keyword");
    const items = dedupeTourItems([...areaItems.flat(), ...keywordItems.flat()]);
    const apiItemCount = items.length;

    const places = await enrichPlacesWithDetailOverview(selectWellnessPlaces(items), warnings);

    if (places.length === 0) {
      warnings.push(
        `TourAPI returned ${apiItemCount} raw items and 0 usable places. Fallback sample data is being used.`,
      );
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

function collectTourItems(
  results: Array<PromiseSettledResult<TourItem[]>>,
  warnings: string[],
  label: string,
) {
  return results.flatMap((result, index) => {
    if (result.status === "fulfilled") return result.value;
    warnings.push(`${label} TourAPI request ${index + 1} failed: ${result.reason instanceof Error ? result.reason.message : "unknown error"}`);
    return [];
  });
}

function mergeWithFallbackPlaces(places: WellnessPlace[]) {
  const usedNames = new Set(places.map((place) => place.name));
  const supplements = fallbackPlaces
    .filter((place) => !usedNames.has(place.name))
    .map((place) => ({ ...place, id: `sample-${place.id}` }));

  return [...places, ...supplements].slice(0, fallbackPlaces.length);
}

async function fetchAreaList(contentTypeId: string, numOfRows: number) {
  const cacheKey = `wellness-places:area:${contentTypeId}:${numOfRows}`;
  const { data } = await getCached(cacheKey, 60 * 60 * 12, () =>
    fetchTourApi({
      operation: "areaBasedList2",
      params: {
        areaCode: GANGWON_AREA_CODE,
        contentTypeId,
        numOfRows,
        pageNo: 1,
        arrange: "O",
      },
    }),
  );

  return extractTourItems(data);
}

async function fetchKeywordList(keyword: string, numOfRows: number) {
  const cacheKey = `wellness-places:keyword:${keyword}:${numOfRows}`;
  const { data } = await getCached(cacheKey, 60 * 60 * 12, () =>
    fetchTourApi({
      operation: "searchKeyword2",
      params: {
        areaCode: GANGWON_AREA_CODE,
        keyword,
        numOfRows,
        pageNo: 1,
        arrange: "O",
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

function dedupeTourItems(items: TourItem[]) {
  const seen = new Set<string>();
  const result: TourItem[] = [];

  for (const item of items) {
    const key = String(item.contentid ?? `${item.title}:${item.addr1}`);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

function selectWellnessPlaces(items: TourItem[]) {
  const scored = items
    .map((item) => {
      const category = resolveCategory(item);
      const fitScore = scoreWellnessFit(item, category);
      const place = mapTourItem(item, category, fitScore);
      return place ? { place, fitScore } : null;
    })
    .filter((entry): entry is { place: WellnessPlace; fitScore: number } => Boolean(entry))
    .filter(({ fitScore }) => fitScore >= 2)
    .sort((a, b) => b.fitScore - a.fitScore || b.place.score - a.place.score);

  const selected: WellnessPlace[] = [];
  const selectedIds = new Set<string>();

  for (const category of ["spot", "food", "stay"] as const) {
    const categoryPlaces = scored
      .filter(({ place }) => place.category === category)
      .slice(0, categoryTargets[category]);

    for (const { place } of categoryPlaces) {
      selected.push(place);
      selectedIds.add(place.id);
    }
  }

  if (selected.length < fallbackPlaces.length) {
    for (const { place } of scored) {
      if (selectedIds.has(place.id)) continue;
      selected.push(place);
      selectedIds.add(place.id);
      if (selected.length >= fallbackPlaces.length) break;
    }
  }

  return selected;
}

async function enrichPlacesWithDetailOverview(places: WellnessPlace[], warnings: string[]) {
  const detailTargetIds = new Set(
    (["spot", "food", "stay"] as const).flatMap((category) =>
      places
        .filter((place) => place.category === category)
        .slice(0, detailOverviewTargets[category])
        .map((place) => place.id),
    ),
  );
  const targetPlaces = places.filter((place) => detailTargetIds.has(place.id));
  const detailResults = await Promise.allSettled(targetPlaces.map((place) => fetchDetailCommon(place)));
  const overviewByPlaceId = new Map<string, string>();

  targetPlaces.forEach((place, index) => {
    const result = detailResults[index];
    if (result.status === "rejected") {
      warnings.push(`detailCommon2 request for ${place.name} failed: ${result.reason instanceof Error ? result.reason.message : "unknown error"}`);
      return;
    }

    const overview = cleanOverview(result.value?.overview);
    if (overview) overviewByPlaceId.set(place.id, overview);
  });

  return places.map((place) => ({ ...place, desc: overviewByPlaceId.get(place.id) ?? place.desc }));
}

async function fetchDetailCommon(place: WellnessPlace) {
  if (!place.contentId) return null;

  const cacheKey = `wellness-places:detail-common:${place.contentId}:${place.contentTypeId ?? ""}`;
  const { data } = await getCached(cacheKey, 60 * 60 * 24 * 7, () =>
    fetchTourApi({
      operation: "detailCommon2",
      params: {
        contentId: place.contentId,
        contentTypeId: place.contentTypeId,
        defaultYN: "Y",
        firstImageYN: "Y",
        areacodeYN: "Y",
        catcodeYN: "Y",
        addrinfoYN: "Y",
        mapinfoYN: "Y",
        overviewYN: "Y",
      },
    }),
  );

  return extractTourDetailItem(data);
}

function extractTourDetailItem(data: unknown): TourDetailItem | null {
  const items = extractTourItems(data);
  if (items.length > 0) return items[0] as TourDetailItem;

  if (!isRecord(data)) return null;
  const response = data.response;
  if (!isRecord(response)) return null;
  const body = response.body;
  if (!isRecord(body)) return null;
  const item = isRecord(body.items) ? body.items.item : undefined;

  if (Array.isArray(item) && isRecord(item[0])) return item[0] as TourDetailItem;
  if (isRecord(item)) return item as TourDetailItem;
  return null;
}

function cleanOverview(overview?: string) {
  return overview
    ?.replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function mapTourItem(item: TourItem, category: WellnessPlaceCategory, fitScore: number): WellnessPlace | null {
  const name = item.title?.trim();
  const lat = Number(item.mapy);
  const lng = Number(item.mapx);

  if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    id: String(item.contentid ?? `${category}-${name}`),
    region: regionBySigunguCode[String(item.sigungucode ?? "")] ?? extractRegion(item.addr1) ?? "강원",
    category,
    subCategory: inferSubCategory(name, item.addr1, category, item),
    name,
    addr: [item.addr1, item.addr2].filter(Boolean).join(" ") || "강원특별자치도",
    desc: buildDescription(item, category),
    score: Math.min(4.9, 4.3 + fitScore * 0.06),
    lat,
    lng,
    image: item.firstimage || item.firstimage2,
    contentId: item.contentid ? String(item.contentid) : undefined,
    contentTypeId: item.contenttypeid ? String(item.contenttypeid) : undefined,
  };
}

function resolveCategory(item: TourItem): WellnessPlaceCategory {
  const contentTypeId = String(item.contenttypeid ?? "");
  if (contentTypeId === "39") return "food";
  if (contentTypeId === "32") return "stay";
  return "spot";
}

function scoreWellnessFit(item: TourItem, category: WellnessPlaceCategory) {
  const text = itemText(item);
  const class1 = item.lclsSystm1 ?? "";
  const class2 = item.lclsSystm2 ?? "";
  const class3 = item.lclsSystm3 ?? "";
  let score = 0;

  if (stronglyRelevantClassCodes.has(class3)) score += 5;
  if (relevantMiddleClassCodes.has(class2)) score += 3;
  if (class1 === "NA") score += 3;
  if (class1 === "EX") score += 2;
  if (category === "food" && class2 === "FD01") score += 3;
  if (category === "stay" && ["AC01", "AC02", "AC03"].includes(class2)) score += 3;
  if (wellnessKeywordPattern.test(text)) score += 3;
  if (/(휴양림|자연치유|웰니스|온천|스파|템플스테이|수목원|정원|산채|곤드레|황태|순두부|한옥|리조트)/.test(text)) {
    score += 2;
  }
  if (weakFitPattern.test(text) && !/(자연|생태|공원|숲|휴양|한식|산채|곤드레|황태|순두부)/.test(text)) {
    score -= 4;
  }

  return score;
}

function inferSubCategory(name = "", addr = "", category: WellnessPlaceCategory, item?: TourItem): WellnessPlace["subCategory"] {
  const text = `${name} ${addr} ${item?.lclsSystm1 ?? ""} ${item?.lclsSystm2 ?? ""} ${item?.lclsSystm3 ?? ""}`;

  if (category === "food") {
    return /산채|막국수|황태|순두부|곤드레|약선|한식|두부/.test(text) ? "healthy" : "local";
  }

  if (category === "stay") {
    if (/웰니스|스파|힐|치유|휴양/.test(text)) return "wellness";
    if (/호텔|리조트/.test(text)) return /호텔/.test(text) ? "hotel" : "resort";
    return "healing";
  }

  if (/요가|뮤지엄|문화|체험|EX03|EX05/.test(text)) return "yoga";
  if (/명상|사찰|월정사|한옥|다도|치유/.test(text)) return "meditation";
  return "forest";
}

function buildDescription(item: TourItem, category: WellnessPlaceCategory) {
  const name = item.title?.trim() ?? "이 장소";
  const class2 = item.lclsSystm2 ?? "";
  const class3 = item.lclsSystm3 ?? "";

  if (category === "food") {
    if (class2 === "FD01") return `${name}에서 강원 로컬 식재료 중심의 건강한 식사를 연결합니다.`;
    if (class2 === "FD05") return `${name}에서 쉬어가는 차와 카페 동선을 연결합니다.`;
    return `${name}에서 여행 동선에 맞는 지역 음식을 연결합니다.`;
  }

  if (category === "stay") {
    if (["AC010100", "AC020100", "VE050200"].includes(class3)) {
      return `${name}을(를) 회복형 숙박과 휴식 거점으로 배치합니다.`;
    }
    return `${name}을(를) 강원 체류형 여행의 숙박 후보로 추천합니다.`;
  }

  if (class2 === "EX05") return `${name}은(는) TourAPI 신분류상 웰니스관광 후보지입니다.`;
  if (class2 === "NA04") return `${name}은(는) 자연공원/휴양림 계열의 치유형 야외 활동지입니다.`;
  if (class2 === "NA01" || class2 === "NA03") return `${name}은(는) 자연경관과 생태 자원을 활용한 웰니스 활동 후보지입니다.`;
  if (class2 === "EX04") return `${name}은(는) 산사체험과 마음 회복 동선에 적합한 후보지입니다.`;
  return `${name}을(를) 강원 웰니스 활동 후보지로 추천합니다.`;
}

function itemText(item: TourItem) {
  return [
    item.title,
    item.addr1,
    item.addr2,
    item.lclsSystm1,
    item.lclsSystm2,
    item.lclsSystm3,
  ]
    .filter(Boolean)
    .join(" ");
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
