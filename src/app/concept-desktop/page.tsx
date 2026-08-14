const weatherChoices = [
  { label: "맑음", value: "산림 산책", active: true },
  { label: "비", value: "실내 스파" },
  { label: "폭염", value: "짧은 동선" },
  { label: "한파", value: "숙박 회복" },
];

const courseStops = [
  {
    time: "10:30",
    title: "평창 치유숲 산책",
    meta: "야외 · 호흡 · 90분",
    reason: "강수 확률이 낮고 기온이 안정적이라 숲길 산책을 먼저 배치했습니다.",
  },
  {
    time: "12:30",
    title: "원주 로컬 보양식",
    meta: "음식 · 체력 회복 · 60분",
    reason: "오후 활동 전 체력 보충을 위해 지역 식재료 기반 식사를 연결합니다.",
  },
  {
    time: "15:00",
    title: "정선 산림 숙박 체크인",
    meta: "숙박 · 숙면 · 1박",
    reason: "다음 날 이동 부담을 줄이고 숙면/명상 프로그램을 이어가기 좋습니다.",
  },
];

const wellnessPlaces = [
  {
    title: "모나용평 발왕산 기 스카이워크",
    region: "평창",
    tag: "산림",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "힐리언스 선마을",
    region: "홍천",
    tag: "디지털 디톡스",
    image:
      "https://images.unsplash.com/photo-1470770903676-69b98201ea1c?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "강릉 스파 회복 코스",
    region: "강릉",
    tag: "스파",
    image:
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=900&q=80",
  },
];

const stays = [
  {
    title: "파크로쉬 리조트앤웰니스",
    region: "정선",
    tags: ["숙면", "명상", "산림 체류"],
    score: "94",
    reason: "선택한 숲 코스와 가깝고 숙면 프로그램을 함께 구성하기 좋습니다.",
  },
  {
    title: "홍천 치유형 스테이",
    region: "홍천",
    tags: ["디톡스", "조용한 숙소", "1박"],
    score: "89",
    reason: "디지털 디톡스 일정과 어울리는 조용한 체류형 숙소입니다.",
  },
];

