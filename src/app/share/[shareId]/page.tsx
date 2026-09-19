import Link from "next/link";
import type { Metadata } from "next";
import { Leaf, MapPin, Route } from "lucide-react";
import { notFound } from "next/navigation";
import { ensureSavedRoutesTable } from "@/lib/neon-db";
import { SaveSharedRouteButton } from "@/components/save-shared-route-button";

type SharedPlace = {
  id: string;
  name: string;
  category: "spot" | "food" | "stay";
  region?: string;
  addr?: string;
  timeRange?: string;
};

type SharedCourseItem = SharedPlace | { type: "travel"; duration?: number };
type SavedRouteRow = { route_data: unknown; created_at: string };

async function getSharedPlan(shareId: string) {
  const sql = await ensureSavedRoutesTable();
  const rows = await sql`
    SELECT route_data, created_at
    FROM saved_routes
    WHERE share_id = ${shareId}
    LIMIT 1
  ` as SavedRouteRow[];
  const row = rows[0];
  if (!row) return null;

  const plan = (typeof row.route_data === "string" ? JSON.parse(row.route_data) : row.route_data) as { course?: SharedCourseItem[]; travelMode?: "walk" | "drive" };
  const course = Array.isArray(plan.course) ? plan.course : [];
  const places = course.filter(isPlace);
  return { plan, course, places, date: new Date(row.created_at).toLocaleDateString("ko-KR") };
}

function isPlace(item: SharedCourseItem): item is SharedPlace {
  return "name" in item;
}

function categoryLabel(category: SharedPlace["category"]) {
  return category === "food" ? "맛집" : category === "stay" ? "숙소" : "웰니스 스팟";
}

export async function generateMetadata({ params }: { params: Promise<{ shareId: string }> }): Promise<Metadata> {
  const { shareId } = await params;
  const shared = await getSharedPlan(shareId).catch(() => null);
  const title = shared?.places.slice(0, 2).map((place) => place.name).join(" · ") || "웰니스 원스톱 루트";
  const description = shared ? `${shared.date} 생성 · 웰니스 강원에서 만든 여행 일정` : "웰니스 강원 원스톱 여행 일정";
  return {
    title: `${title} | 웰니스 강원`,
    description,
    openGraph: { title: `${title} | 웰니스 강원`, description, type: "website" },
  };
}

export default async function SharedRoutePage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const shared = await getSharedPlan(shareId).catch(() => null);
  if (!shared) notFound();
  const { plan, course, places, date } = shared;
  const title = places.slice(0, 2).map((place) => place.name).join(" · ") || "웰니스 원스톱 루트";

  return (
    <main className="min-h-screen bg-[#eef5ef] px-4 py-8 text-[#17211b] sm:px-6 sm:py-12">
      <section className="mx-auto max-w-2xl overflow-hidden rounded-[2rem] border border-[#d7e5d9] bg-white shadow-xl shadow-emerald-950/5">
        <header className="bg-gradient-to-br from-emerald-600 to-blue-700 px-6 py-8 text-white sm:px-10">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-black text-white/90"><Leaf size={19} /> 웰니스 강원</Link>
          <p className="mt-8 text-xs font-black tracking-[0.16em] text-emerald-100">SHARED WELLNESS ROUTE</p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">{title}</h1>
          <p className="mt-3 text-sm font-bold text-white/80">{date} 생성 · {plan.travelMode === "drive" ? "자동차" : "대중교통"} 이동</p>
        </header>

        <div className="p-6 sm:p-10">
          <div className="mb-6 flex items-center gap-2 text-sm font-black text-[#087a36]"><Route size={18} /> 여행 일정</div>
          <ol className="space-y-4">
            {course.map((item, index) => isPlace(item) ? (
              <li key={`${item.id}-${index}`} className="rounded-2xl border border-[#dce8de] bg-[#fbfdfb] p-5">
                <div className="flex items-start gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#005BAA] text-xs font-black text-white">{places.findIndex((place) => place.id === item.id) + 1}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-emerald-700">{categoryLabel(item.category)}{item.timeRange ? ` · ${item.timeRange}` : ""}</p>
                    <h2 className="mt-1 text-lg font-black text-slate-800">{item.name}</h2>
                    {item.addr && <p className="mt-2 flex items-start gap-1 text-sm font-medium leading-6 text-slate-500"><MapPin size={15} className="mt-1 shrink-0 text-emerald-600" />{item.addr}</p>}
                  </div>
                </div>
              </li>
            ) : (
              <li key={`travel-${index}`} className="flex items-center gap-3 px-5 text-sm font-bold text-slate-400"><span className="h-px flex-1 bg-[#dce8de]" />이동 {item.duration ?? "-"}분<span className="h-px flex-1 bg-[#dce8de]" /></li>
            ))}
          </ol>
          <div className="mt-10">
            <Link href="/" className="flex w-full items-center justify-center rounded-xl bg-[#005BAA] px-5 py-4 text-sm font-black text-white">나만의 루트 만들기</Link>
            <SaveSharedRouteButton shareId={shareId} />
          </div>
        </div>
      </section>
    </main>
  );
}
