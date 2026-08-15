import { getCached } from "@/lib/cache";
import { GANGWON_AREA_CODE, fetchTourApi, isTourApiOperation } from "@/lib/tour-api";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const operation = params.get("operation") ?? "areaBasedList2";

  if (!isTourApiOperation(operation)) {
    return Response.json({ error: `Unsupported TourAPI operation: ${operation}` }, { status: 400 });
  }

  try {
    const apiParams: Record<string, string | undefined> = {};
    const passthroughParams = [
      "areaCode",
      "sigunguCode",
      "contentTypeId",
      "keyword",
      "contentId",
      "mapX",
      "mapY",
      "radius",
      "numOfRows",
      "pageNo",
      "arrange",
      "defaultYN",
      "firstImageYN",
      "areacodeYN",
      "catcodeYN",
      "addrinfoYN",
      "mapinfoYN",
      "overviewYN",
    ];

    for (const key of passthroughParams) {
      apiParams[key] = params.get(key) ?? undefined;
    }

    if (operation !== "detailCommon2") {
      apiParams.areaCode = apiParams.areaCode ?? GANGWON_AREA_CODE;
      apiParams.numOfRows = apiParams.numOfRows ?? "10";
      apiParams.pageNo = apiParams.pageNo ?? "1";
      apiParams.arrange = apiParams.arrange ?? "O";
    }

    const cacheKey = `tour:v2:${operation}:${JSON.stringify(apiParams)}`;
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
