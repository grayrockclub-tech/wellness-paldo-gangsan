"use client";

import Link from "next/link";
import { Leaf, LogOut, Map, Menu, Trash2, User } from "lucide-react";
import { useEffect, useState } from "react";
import { KakaoShareButton } from "@/components/kakao-share-button";

type Place = { id: string; name: string; category: "spot" | "food" | "stay" };
type CourseItem = Place | { type: "travel" };
type SavedPlan = { id: string; date: string; course: CourseItem[] };
type SessionResponse = { authenticated: boolean; user: { nickname: string; profileImage?: string } | null };

function isPlace(item: CourseItem): item is Place {
  return "name" in item;
}

export default function DesktopProfilePage() {
  const [nickname, setNickname] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
        const session = await sessionResponse.json() as SessionResponse;
        if (!session.authenticated) return;
        setIsAuthenticated(true);
        setNickname(session.user?.nickname ?? "사용자");
        setProfileImage(session.user?.profileImage ?? null);

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

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setIsAuthenticated(false);
      setNickname("");
      setProfileImage(null);
      setPlans([]);
    }
  }

  async function deletePlan(plan: SavedPlan) {
    if (!window.confirm(`“${plan.course.filter(isPlace).map((place) => place.name).join(", ")}” 루트를 삭제할까요?`)) return;

    setDeletingPlanId(plan.id);
    try {
      const response = await fetch(`/api/routes?id=${encodeURIComponent(plan.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete route");
      setPlans((current) => current.filter((item) => item.id !== plan.id));
    } catch {
      alert("저장된 루트를 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setDeletingPlanId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#eef3ee] text-[#17211b]">
      <div className="mx-auto min-h-screen max-w-[1760px] bg-[#f7faf6]">
        <header className="sticky top-0 z-30 border-b border-[#d3dfd4] bg-white/95 px-6 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/desktop" className="flex items-center gap-3">
            <Leaf size={28} className="text-[#0DB14B]" />
            <span><strong className="block text-lg text-[#005BAA]">웰니스 강원</strong><small className="font-bold text-[#5f6f66]">원스톱 치유 여행</small></span>
          </Link>
          <nav className="flex items-center gap-3 text-sm font-black">
            <Link href="/desktop" className="flex items-center gap-2 rounded-lg border border-[#d3dfd4] bg-[#fbfcf8] px-4 py-3 text-[#526158]"><Menu size={18} />루트 계획</Link>
            {isAuthenticated ? (
              <span aria-label="MY" className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-[#d3dfd4] bg-white text-[#005BAA]">
                {profileImage ? <span aria-hidden="true" className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${profileImage})` }} /> : <User size={19} />}
              </span>
            ) : (
              <a href="/api/auth/kakao/start?next=/desktop/profile" className="flex items-center gap-2 rounded-lg border border-[#d3dfd4] bg-[#fbfcf8] px-4 py-3 text-[#005BAA]"><User size={18} />로그인</a>
            )}
          </nav>
          </div>
        </header>

        <section className="mx-auto grid max-w-[1760px] gap-6 px-6 py-8 lg:grid-cols-[300px_1fr]">
          <aside className="rounded-2xl bg-gradient-to-br from-emerald-600 to-blue-700 p-7 text-white shadow-sm">
            <span className="mb-5 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-white/15">
              {profileImage ? <span aria-hidden="true" className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${profileImage})` }} /> : <User size={28} />}
            </span>
            <p className="text-xs font-black tracking-[0.16em] text-emerald-100">MY WELLNESS ROUTE</p>
            <h1 className="mt-2 text-2xl font-black">{isAuthenticated ? `${nickname}님` : "로그인"}</h1>
            <p className="mt-3 text-sm font-bold text-white/80">{isAuthenticated ? "카카오 로그인 연결됨" : "로그인하면 저장한 루트를 볼 수 있습니다."}</p>
            {isAuthenticated ? (
              <button type="button" onClick={() => void handleLogout()} className="mt-7 flex w-full items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/20">
                <LogOut size={16} /> 로그아웃
              </button>
            ) : (
              <a href="/api/auth/kakao/start?next=/desktop/profile" className="mt-7 flex w-full items-center justify-center gap-2 rounded-lg bg-[#FEE500] px-4 py-3 text-sm font-black text-[#191919] transition hover:bg-[#FEE500]/90">
                <User size={16} /> 카카오 로그인
              </a>
            )}
          </aside>

          <section className="rounded-2xl border border-[#d3dfd4] bg-white p-7 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div><p className="text-xs font-black tracking-[0.14em] text-[#087a36]">SAVED ROUTES</p><h2 className="mt-2 text-2xl font-black">저장된 원스톱 루트 ({plans.length})</h2></div>
              <Link href="/desktop" className="rounded-lg bg-[#005BAA] px-4 py-3 text-sm font-black text-white">새 루트 만들기</Link>
            </div>
            <div className="mt-7 space-y-4">
              {isLoading ? <p className="py-16 text-center text-sm font-bold text-[#75837b]">저장된 루트를 불러오는 중입니다.</p> : plans.length > 0 ? plans.map((plan) => (
                <article key={plan.id} className="rounded-xl border border-[#dce6dc] bg-[#fbfcf8] p-5">
                  <div className="flex items-center justify-between gap-4"><p className="text-xs font-black text-[#75837b]">{plan.date} 생성</p><div className="flex flex-wrap items-center justify-end gap-2"><Link href={`/desktop?loadPlan=${encodeURIComponent(plan.id)}`} className="rounded-lg border border-[#005BAA] px-3 py-2 text-xs font-black text-[#005BAA]">불러오기</Link><KakaoShareButton routeId={plan.id} routeTitle={plan.course.filter(isPlace).map((place) => place.name).slice(0, 2).join(" · ") || "웰니스 원스톱 루트"} /><button type="button" onClick={() => void deletePlan(plan)} disabled={deletingPlanId === plan.id} className="flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-black text-rose-700 disabled:opacity-50"><Trash2 size={13} />{deletingPlanId === plan.id ? "삭제 중" : "삭제"}</button></div></div>
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
