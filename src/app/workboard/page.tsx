import { getRuntimeEnvStatus } from "@/lib/env";
import { buildWellnessRecommendations } from "@/lib/wellness-data";

const weeklyTasks = [
  {
    owner: "박상범",
    title: "프로젝트/배포 세팅",
    detail: "Next.js, TypeScript, 서버 API 라우트, Vercel 환경변수 구조를 고정합니다.",
    status: "진행 중",
  },
  {
    owner: "박상범",
    title: "TourAPI/기상 API 연결",
    detail: "API 키를 서버에서만 사용하고 강원도 기준 샘플 호출을 검증합니다.",
    status: "대기",
  },
  {
    owner: "남지훈",
    title: "웰니스 추천 기준표",
    detail: "날씨, 체류시간, 실내/야외, 지역 특화 기준으로 추천 규칙을 정리합니다.",
    status: "대기",
  },
  {
    owner: "공동",
    title: "MVP 범위 확정",
    detail: "8월 말까지 반드시 완성할 기능과 보류할 기능을 분리합니다.",
    status: "대기",
  },
];

const apiRoutes = [
  {
    path: "/api/health",
    purpose: "환경변수와 캐시 정책 확인",
  },
  {
    path: "/api/tour?operation=areaBasedList2&areaCode=32",
    purpose: "TourAPI 강원도 관광 데이터 호출",
  },
  {
    path: "/api/weather?operation=getVilageFcst&nx=73&ny=134",
    purpose: "기상청 단기예보 데이터 호출",
  },
  {
    path: "/api/recommendations?weather=rain&duration=half-day",
    purpose: "날씨/체류시간 기반 추천 샘플",
  },
];

export default function WorkboardPage() {
  const env = getRuntimeEnvStatus();
  const sample = buildWellnessRecommendations({ weather: "rain", duration: "half-day" });

  return (
    <main className="min-h-screen bg-[#f6f7f3] text-[#17211b]">
      <section className="border-b border-[#d6ded2] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-10 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-[#31735b]">2026 관광데이터 활용 공모전</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-normal text-[#10291f] sm:text-5xl">
                웰니스 팔도강산
              </h1>
              <p className="mt-4 text-lg leading-8 text-[#4b5b52]">
                한국관광공사 TourAPI와 실시간 기상 데이터를 결합해 강원도 웰니스 여행 코스를 추천하는
                웹서비스입니다. 이번 주 목표는 개발 기반과 제출 리스크를 먼저 고정하는 것입니다.
              </p>
            </div>
            <div className="grid min-w-64 grid-cols-2 gap-3 rounded-lg border border-[#d6ded2] bg-[#fbfcf8] p-4 text-sm">
              <StatusPill label="TourAPI" ready={env.tourApiKey} />
              <StatusPill label="기상 API" ready={env.weatherApiKey} />
              <div className="col-span-2 border-t border-[#d6ded2] pt-3 text-[#59665f]">
                API 키는 서버 환경변수에서만 읽습니다.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1.2fr_0.8fr] lg:px-10">
        <div className="rounded-lg border border-[#d6ded2] bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">이번 주 작업판</h2>
              <p className="mt-1 text-sm text-[#637067]">8월 16일까지 끝내야 하는 기반 작업입니다.</p>
            </div>
            <span className="rounded-md bg-[#e8f1ec] px-3 py-2 text-sm font-semibold text-[#24604b]">
              Week 1
            </span>
          </div>

          <div className="mt-5 grid gap-3">
            {weeklyTasks.map((task) => (
              <article
                className="grid gap-3 rounded-lg border border-[#dfe6dc] bg-[#fbfcf8] p-4 sm:grid-cols-[88px_1fr_88px]"
                key={task.title}
              >
                <div className="text-sm font-semibold text-[#31735b]">{task.owner}</div>
                <div>
                  <h3 className="font-semibold">{task.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#59665f]">{task.detail}</p>
                </div>
                <div className="text-sm font-medium text-[#6b5846]">{task.status}</div>
              </article>
            ))}
          </div>
        </div>

        <aside className="rounded-lg border border-[#d6ded2] bg-[#10291f] p-5 text-white">
          <h2 className="text-xl font-semibold">제출 리스크 기준</h2>
          <dl className="mt-5 grid gap-4 text-sm">
            <div>
              <dt className="text-[#b8dccb]">절대 마감</dt>
              <dd className="mt-1 text-2xl font-semibold">2026.09.21 16:00</dd>
            </div>
            <div>
              <dt className="text-[#b8dccb]">권장 제출</dt>
              <dd className="mt-1 text-lg font-semibold">2026.09.18까지 1차 완료</dd>
            </div>
            <div>
              <dt className="text-[#b8dccb]">웹 제출 필수</dt>
              <dd className="mt-1 leading-6">
                서비스 URL, 테스트 계정, OpenAPI 인증키, 활용 API, 기능설명서 PDF
              </dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 pb-10 sm:px-8 lg:grid-cols-2 lg:px-10">
        <div className="rounded-lg border border-[#d6ded2] bg-white p-5">
          <h2 className="text-xl font-semibold">서버 API 라우트</h2>
          <div className="mt-5 grid gap-3">
            {apiRoutes.map((route) => (
              <div className="rounded-lg border border-[#dfe6dc] p-4" key={route.path}>
                <code className="break-all text-sm font-semibold text-[#1d5e8a]">{route.path}</code>
                <p className="mt-2 text-sm text-[#59665f]">{route.purpose}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[#d6ded2] bg-white p-5">
          <h2 className="text-xl font-semibold">추천 샘플</h2>
          <p className="mt-1 text-sm text-[#637067]">{sample.title}</p>
          <div className="mt-5 grid gap-3">
            {sample.places.map((place) => (
              <article className="rounded-lg border border-[#dfe6dc] bg-[#fbfcf8] p-4" key={place.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{place.title}</h3>
                  <span className="rounded-md bg-[#eef0d8] px-2 py-1 text-xs font-semibold text-[#6e6a24]">
                    {place.region}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#59665f]">{place.reason}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {place.tags.map((tag) => (
                    <span className="rounded-md bg-white px-2 py-1 text-xs text-[#59665f]" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function StatusPill({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="rounded-md border border-[#d6ded2] bg-white p-3">
      <div className="text-xs text-[#637067]">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${ready ? "text-[#24604b]" : "text-[#9b4d2d]"}`}>
        {ready ? "설정됨" : "미설정"}
      </div>
    </div>
  );
}
