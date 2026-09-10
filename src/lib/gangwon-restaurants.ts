import { getCached } from "./cache";
import { GANGWON_RESTAURANT_API_BASE_URL, getGangwonRestaurantApiKey } from "./env";
import { getKakaoRestApiKey } from "./kakao-auth";

const RESTAURANT_DATASET_PATH = "/uddi:b5e09df5-615b-4d00-8692-826b13ab01c1";
const RESTAURANT_CACHE_SECONDS = 60 * 60 * 24;
const GEOCODE_CACHE_SECONDS = 60 * 60 * 24 * 30;
const MAX_RESTAURANT_PLACES = 100;
const RESTAURANT_CANDIDATE_LIMIT = 140;
const RESTAURANT_PAGE_SIZE = 1000;
const MAX_RESTAURANT_FETCH_PAGES = 20;
const GEOCODE_CONCURRENCY = 15;

type GangwonRestaurantRow = {
  업소명?: string;
  업종?: string;
  업태?: string;
  도로명주소?: string;
};

type GangwonRestaurantResponse = {
  data?: GangwonRestaurantRow[];
  totalCount?: number;
};

type KakaoAddressDocument = {
  address_name?: string;
  x?: string;
  y?: string;
};

type KakaoAddressResponse = {
  documents?: KakaoAddressDocument[];
};

export type GangwonRestaurantPlace = {
  id: string;
  region: string;
  category: "food";
  subCategory: "healthy" | "local";
  name: string;
  addr: string;
  desc: string;
  score: number;
  lat: number;
  lng: number;
  dataSource: "gangwon-restaurant";
  descriptionSource: "gangwon-restaurant";
};

const wellnessFoodPattern =
  /산채|곤드레|황태|순두부|두부|막국수|메밀|약선|보양|버섯|나물|한식|백반|생선|해물|회|장어|샤브|오리|닭|국밥|탕|전골/;

const healthyFoodPattern = /산채|곤드레|황태|순두부|두부|막국수|메밀|약선|보양|버섯|나물|생선|해물|샤브/;

const nonTravelerRestaurantPattern =
  /직원식당|구내식당|산업체|단체급식|급식소|클럽하우스|골프장|휴게소|푸드코트|웨딩|예식장|장례식장|병원|의료원|학교|대학교|군부대|생활관|연수원|관공서|마트|백화점|편의점|슈퍼|이마트|홈플러스|롯데마트/;

const majorRegionQuotas: Record<string, number> = {
  춘천: 10,
  원주: 10,
  속초: 10,
  강릉: 10,
  동해: 8,
  양양: 7,
};

const otherRegions = ["고성", "삼척", "영월", "인제", "정선", "평창", "홍천", "횡성", "태백", "양구", "철원", "화천"];

const regionQuotas: Record<string, number> = Object.fromEntries([
  ...Object.entries(majorRegionQuotas),
  ...otherRegions.map((region, index) => [region, index < 9 ? 4 : 3]),
]);

export async function getGangwonRestaurantPlaces(): Promise<GangwonRestaurantPlace[]> {
  const kakaoRestApiKey = getKakaoRestApiKey();
  if (!kakaoRestApiKey) {
    throw new Error("KAKAO_REST_API_KEY is required to geocode Gangwon restaurant addresses.");
  }

  const rows = await fetchGangwonRestaurantRows();
  const candidates = selectRestaurantCandidates(rows);
  const results = await mapWithConcurrency(candidates, GEOCODE_CONCURRENCY, async (row) => {
      const address = row.도로명주소?.trim() ?? "";
      const coordinates = await geocodeAddress(address, kakaoRestApiKey);
      if (!coordinates) return null;
      return mapRestaurantRow(row, coordinates);
    });

  return prioritizeRestaurantPlaces(results.flatMap((result) => (result ? [result] : [])));
}

async function fetchGangwonRestaurantRows() {
  const serviceKey = normalizeServiceKey(getGangwonRestaurantApiKey());
  if (!serviceKey) {
    throw new Error("GANGWON_RESTAURANT_API_KEY or TOUR_API_KEY is not configured");
  }

  const firstPage = await fetchRestaurantPage(serviceKey, 1);
  const totalPages = Math.max(1, Math.ceil((firstPage.totalCount ?? firstPage.rows.length) / RESTAURANT_PAGE_SIZE));
  const pages = getRestaurantPages(totalPages).filter((page) => page !== 1);
  const otherPages = await Promise.all(pages.map((page) => fetchRestaurantPage(serviceKey, page)));
  return [firstPage, ...otherPages].flatMap((page) => page.rows);
}

async function fetchRestaurantPage(serviceKey: string, page: number) {
  const { data } = await getCached(`gangwon-restaurants:v2:${getKoreanDateKey()}:${page}`, RESTAURANT_CACHE_SECONDS, async () => {
    const url = new URL(`${GANGWON_RESTAURANT_API_BASE_URL}${RESTAURANT_DATASET_PATH}`);
    url.searchParams.set("serviceKey", serviceKey);
    url.searchParams.set("page", String(page));
    url.searchParams.set("perPage", String(RESTAURANT_PAGE_SIZE));
    url.searchParams.set("returnType", "JSON");

    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      throw new Error(`Gangwon restaurant API request failed with ${response.status}`);
    }

    const payload = (await response.json()) as GangwonRestaurantResponse;
    return {
      rows: Array.isArray(payload.data) ? payload.data : [],
      totalCount: typeof payload.totalCount === "number" ? payload.totalCount : undefined,
    };
  });

  return data;
}

function getKoreanDateKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getRestaurantPages(totalPages: number) {
  if (totalPages <= MAX_RESTAURANT_FETCH_PAGES) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages]);
  for (let index = 1; index < MAX_RESTAURANT_FETCH_PAGES - 1; index += 1) {
    pages.add(1 + Math.round(((totalPages - 1) * index) / (MAX_RESTAURANT_FETCH_PAGES - 1)));
  }
  return [...pages].sort((a, b) => a - b);
}

function selectRestaurantCandidates(rows: GangwonRestaurantRow[]) {
  const usable = rows.filter((row) => {
    const name = row.업소명?.trim();
    const address = row.도로명주소?.trim();
    return Boolean(
      name &&
        address &&
        /강원/.test(address) &&
        wellnessFoodPattern.test(name) &&
        !nonTravelerRestaurantPattern.test(name),
    );
  });

  const byRegion = new Map<string, GangwonRestaurantRow[]>();
  for (const row of usable) {
    const region = extractRegion(row.도로명주소) ?? "강원";
    const regionRows = byRegion.get(region) ?? [];
    regionRows.push(row);
    byRegion.set(region, regionRows);
  }

  const selected: GangwonRestaurantRow[] = [];
  const selectedKeys = new Set<string>();
  for (const [region, quota] of Object.entries(regionQuotas)) {
    const regionRows = byRegion.get(region) ?? [];
    for (const row of regionRows.slice(0, quota + 2)) {
      const key = restaurantKey(row);
      if (selectedKeys.has(key)) continue;
      selected.push(row);
      selectedKeys.add(key);
    }
  }

  for (const row of usable) {
    if (selected.length >= RESTAURANT_CANDIDATE_LIMIT) break;
    const key = restaurantKey(row);
    if (selectedKeys.has(key)) continue;
    selected.push(row);
    selectedKeys.add(key);
  }

  return selected;
}

function prioritizeRestaurantPlaces(places: GangwonRestaurantPlace[]) {
  const byRegion = new Map<string, GangwonRestaurantPlace[]>();
  for (const place of places) {
    const regionPlaces = byRegion.get(place.region) ?? [];
    regionPlaces.push(place);
    byRegion.set(place.region, regionPlaces);
  }

  const selected: GangwonRestaurantPlace[] = [];
  const selectedIds = new Set<string>();
  for (const [region, quota] of Object.entries(regionQuotas)) {
    for (const place of (byRegion.get(region) ?? []).slice(0, quota)) {
      selected.push(place);
      selectedIds.add(place.id);
    }
  }

  const addFrom = (allowedRegions: Set<string>) => {
    for (const place of places) {
      if (selected.length >= MAX_RESTAURANT_PLACES) return;
      if (selectedIds.has(place.id) || !allowedRegions.has(place.region)) continue;
      selected.push(place);
      selectedIds.add(place.id);
    }
  };

  addFrom(new Set(otherRegions));
  addFrom(new Set(Object.keys(majorRegionQuotas)));
  return selected.slice(0, MAX_RESTAURANT_PLACES);
}

async function mapWithConcurrency<TInput, TOutput>(
  values: TInput[],
  concurrency: number,
  mapper: (value: TInput) => Promise<TOutput>,
) {
  const results: TOutput[] = new Array(values.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        results[index] = await mapper(values[index]);
      } catch {
        results[index] = null as TOutput;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return results;
}

async function geocodeAddress(address: string, kakaoRestApiKey: string) {
  const { data } = await getCached(`gangwon-restaurant:geocode:${address}`, GEOCODE_CACHE_SECONDS, async () => {
    const url = new URL("https://dapi.kakao.com/v2/local/search/address.json");
    url.searchParams.set("query", address);
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `KakaoAK ${kakaoRestApiKey}`,
      },
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as KakaoAddressResponse;
    const document = payload.documents?.[0];
    const lat = Number(document?.y);
    const lng = Number(document?.x);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  });

  return data;
}

function mapRestaurantRow(
  row: GangwonRestaurantRow,
  coordinates: { lat: number; lng: number },
): GangwonRestaurantPlace {
  const name = row.업소명?.trim() ?? "강원 일반음식점";
  const address = row.도로명주소?.trim() ?? "강원특별자치도";
  const businessType = row.업태?.trim() || row.업종?.trim() || "일반음식점";
  const text = `${name} ${businessType}`;

  return {
    id: `gangwon-food-${stableId(`${name}:${address}`)}`,
    region: extractRegion(address) ?? "강원",
    category: "food",
    subCategory: healthyFoodPattern.test(text) ? "healthy" : "local",
    name,
    addr: address,
    desc: `강원특별자치도 일반음식점 현황에 등록된 ${businessType} 업소입니다.`,
    score: healthyFoodPattern.test(text) ? 4.6 : 4.4,
    lat: coordinates.lat,
    lng: coordinates.lng,
    dataSource: "gangwon-restaurant",
    descriptionSource: "gangwon-restaurant",
  };
}

function extractRegion(address?: string) {
  const match = address?.match(/강원(?:특별자치도|도)?\s+([가-힣]+시|[가-힣]+군)/);
  return match?.[1]?.replace(/[시군]$/, "");
}

function restaurantKey(row: GangwonRestaurantRow) {
  return `${row.업소명?.replace(/\s+/g, "")}:${row.도로명주소?.replace(/\s+/g, "")}`;
}

function stableId(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function normalizeServiceKey(serviceKey: string) {
  try {
    return decodeURIComponent(serviceKey);
  } catch {
    return serviceKey;
  }
}
