"use client";

import Link from "next/link";
import { Leaf, Map, User } from "lucide-react";
import { useEffect, useState } from "react";

type Place = { id: string; name: string; category: "spot" | "food" | "stay" };
type CourseItem = Place | { type: "travel" };
type SavedPlan = { id: string; date: string; course: CourseItem[] };
type SessionResponse = { authenticated: boolean; user: { nickname: string } | null };

function isPlace(item: CourseItem): item is Place {
  return "name" in item;
}

export default function DesktopProfilePage() {
  const [nickname, setNickname] = useState("");
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
        const session = await sessionResponse.json() as SessionResponse;
        if (!session.authenticated) return;
        setNickname(session.user?.nickname ?? "사용자");

        const routesResponse = await fetch("/api/routes", { cache: "no-store" });
        if (!routesResponse.ok) throw new Error("Failed to load routes");
        const routes = await routesResponse.json() as { plans: SavedPlan[] };
        setPlans(routes.plans);
      } catch {
        setPlans([]);
      } finally {
        setIsLoading(false);
      }
    }
    void loadProfile();
  }, []);

  return (
    <main className="min-h-screen bg-[#eef3ee] px-6 py-8 text-[#17211b]">
      <div className="mx-auto max-w-[1440px]">
        <header className="flex items-center justify-between rounded-2xl border border-[#d3dfd4] bg-white px-6 py-4 shadow-sm">
          <Link href="/desktop" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#005BAA] text-white"><Leaf size={23} /></span>
            <span><strong className="block text-lg text-[#005BAA]">웰니스 강원</strong><small className="font-bold text-[#5f6f66]">원스톱 치유 여행</small></span>
          </Link>
          <nav className="flex items-center gap-3 text-sm font-black">
            <Link href="/desktop" className="rounded-lg border border-[#d3dfd4] px-4 py-2.5 text-[#526158]">전체 탐색</Link>
            <span className="flex items-center gap-2 rounded-lg bg-[#005BAA] px-4 py-2.5 text-white"><User size={16} /> MY</span>
          </nav>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="rounded-2xl bg-gradient-to-br from-emerald-600 to-blue-700 p-7 text-white shadow-sm">
            <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15"><User size={28} /></span>
            <p className="text-xs font-black tracking-[0.16em] text-emerald-100">MY WELLNESS ROUTE</p>
            <h1 className="mt-2 text-2xl font-black">{nickname ? `${nickname}님` : "MY"}</h1>
            <p className="mt-3 text-sm font-bold text-white/80">카카오 로그인 연결됨</p>
          </aside>

          <section className="rounded-2xl border border-[#d3dfd4] bg-white p-7 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div><p className="text-xs font-black tracking-[0.14em] text-[#087a36]">SAVED ROUTES</p><h2 className="mt-2 text-2xl font-black">저장된 원스톱 루트 ({plans.length})</h2></div>
              <Link href="/desktop" className="rounded-lg bg-[#005BAA] px-4 py-3 text-sm font-black text-white">새 루트 만들기</Link>
            </div>
            <div className="mt-7 space-y-4">
              {isLoading ? <p className="py-16 text-center text-sm font-bold text-[#75837b]">저장된 루트를 불러오는 중입니다.</p> : plans.length > 0 ? plans.map((plan) => (
                <article key={plan.id} className="rounded-xl border border-[#dce6dc] bg-[#fbfcf8] p-5">
                  <p className="text-xs font-black text-[#75837b]">{plan.date} 생성</p>
                  <div className="mt-4 flex flex-wrap gap-2">{plan.course.filter(isPlace).map((place) => <span key={`${plan.id}-${place.id}`} className="rounded-lg bg-white px-3 py-2 text-sm font-black text-[#526158]">{place.name}</span>)}</div>
                </article>
              )) : <div className="flex min-h-64 flex-col items-center justify-center rounded-xl bg-[#f4f7f3] text-center"><Map size={34} className="mb-3 text-[#9aad9f]" /><p className="font-black text-[#526158]">저장된 루트가 없습니다.</p></div>}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
