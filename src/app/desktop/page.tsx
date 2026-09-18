import DesktopClient from "./desktop-client";
import { getCurrentWellnessPlaceSnapshot } from "@/lib/wellness-place-snapshots";
import { getFallbackWellnessPlaces } from "@/lib/tour-places";

export const dynamic = "force-dynamic";

export default async function DesktopPage() {
  const snapshot = await getCurrentWellnessPlaceSnapshot().catch(() => null);
  const places = snapshot?.places ?? getFallbackWellnessPlaces();

  return <DesktopClient initialPlaces={places} />;
}
