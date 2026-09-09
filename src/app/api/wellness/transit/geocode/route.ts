import { getKakaoRestApiKey } from "@/lib/kakao-auth";
import type { TransitOrigin } from "@/lib/kakao-transit";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("query")?.trim();
  const restApiKey = getKakaoRestApiKey();
  if (!query) return Response.json({ error: "query is required." }, { status: 400 });
  if (!restApiKey) return Response.json({ error: "Kakao REST API key is not configured." }, { status: 503 });

  const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
  url.searchParams.set("query", query);
  try {
    const response = await fetch(url, { headers: { Authorization: `KakaoAK ${restApiKey}` } });
    if (!response.ok) throw new Error(`Kakao geocode request failed: ${response.status}`);
    const payload = await response.json() as { documents?: Array<{ place_name?: string; address_name?: string; x?: string; y?: string }> };
    const result = payload.documents?.[0];
    const lng = Number(result?.x);
    const lat = Number(result?.y);
    if (!result || !Number.isFinite(lat) || !Number.isFinite(lng)) return Response.json({ error: "출발지를 찾지 못했습니다." }, { status: 404 });
    return Response.json({ name: result.place_name || result.address_name || query, lat, lng } satisfies TransitOrigin);
  } catch {
    return Response.json({ error: "출발지를 찾지 못했습니다." }, { status: 502 });
  }
}