export default function DesktopConceptPage() {
  return (
    <main className="min-h-screen bg-[#edf2ec] text-[#14251d]">
      <div className="mx-auto grid min-h-screen max-w-[1440px] grid-cols-[248px_1fr]">
        <aside className="border-r border-[#d2ddd0] bg-[#f8faf5] px-6 py-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0f3d2e] text-lg font-black text-white">
              W
            </div>
            <div>
              <h1 className="text-lg font-black tracking-normal">웰니스 팔도강산</h1>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6b7b71]">
                Desktop Preview
              </p>
            </div>
          </div>

          <nav className="mt-10 grid gap-2 text-sm font-bold">
            {["오늘의 추천", "지역 탐색", "1박 코스", "숙박정보", "제출 점검"].map((item, index) => (
              <button
                className={`rounded-xl px-4 py-3 text-left transition ${
                  index === 0 ? "bg-[#0f3d2e] text-white" : "text-[#526158] hover:bg-white"
                }`}
                key={item}
              >
                {item}
              </button>
            ))}
          </nav>

          <section className="mt-10 rounded-2xl border border-[#d2ddd0] bg-white p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6b7b71]">제출 기준</p>
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="text-[#738078]">권장 제출</dt>
                <dd className="font-black">2026.09.18</dd>
              </div>
              <div>
                <dt className="text-[#738078]">최종 마감</dt>
                <dd className="font-black text-[#9a4c2f]">2026.09.21 16:00</dd>
              </div>
            </dl>
          </section>
        </aside>

        <section className="grid grid-rows-[auto_1fr]">
          <header className="flex items-center justify-between border-b border-[#d2ddd0] bg-[#f8faf5] px-8 py-6">
            <div>
              <p className="text-sm font-bold text-[#3f7b61]">강원도 특화 MVP</p>
              <h2 className="mt-1 text-3xl font-black tracking-normal">날씨에 맞춘 1박 웰니스 코스</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-[#d2ddd0] bg-white px-4 py-3 text-sm">
                TourAPI <strong className="ml-2 text-[#0f7d5a]">숙박 + 관광</strong>
              </div>
              <div className="rounded-xl border border-[#d2ddd0] bg-white px-4 py-3 text-sm">
                기상 <strong className="ml-2 text-[#0f7d5a]">맑음 23℃</strong>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-[1fr_380px] gap-6 p-8">
            <div className="grid gap-6">
              <section className="grid grid-cols-[320px_1fr] gap-6">
                <div className="rounded-2xl border border-[#d2ddd0] bg-white p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black">추천 조건</h3>
                    <span className="rounded-lg bg-[#e4f0e9] px-3 py-1 text-xs font-black text-[#2e755a]">
                      자동 분석
                    </span>
                  </div>
                  <div className="mt-5 grid gap-3">
                    {weatherChoices.map((choice) => (
                      <div
                        className={`rounded-xl border p-4 ${
                          choice.active
                            ? "border-[#0f3d2e] bg-[#0f3d2e] text-white"
                            : "border-[#dce5da] bg-[#f8faf5]"
                        }`}
                        key={choice.label}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black">{choice.label}</span>
                          <span className="text-sm opacity-80">{choice.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 rounded-xl bg-[#f0f4ee] p-4 text-sm leading-6 text-[#526158]">
                    현재 날씨에서는 야외 산림 활동을 먼저 배치하고, 오후에는 숙박형 회복 코스로 전환합니다.
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-[#d2ddd0] bg-white">
                  <div className="relative h-[430px] bg-[#d8e5dc]">
                    <div
                      aria-label="강원도 산림 지도 배경"
                      className="h-full w-full bg-cover bg-center opacity-70"
                      role="img"
                      style={{
                        backgroundImage:
                          "url(https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1400&q=80)",
                      }}
                    />
                    <div className="absolute inset-0 bg-[#123326]/35" />
                    <MapPin className="left-[22%] top-[28%]" label="평창" order="1" />
                    <MapPin className="left-[48%] top-[52%]" label="원주" order="2" />
                    <MapPin className="left-[68%] top-[34%]" label="정선" order="3" active />
                    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <path
                        d="M25 34 C36 38, 42 48, 50 57 S62 45, 70 39"
                        fill="none"
                        stroke="rgba(255,255,255,.82)"
                        strokeDasharray="3 3"
                        strokeLinecap="round"
                        strokeWidth="0.7"
                      />
                    </svg>
                    <div className="absolute bottom-5 left-5 rounded-2xl bg-white/90 p-4 shadow-xl backdrop-blur">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#3f7b61]">추천 사유</p>
                      <p className="mt-2 max-w-sm text-sm leading-6 text-[#34423a]">
                        오전 야외 활동, 오후 식사, 저녁 숙박 회복으로 이어지는 저부담 동선입니다.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-3 gap-4">
                {wellnessPlaces.map((place) => (
                  <article className="overflow-hidden rounded-2xl border border-[#d2ddd0] bg-white" key={place.title}>
                    <div
                      aria-label={place.title}
                      className="h-32 w-full bg-cover bg-center"
                      role="img"
                      style={{ backgroundImage: `url(${place.image})` }}
                    />
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-lg bg-[#eaf1e8] px-2 py-1 text-xs font-black text-[#3f7b61]">
                          {place.tag}
                        </span>
                        <span className="text-xs font-bold text-[#738078]">{place.region}</span>
                      </div>
                      <h3 className="mt-3 min-h-12 text-base font-black leading-6">{place.title}</h3>
                    </div>
                  </article>
                ))}
              </section>
            </div>

            <aside className="grid gap-6">
              <section className="rounded-2xl border border-[#d2ddd0] bg-white p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black">여정 타임라인</h3>
                  <span className="rounded-lg bg-[#10291f] px-3 py-1 text-xs font-black text-white">1박 2일</span>
                </div>
                <div className="mt-5 grid gap-4">
                  {courseStops.map((stop) => (
                    <article className="rounded-xl border border-[#dce5da] bg-[#fbfcf8] p-4" key={stop.title}>
                      <div className="flex items-start gap-3">
                        <time className="rounded-lg bg-[#e6efe8] px-2 py-1 text-xs font-black text-[#2e755a]">
                          {stop.time}
                        </time>
                        <div>
                          <h4 className="font-black">{stop.title}</h4>
                          <p className="mt-1 text-xs font-bold text-[#738078]">{stop.meta}</p>
                          <p className="mt-3 text-sm leading-6 text-[#526158]">{stop.reason}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-[#d2ddd0] bg-[#10291f] p-5 text-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black">숙박정보 추천</h3>
                  <span className="rounded-lg bg-white/12 px-3 py-1 text-xs font-black">TourAPI 숙박</span>
                </div>
                <div className="mt-5 grid gap-4">
                  {stays.map((stay) => (
                    <article className="rounded-xl bg-white/8 p-4" key={stay.title}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-[#b9d7c8]">{stay.region}</p>
                          <h4 className="mt-1 font-black">{stay.title}</h4>
                        </div>
                        <div className="rounded-lg bg-[#dbeadf] px-2 py-1 text-sm font-black text-[#10291f]">
                          {stay.score}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {stay.tags.map((tag) => (
                          <span className="rounded-md bg-white/10 px-2 py-1 text-xs font-bold" key={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[#dbeade]">{stay.reason}</p>
                    </article>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function MapPin({
  className,
  label,
  order,
  active,
}: {
  className: string;
  label: string;
  order: string;
  active?: boolean;
}) {
  return (
    <div className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 ${className}`}>
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-black shadow-2xl ${
          active ? "bg-[#f4d35e] text-[#10291f]" : "bg-white text-[#0f3d2e]"
        }`}
      >
        {order}
      </div>
      <div className="mt-2 rounded-lg bg-white/90 px-3 py-1 text-center text-xs font-black text-[#10291f] shadow-lg">
        {label}
      </div>
    </div>
  );
}
