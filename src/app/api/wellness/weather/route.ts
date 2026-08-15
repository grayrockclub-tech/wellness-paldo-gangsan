import { getWellnessWeather } from "@/lib/wellness-weather";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Response.json(
      {
        error: "lat and lng query parameters are required.",
        example: "/api/wellness/weather?lat=37.4722&lng=128.6541",
      },
      { status: 400 },
    );
  }

  const weather = await getWellnessWeather(lat, lng);
  return Response.json(weather);
}
