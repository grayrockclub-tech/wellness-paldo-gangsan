import { TOUR_API_BASE_URL, requireEnv } from "./env";

export const GANGWON_AREA_CODE = "32";

const allowedTourOperations = new Set([
  "areaBasedList2",
  "searchKeyword2",
  "locationBasedList2",
  "detailCommon2",
  "detailIntro2",
  "detailImage2",
  "searchStay2",
]);

export type TourApiOperation =
  | "areaBasedList2"
  | "searchKeyword2"
  | "locationBasedList2"
  | "detailCommon2"
  | "detailIntro2"
  | "detailImage2"
  | "searchStay2";

export type TourApiRequest = {
  operation: TourApiOperation;
  params?: Record<string, string | number | undefined>;
};

export function isTourApiOperation(value: string): value is TourApiOperation {
  return allowedTourOperations.has(value);
}

export function buildTourApiUrl({ operation, params = {} }: TourApiRequest) {
  const serviceKey = normalizeServiceKey(requireEnv("TOUR_API_KEY"));
  const url = new URL(`${TOUR_API_BASE_URL}/${operation}`);

  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("MobileOS", "ETC");
  url.searchParams.set("MobileApp", "WellnessPaldoGangsan");
  url.searchParams.set("_type", "json");

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

function normalizeServiceKey(serviceKey: string) {
  try {
    return decodeURIComponent(serviceKey);
  } catch {
    return serviceKey;
  }
}

export async function fetchTourApi(request: TourApiRequest) {
  const response = await fetch(buildTourApiUrl(request), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`TourAPI request failed with ${response.status}`);
  }

  return response.json();
}
