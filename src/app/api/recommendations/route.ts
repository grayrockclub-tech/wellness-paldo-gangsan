import { buildWellnessRecommendations, type TripDuration, type WeatherMode } from "@/lib/wellness-data";

const weatherModes = new Set(["clear", "rain", "heat", "cold"]);
const durations = new Set(["half-day", "full-day", "overnight"]);

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const weather = params.get("weather") ?? "clear";
  const duration = params.get("duration") ?? "half-day";

  if (!weatherModes.has(weather) || !durations.has(duration)) {
    return Response.json(
      {
        error: "Invalid recommendation scenario",
        allowed: {
          weather: [...weatherModes],
          duration: [...durations],
        },
      },
      { status: 400 },
    );
  }

  return Response.json(
    buildWellnessRecommendations({
      weather: weather as WeatherMode,
      duration: duration as TripDuration,
    }),
  );
}
