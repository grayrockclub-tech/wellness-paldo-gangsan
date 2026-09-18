import MobileHome from "./mobile-home";
import { getCurrentWellnessPlaceSnapshot } from "@/lib/wellness-place-snapshots";
import { getFallbackWellnessPlaces } from "@/lib/tour-places";

export const dynamic = "force-dynamic";

export default async function Page() {
  const snapshot = await getCurrentWellnessPlaceSnapshot().catch(() => null);
  const places = snapshot?.places ?? getFallbackWellnessPlaces();
  return <MobileHome initialPlaces={places} />;
}
