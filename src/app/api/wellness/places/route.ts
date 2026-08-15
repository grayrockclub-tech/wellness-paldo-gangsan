import { getWellnessPlacesFromTourApi } from "@/lib/tour-places";

export async function GET() {
  const result = await getWellnessPlacesFromTourApi();

  return Response.json(result, {
    headers: {
      "Cache-Control": "s-maxage=43200, stale-while-revalidate=86400",
    },
  });
}
