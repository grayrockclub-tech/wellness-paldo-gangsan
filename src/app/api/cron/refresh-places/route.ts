import { NextRequest } from "next/server";
import { refreshWellnessPlaceSnapshot } from "@/lib/wellness-place-snapshots";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await refreshWellnessPlaceSnapshot();
    return Response.json({ ok: true, snapshotDate: snapshot.snapshotDate, places: snapshot.places.length });
  } catch (error) {
    console.error("Failed to refresh wellness place snapshot", error);
    return Response.json({ error: "목록 스냅샷을 갱신하지 못했습니다." }, { status: 503 });
  }
}
