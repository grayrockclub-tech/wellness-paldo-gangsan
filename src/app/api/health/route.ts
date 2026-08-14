import { getRuntimeEnvStatus } from "@/lib/env";

export async function GET() {
  return Response.json({
    service: "wellness-paldo-gangsan",
    ok: true,
    environment: getRuntimeEnvStatus(),
    cachePolicy: {
      tourApi: "24h memory cache for low-change tourism data",
      weatherApi: "30m memory cache for forecast data",
    },
  });
}
