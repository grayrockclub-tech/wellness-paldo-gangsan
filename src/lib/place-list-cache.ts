const PLACE_LIST_CACHE_KEY = "wellness_place_list_v1";

type PlaceListSource = "tourapi" | "mixed" | "fallback";

type CachedPlaceList<T> = {
  dateKey: string;
  source: PlaceListSource;
  places: T[];
  isCurrent: boolean;
};

export function getCachedPlaceList<T>(): CachedPlaceList<T> | null {
  try {
    const raw = window.localStorage.getItem(PLACE_LIST_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedPlaceList<T>;
    if (!Array.isArray(cached.places) || cached.places.length === 0) return null;
    return { ...cached, isCurrent: cached.dateKey === getKoreanDateKey() };
  } catch {
    return null;
  }
}

export function cachePlaceList<T>(places: T[], source: PlaceListSource) {
  try {
    const payload: Omit<CachedPlaceList<T>, "isCurrent"> = { dateKey: getKoreanDateKey(), source, places };
    window.localStorage.setItem(PLACE_LIST_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Local storage can be unavailable in private browsing; the live response remains usable.
  }
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
