import { getKakaoRestApiKey } from "@/lib/kakao-auth";
import type { TransitRoute, TransitStep } from "@/lib/kakao-transit";

const cache = new Map<string, { expiresAt: number; route: TransitRoute }>();
const CACHE_MS = 5 * 60 * 1000;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const startLat = Number(params.get("startLat"));
  const startLng = Number(params.get("startLng"));
  const endLat = Number(params.get("endLat"));
  const endLng = Number(params.get("endLng"));
  const startName = params.get("startName") || "출발";
  const endName = params.get("endName") || "도착";

  if (![startLat, startLng, endLat, endLng].every(Number.isFinite)) {
    return Response.json({ error: "startLat, startLng, endLat, and endLng are required." }, { status: 400 });
  }

  const cacheKey = [startLat.toFixed(5), startLng.toFixed(5), endLat.toFixed(5), endLng.toFixed(5)].join(":");
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return Response.json(cached.route);

  const restApiKey = getKakaoRestApiKey();
  if (!restApiKey) {
    return Response.json({ status: "unavailable", message: "카카오 대중교통 API 키가 설정되지 않았습니다." } satisfies TransitRoute, { status: 503 });
  }

  const kakaoUrl = new URL("https://dapi.kakao.com/v2/routing/publictraffic");
  kakaoUrl.searchParams.set("start_x", String(startLng));
  kakaoUrl.searchParams.set("start_y", String(startLat));
  kakaoUrl.searchParams.set("s_name", startName);
  kakaoUrl.searchParams.set("end_x", String(endLng));
  kakaoUrl.searchParams.set("end_y", String(endLat));
  kakaoUrl.searchParams.set("e_name", endName);

  try {
    const response = await fetch(kakaoUrl, {
      headers: { Authorization: `KakaoAK ${restApiKey}` },
      next: { revalidate: 300 },
    });
    if (!response.ok) throw new Error(`Kakao public transit request failed: ${response.status}`);

    const payload = await response.json() as Record<string, unknown>;
    const route = normalizeTransitRoute(payload);
    cache.set(cacheKey, { route, expiresAt: Date.now() + CACHE_MS });
    return Response.json(route);
  } catch {
    return Response.json({ status: "unavailable", message: "대중교통 정보를 불러오지 못했습니다." } satisfies TransitRoute, { status: 502 });
  }
}

function normalizeTransitRoute(payload: Record<string, unknown>): TransitRoute {
  if (payload.status !== "OK") {
    return { status: "no-route", message: payload.status === "NO_RESULTS" ? "이 구간의 대중교통 경로가 없습니다." : "대중교통 경로를 찾지 못했습니다." };
  }

  const properties = asRecord(payload.properties);
  const firstRoute = Array.isArray(payload.routes) ? asRecord(payload.routes[0]) : undefined;
  const routeProperties = asRecord(firstRoute?.properties) ?? firstRoute;
  const landingUrl = typeof properties?.landingURL === "string" ? properties.landingURL : undefined;

  return {
    status: "ready",
    durationMinutes: secondsToMinutes(routeProperties?.totalTime),
    transfers: numberValue(routeProperties?.transfers),
    fare: numberValue(asRecord(routeProperties?.fare)?.value),
    mode: normalizeMode(routeProperties?.type),
    landingUrl,
    steps: Array.isArray(firstRoute?.steps) ? firstRoute.steps.map(normalizeStep).filter((step): step is TransitStep => step !== null) : [],
  };
}

function normalizeStep(value: unknown): TransitStep | null {
  const properties = asRecord(asRecord(value)?.properties);
  if (!properties) return null;
  const vehicles = Array.isArray(properties.vehicles)
    ? properties.vehicles.map((vehicle) => asRecord(vehicle)?.name).filter((name): name is string => typeof name === "string")
    : [];
  const stops = Array.isArray(properties.stops)
    ? properties.stops.map((stop) => asRecord(stop)?.name).filter((name): name is string => typeof name === "string")
    : [];
  const type = properties.type === "BUS" || properties.type === "SUBWAY" || properties.type === "WALKING" ? properties.type : "OTHER";
  return {
    type,
    guidance: typeof properties.guidance === "string" ? properties.guidance : "이동",
    durationMinutes: secondsToMinutes(properties.time),
    vehicles,
    stops: stops.length > 0 ? [stops[0], stops.at(-1)!] : [],
  };
}

function asRecord(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : undefined;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function secondsToMinutes(value: unknown) {
  const seconds = numberValue(value);
  return seconds === undefined ? undefined : Math.max(1, Math.round(seconds / 60));
}

function normalizeMode(value: unknown): TransitRoute["mode"] {
  return value === "BUS" || value === "SUBWAY" || value === "BUS_AND_SUBWAY" ? value : "MIXED";
}
