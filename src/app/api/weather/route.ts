import { getCached } from "@/lib/cache";
import { fetchWeatherApi, isWeatherApiOperation } from "@/lib/weather-api";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const operation = params.get("operation") ?? "getVilageFcst";

  if (!isWeatherApiOperation(operation)) {
    return Response.json({ error: `Unsupported weather operation: ${operation}` }, { status: 400 });
  }

  try {
    const apiParams = {
      nx: params.get("nx") ?? "73",
      ny: params.get("ny") ?? "134",
      base_date: params.get("base_date") ?? undefined,
      base_time: params.get("base_time") ?? undefined,
      numOfRows: params.get("numOfRows") ?? "80",
      pageNo: params.get("pageNo") ?? "1",
    };

    const cacheKey = `weather:${operation}:${JSON.stringify(apiParams)}`;
    const result = await getCached(cacheKey, 60 * 30, () =>
      fetchWeatherApi({ operation, params: apiParams }),
    );

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Weather API request failed",
        hint: "Set WEATHER_API_KEY in .env.local and Vercel environment variables.",
      },
      { status: 503 },
    );
  }
}
