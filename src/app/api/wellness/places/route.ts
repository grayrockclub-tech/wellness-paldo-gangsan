import { getCurrentWellnessPlaceSnapshot } from "@/lib/wellness-place-snapshots";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getCurrentWellnessPlaceSnapshot();
    return Response.json({
      source: snapshot.source,
      generatedAt: snapshot.generatedAt,
      places: snapshot.places,
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Failed to load wellness place snapshot", error);
    return Response.json({ error: "장소 목록을 불러오지 못했습니다." }, { status: 503 });
  }
}
