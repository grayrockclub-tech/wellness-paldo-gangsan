import { getWellnessPlacesFromTourApi } from "@/lib/tour-places";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getWellnessPlacesFromTourApi();

  return Response.json(result, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
