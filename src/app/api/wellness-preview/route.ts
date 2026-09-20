import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const BASE_URL = "https://apis.data.go.kr/B551011/WellnessTursmService";

function noStoreJson(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

async function requestWellnessApi(operation: string, params: Record<string, string>) {
  const serviceKey = process.env.WELLNESS_TOUR_API_KEY;
  if (!serviceKey) throw new Error("WELLNESS_TOUR_API_KEY is not configured.");

  const query = new URLSearchParams({ MobileOS: "ETC", MobileApp: "WellnessGangwon", _type: "json", ...params });
  const response = await fetch(`${BASE_URL}/${operation}?serviceKey=${serviceKey}&${query}`, { cache: "no-store" });
  const raw = await response.text();

  try {
    return { status: response.status, data: JSON.parse(raw) };
  } catch {
    return { status: response.status, data: { raw } };
  }
}

export async function GET(request: NextRequest) {
  const contentId = request.nextUrl.searchParams.get("contentId");
  const contentTypeId = request.nextUrl.searchParams.get("contentTypeId");

  try {
    if (contentId) {
      const baseParams = { contentId, langDivCd: "KOR", numOfRows: "20", pageNo: "1" };
      const [common, images, intro] = await Promise.all([
        requestWellnessApi("detailCommon", baseParams),
        requestWellnessApi("detailImage", { ...baseParams, imageYN: "Y" }),
        contentTypeId ? requestWellnessApi("detailIntro", { ...baseParams, contentTypeId }) : Promise.resolve(null),
      ]);
      return noStoreJson({ common, images, intro });
    }

    const page = Math.min(Math.max(Number(request.nextUrl.searchParams.get("page") ?? "1") || 1, 1), 10);
    const list = await requestWellnessApi("areaBasedList", {
      langDivCd: "KOR",
      numOfRows: "100",
      pageNo: String(page),
      arrange: "A",
    });
    return noStoreJson({ list });
  } catch (error) {
    console.error("Wellness preview request failed", error);
    return noStoreJson({ error: "웰니스 관광 정보를 조회하지 못했습니다." }, 503);
  }
}
