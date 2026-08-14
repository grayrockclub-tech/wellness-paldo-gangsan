import { getCached } from "@/lib/cache";
import { GANGWON_AREA_CODE, fetchTourApi, isTourApiOperation } from "@/lib/tour-api";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const operation = params.get("operation") ?? "areaBasedList2";

  if (!isTourApiOperation(operation)) {
    return Response.json({ error: `Unsupported TourAPI operation: ${operation}` }, { status: 400 });
  }

  try {
    const apiParams = {
      areaCode: params.get("areaCode") ?? GANGWON_AREA_CODE,
      sigunguCode: params.get("sigunguCode") ?? undefined,
      contentTypeId: params.get("contentTypeId") ?? undefined,
      keyword: params.get("keyword") ?? undefined,
      contentId: params.get("contentId") ?? undefined,
      mapX: params.get("mapX") ?? undefined,
      mapY: params.get("mapY") ?? undefined,
      radius: params.get("radius") ?? undefined,
      numOfRows: params.get("numOfRows") ?? "10",
      pageNo: params.get("pageNo") ?? "1",
      arrange: params.get("arrange") ?? "O",
    };

    const cacheKey = `tour:${operation}:${JSON.stringify(apiParams)}`;
    const result = await getCached(cacheKey, 60 * 60 * 24, () =>
      fetchTourApi({ operation, params: apiParams }),
    );

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "TourAPI request failed",
        hint: "Set TOUR_API_KEY in .env.local and Vercel environment variables.",
      },
      { status: 503 },
    );
  }
}
