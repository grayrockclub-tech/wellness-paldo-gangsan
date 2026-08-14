"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BedDouble,
  Car,
  CheckCircle2,
  Clock,
  Filter,
  Footprints,
  Leaf,
  Loader2,
  Map,
  MapPin,
  MessageCircle,
  Navigation,
  Save,
  Search,
  SlidersHorizontal,
  User,
  Utensils,
  X,
} from "lucide-react";

const GW_GREEN = "#0DB14B";
const GW_BLUE = "#005BAA";

type PlaceCategory = "spot" | "food" | "stay";
type MainCategoryFilter = "all" | PlaceCategory;
type SubCategoryFilter = "전체" | "forest" | "yoga" | "meditation" | "healthy" | "local" | "resort" | "wellness" | "healing" | "hotel";
type TravelMode = "walk" | "drive";
type PlanIntensity = "relaxed" | "dense";
type PlanMode = "auto" | "semi-auto";
type ActiveTab = "login" | "home" | "planner" | "map" | "profile";

type Place = {
  id: string;
  region: string;
  category: PlaceCategory;
  subCategory: Exclude<SubCategoryFilter, "전체">;
  name: string;
  addr: string;
  desc: string;
  score: number;
  lat: number;
  lng: number;
};

type TravelItem = {
  type: "travel";
  duration: number;
  travelType: TravelMode;
};

type PlaceCourseItem = Place & {
  type: PlaceCategory;
  timeRange: string;
};

type CourseItem = TravelItem | PlaceCourseItem;

type SavedPlan = {
  id: number;
  date: string;
  course: CourseItem[];
};

const KTO_MOCK_DATA: Place[] = [
  { id: "gw-1", region: "평창", category: "spot", subCategory: "forest", name: "용평리조트 발왕산 기 스카이워크", addr: "강원도 평창군 대관령면 올림픽로 715", desc: "해발 1,458m 정상에서 즐기는 산림욕과 맑은 공기.", score: 4.8, lat: 37.6433, lng: 128.68 },
  { id: "gw-2", region: "정선", category: "spot", subCategory: "yoga", name: "파크로쉬 리조트앤웰니스", addr: "강원도 정선군 북평면 중봉길 9-12", desc: "요가와 명상, 숙면에 최적화된 프리미엄 웰니스 센터.", score: 4.9, lat: 37.4722, lng: 128.6541 },
  { id: "gw-3", region: "홍천", category: "spot", subCategory: "meditation", name: "힐리언스 선마을", addr: "강원도 홍천군 서면 종자산길 122", desc: "디지털 디톡스와 함께하는 진정한 쉼, 명상 프로그램.", score: 4.9, lat: 37.6681, lng: 127.6536 },
  { id: "gw-4", region: "동해", category: "spot", subCategory: "forest", name: "무릉건강숲", addr: "강원도 동해시 삼화로 455", desc: "친환경 힐링센터에서 체험하는 산림욕과 편백나무 온열요법.", score: 4.7, lat: 37.4619, lng: 129.0183 },
  { id: "gw-5", region: "평창", category: "spot", subCategory: "meditation", name: "월정사 전나무숲길", addr: "강원도 평창군 진부면 오대산로 374-8", desc: "천년의 숲을 걸으며 심신을 정화하는 걷기 명상 코스.", score: 4.9, lat: 37.7308, lng: 128.5925 },
  { id: "gw-6", region: "정선", category: "spot", subCategory: "forest", name: "로미지안 가든", addr: "강원도 정선군 북평면 어도원길 12", desc: "알프스를 연상케 하는 숲속 정원에서의 치유 산책.", score: 4.6, lat: 37.4241, lng: 128.6655 },
  { id: "gw-7", region: "원주", category: "spot", subCategory: "yoga", name: "뮤지엄 산", addr: "강원도 원주시 지정면 오크밸리 2길 260", desc: "예술과 자연이 어우러진 공간에서의 명상 및 요가 프로그램.", score: 4.8, lat: 37.4219, lng: 127.8183 },
  { id: "gw-8", region: "강릉", category: "spot", subCategory: "meditation", name: "오죽헌 한옥마을 다도체험", addr: "강원도 강릉시 죽헌길 114", desc: "고즈넉한 한옥에서 차를 마시며 즐기는 마음 챙김.", score: 4.5, lat: 37.7811, lng: 128.8808 },
  { id: "food-1", region: "평창", category: "food", subCategory: "healthy", name: "오대산물레방아식당", addr: "강원도 평창군 진부면 오대산로 152", desc: "산채정식과 황태구이로 건강하고 담백한 한 끼를 즐기는 맛집.", score: 4.7, lat: 37.73, lng: 128.59 },
  { id: "food-2", region: "정선", category: "food", subCategory: "local", name: "회동집", addr: "강원도 정선군 정선읍 시장로 62", desc: "곤드레밥과 메밀부침 등 강원도 향토 음식을 선보이는 정선 5일장 명소.", score: 4.8, lat: 37.38, lng: 128.66 },
  { id: "food-3", region: "홍천", category: "food", subCategory: "healthy", name: "가리산막국수", addr: "강원도 홍천군 화촌면 가리산길 420", desc: "직접 뽑은 메밀면과 깔끔한 육수가 일품인 건강한 막국수.", score: 4.6, lat: 37.75, lng: 127.88 },
  { id: "food-4", region: "강릉", category: "food", subCategory: "local", name: "초당할인순두부", addr: "강원도 강릉시 초당순두부길 77", desc: "동해 바닷물로 간을 맞춘 부드럽고 고소한 원조 순두부.", score: 4.7, lat: 37.79, lng: 128.91 },
  { id: "stay-1", region: "평창", category: "stay", subCategory: "resort", name: "켄싱턴 호텔 평창", addr: "강원도 평창군 진부면 진고개로 231", desc: "대규모 프랑스 정원과 포근한 객실이 어우러진 힐링 리조트.", score: 4.8, lat: 37.72, lng: 128.58 },
  { id: "stay-2", region: "정선", category: "stay", subCategory: "wellness", name: "파크로쉬 리조트앤웰니스 (숙박)", addr: "강원도 정선군 북평면 중봉길 9-12", desc: "깊은 산속에서 완벽한 휴식과 숙면을 제공하는 프리미엄 숙소.", score: 4.9, lat: 37.4722, lng: 128.6541 },
  { id: "stay-3", region: "홍천", category: "stay", subCategory: "healing", name: "힐리언스 선마을 스테이", addr: "강원도 홍천군 서면 종자산길 122", desc: "자연 속에서 스마트폰을 내려놓고 깊은 잠과 휴식을 누리는 숙소.", score: 4.9, lat: 37.6681, lng: 127.6536 },
  { id: "stay-4", region: "강릉", category: "stay", subCategory: "hotel", name: "씨마크 호텔", addr: "강원도 강릉시 해안로406번길 2", desc: "바다를 품은 인피니티 풀과 최고급 시설을 갖춘 해안 럭셔리 호텔.", score: 4.9, lat: 37.8, lng: 128.92 },
];

const spotSubCategories: SubCategoryFilter[] = ["전체", "forest", "yoga", "meditation"];
const foodSubCategories: SubCategoryFilter[] = ["전체", "healthy", "local"];
const staySubCategories: SubCategoryFilter[] = ["전체", "resort", "wellness", "healing", "hotel"];

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("login");
  const [mainCategoryFilter, setMainCategoryFilter] = useState<MainCategoryFilter>("all");
  const [subCategoryFilter, setSubCategoryFilter] = useState<SubCategoryFilter>("전체");
  const [mustGoSpots, setMustGoSpots] = useState<string[]>([]);
  const [viewingPlace, setViewingPlace] = useState<Place | null>(null);
  const [travelMode, setTravelMode] = useState<TravelMode>("walk");
  const [planIntensity, setPlanIntensity] = useState<PlanIntensity>("relaxed");
  const [planMode, setPlanMode] = useState<PlanMode>("auto");
  const [includeFoodAndStay, setIncludeFoodAndStay] = useState(true);
  const [isPlanning, setIsPlanning] = useState(false);
  const [generatedCourse, setGeneratedCourse] = useState<CourseItem[] | null>(null);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);

  useEffect(() => {
    console.log("Kakao SDK Initialized (Mock)");
  }, []);

  const handleKakaoLogin = () => {
    setActiveTab("home");
  };

  const handleKakaoNavi = (destinationName: string) => {
    alert(`[카카오내비] '${destinationName}'(으)로 안내를 시작합니다.\n(실제 환경에서 내비 앱이 실행됩니다.)`);
  };

  const filteredPlaces = useMemo(() => {
    return KTO_MOCK_DATA.filter((place) => {
      const matchMain = mainCategoryFilter === "all" || place.category === mainCategoryFilter;
      const matchSub = subCategoryFilter === "전체" || place.subCategory === subCategoryFilter;
      return matchMain && matchSub;
    });
  }, [mainCategoryFilter, subCategoryFilter]);

  const toggleMustGoSpot = (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    setMustGoSpots((prev) => {
      if (prev.includes(id)) return prev.filter((placeId) => placeId !== id);
      if (prev.length >= 3) {
        alert("꼭 가고 싶은 장소는 최대 3개까지 선택 가능합니다.");
        return prev;
      }
      return [...prev, id];
    });
  };

  const generateCourse = () => {
    setIsPlanning(true);

    setTimeout(() => {
      let selectedSpots: Place[] = [];
      const spotsPool = KTO_MOCK_DATA.filter((place) => place.category === "spot");
      const foodsPool = KTO_MOCK_DATA.filter((place) => place.category === "food");
      const staysPool = KTO_MOCK_DATA.filter((place) => place.category === "stay");
      const mandatory = KTO_MOCK_DATA.filter((place) => mustGoSpots.includes(place.id));
      const mandatorySpots = mandatory.filter((place) => place.category === "spot");
      const mandatoryFood = mandatory.find((place) => place.category === "food");
      const mandatoryStay = mandatory.find((place) => place.category === "stay");
      const spotCount = planIntensity === "dense" ? 3 : 2;

      let selectedFood: Place | undefined;
      let selectedStay: Place | undefined;

      if (planMode === "semi-auto") {
        selectedSpots = [...mandatorySpots];
        const remainingNeeded = spotCount - selectedSpots.length;
        if (remainingNeeded > 0) {
          const addPool = spotsPool.filter((place) => !mustGoSpots.includes(place.id));
          selectedSpots = [...selectedSpots, ...shufflePlaces(addPool).slice(0, remainingNeeded)];
        } else {
          selectedSpots = selectedSpots.slice(0, spotCount);
        }
        selectedFood = mandatoryFood || randomPlace(foodsPool);
        selectedStay = mandatoryStay || randomPlace(staysPool);
      } else {
        selectedSpots = shufflePlaces(spotsPool).slice(0, spotCount);
        selectedFood = randomPlace(foodsPool);
        selectedStay = randomPlace(staysPool);
      }

      const timeline: CourseItem[] = [];
      const currentTime = new Date();
      currentTime.setHours(10, 0, 0);

      addPlaceToTimeline(timeline, currentTime, selectedSpots[0], 120);

      if (includeFoodAndStay && selectedFood) {
        addTravelToTimeline(timeline, currentTime, travelMode, travelMode === "drive" ? 20 : 40);
        addPlaceToTimeline(timeline, currentTime, selectedFood, 90);
      }

      if (selectedSpots[1]) {
        addTravelToTimeline(timeline, currentTime, travelMode, travelMode === "drive" ? 25 : 50);
        addPlaceToTimeline(timeline, currentTime, selectedSpots[1], 120);
      }

      if (planIntensity === "dense" && selectedSpots[2]) {
        addTravelToTimeline(timeline, currentTime, travelMode, travelMode === "drive" ? 20 : 40);
        addPlaceToTimeline(timeline, currentTime, selectedSpots[2], 90);
      }

      if (includeFoodAndStay && selectedStay) {
        addTravelToTimeline(timeline, currentTime, travelMode, travelMode === "drive" ? 30 : 60);
        addPlaceToTimeline(timeline, currentTime, selectedStay, 60, " (체크인 및 휴식)");
      }

      setGeneratedCourse(timeline);
      setIsPlanning(false);
      setActiveTab("map");
    }, 1500);
  };

  const styles = `
    @keyframes blob {
      0% { transform: translate(0px, 0px) scale(1); }
      33% { transform: translate(30px, -50px) scale(1.1); }
      66% { transform: translate(-20px, 20px) scale(0.9); }
      100% { transform: translate(0px, 0px) scale(1); }
    }
    .animate-blob { animation: blob 10s infinite; }
    .animation-delay-2000 { animation-delay: 2s; }
    .glass-panel {
      background: rgba(255, 255, 255, 0.45);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.7);
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.05);
    }
    .glass-button {
      background: rgba(255, 255, 255, 0.5);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.8);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
    }
    .glass-nav {
      background: rgba(255, 255, 255, 0.65);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255, 255, 255, 0.8);
      box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.05);
    }
    .no-scrollbar::-webkit-scrollbar { display: none; }
  `;

  if (activeTab === "login") {
    return (
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center overflow-hidden bg-slate-50 font-sans">
        <style>{styles}</style>
        <div className="animate-blob absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full opacity-30 mix-blend-multiply blur-3xl" style={{ backgroundColor: GW_GREEN }} />
        <div className="animate-blob animation-delay-2000 absolute right-[-10%] top-[20%] h-96 w-96 rounded-full opacity-30 mix-blend-multiply blur-3xl" style={{ backgroundColor: GW_BLUE }} />

        <div className="relative z-10 w-full p-8 text-center">
          <div className="glass-panel mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[2.5rem] border-white">
            <Leaf size={48} style={{ color: GW_GREEN }} />
          </div>
          <h1 className="mb-3 text-4xl font-black tracking-tight" style={{ color: GW_BLUE }}>
            웰니스 강원
          </h1>
          <p className="mb-12 text-sm font-bold tracking-wide opacity-80" style={{ color: GW_BLUE }}>
            자연·맛집·숙소가 함께하는 원스톱 치유 여행
          </p>

          <div className="mx-auto w-full max-w-[280px] space-y-4">
            <button
              onClick={handleKakaoLogin}
              className="flex w-full items-center justify-center rounded-2xl bg-[#FEE500] py-4 font-black text-black shadow-[0_8px_30px_rgba(254,229,0,0.3)] transition-all hover:bg-[#FEE500]/90 active:scale-95"
            >
              <MessageCircle size={20} className="mr-2" fill="currentColor" /> 카카오 로그인
            </button>
            <button
              onClick={() => setActiveTab("home")}
              className="w-full text-xs font-bold text-slate-500 underline underline-offset-4 transition-colors hover:text-slate-800"
            >
              둘러보기 (게스트 모드)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto min-h-screen max-w-md overflow-hidden bg-slate-50/50 font-sans text-slate-800 shadow-2xl">
      <style>{styles}</style>
      <div className="animate-blob pointer-events-none fixed left-[-15%] top-[-5%] h-80 w-80 rounded-full opacity-20 mix-blend-multiply blur-3xl" style={{ backgroundColor: GW_GREEN }} />
      <div className="animate-blob animation-delay-2000 pointer-events-none fixed right-[-10%] top-[40%] h-72 w-72 rounded-full opacity-15 mix-blend-multiply blur-3xl" style={{ backgroundColor: GW_BLUE }} />

      <main className="relative z-10 pb-32">
        <header className="glass-nav sticky top-0 z-40 rounded-b-[2rem] px-6 pb-4 pt-12">
          <h1 className="flex items-center text-2xl font-black tracking-tighter" style={{ color: GW_BLUE }}>
            <Leaf className="mr-2" size={24} style={{ color: GW_GREEN }} /> 웰니스 강원
          </h1>
        </header>

        {activeTab === "home" && (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="mb-2 text-2xl font-black tracking-tight" style={{ color: GW_BLUE }}>
                스팟부터 맛집·숙소까지
                <br />
                원스톱 탐색
              </h2>
              <p className="text-xs font-bold opacity-70" style={{ color: GW_BLUE }}>
                강원도의 청정 힐링 공간을 만나보세요
              </p>
            </div>

            <div className="mb-4 grid grid-cols-4 gap-2">
              {[
                { id: "all", label: "전체" },
                { id: "spot", label: "힐링스팟" },
                { id: "food", label: "건강맛집" },
                { id: "stay", label: "힐링숙소" },
              ].map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    setMainCategoryFilter(category.id as MainCategoryFilter);
                    setSubCategoryFilter("전체");
                  }}
                  className={`rounded-2xl border py-2.5 text-[11px] font-black transition-all ${
                    mainCategoryFilter === category.id ? "border-transparent text-white shadow-md" : "glass-button text-slate-600"
                  }`}
                  style={mainCategoryFilter === category.id ? { backgroundColor: GW_BLUE } : {}}
                >
                  {category.label}
                </button>
              ))}
            </div>

            <div className="no-scrollbar mb-2 flex space-x-2 overflow-x-auto pb-4">
              {mainCategoryFilter === "all" && <span className="px-3 py-2 text-[11px] font-bold text-slate-400">카테고리를 선택하세요</span>}
              {mainCategoryFilter === "spot" && spotSubCategories.map((category) => (
                <SubCategoryButton key={category} category={category} current={subCategoryFilter} onClick={setSubCategoryFilter} />
              ))}
              {mainCategoryFilter === "food" && foodSubCategories.map((category) => (
                <SubCategoryButton key={category} category={category} current={subCategoryFilter} onClick={setSubCategoryFilter} />
              ))}
              {mainCategoryFilter === "stay" && staySubCategories.map((category) => (
                <SubCategoryButton key={category} category={category} current={subCategoryFilter} onClick={setSubCategoryFilter} />
              ))}
            </div>

            <div className="space-y-4">
              {filteredPlaces.map((place) => (
                <div key={place.id} onClick={() => setViewingPlace(place)} className="glass-panel group relative cursor-pointer rounded-[2rem] p-5 transition-all hover:border-white">
                  <div className="flex items-start space-x-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/60 shadow-[inset_0_2px_5px_rgba(255,255,255,0.8)]" style={{ color: GW_GREEN }}>
                      {place.category === "food" ? <Utensils size={24} /> : place.category === "stay" ? <BedDouble size={24} /> : <Leaf size={24} />}
                    </div>
                    <div className="flex-1 pr-8">
                      <div className="mb-1.5 flex items-center space-x-2">
                        <span className="rounded-md border border-white/50 bg-white/60 px-2 py-0.5 text-[9px] font-black" style={{ color: GW_BLUE }}>
                          강원 {place.region}
                        </span>
                        <span className="rounded-md border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                          {place.category === "food" ? "맛집" : place.category === "stay" ? "숙소" : "스팟"}
                        </span>
                      </div>
                      <h4 className="mb-1 text-[14px] font-bold leading-tight text-slate-800">{place.name}</h4>
                      <p className="line-clamp-1 text-[11px] font-medium text-slate-500">{place.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={(event) => toggleMustGoSpot(event, place.id)}
                    className={`absolute right-5 top-5 rounded-xl border p-2 transition-all ${mustGoSpots.includes(place.id) ? "border-transparent text-white" : "glass-button text-slate-400"}`}
                    style={mustGoSpots.includes(place.id) ? { backgroundColor: GW_BLUE } : {}}
                  >
                    <CheckCircle2 size={18} fill={mustGoSpots.includes(place.id) ? "currentColor" : "none"} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "planner" && (
          <div className="p-6">
            <h2 className="mb-6 text-2xl font-black tracking-tight" style={{ color: GW_BLUE }}>
              원스톱 루트 설계
            </h2>

            <div className="space-y-5">
              <section className="glass-panel rounded-[2rem] p-6">
                <h3 className="mb-4 flex items-center text-sm font-black text-slate-800">
                  <SlidersHorizontal size={16} className="mr-2" style={{ color: GW_GREEN }} /> 설계 방식
                </h3>
                <div className="relative flex rounded-[1.2rem] border border-white/40 bg-white/30 p-1.5">
                  <button onClick={() => setPlanMode("auto")} className={`z-10 flex-1 rounded-[1rem] py-3 text-[12px] font-black transition-all ${planMode === "auto" ? "bg-white shadow-sm" : "text-slate-500"}`} style={planMode === "auto" ? { color: GW_BLUE } : {}}>
                    전체 자동
                  </button>
                  <button onClick={() => setPlanMode("semi-auto")} className={`z-10 flex-1 rounded-[1rem] py-3 text-[12px] font-black transition-all ${planMode === "semi-auto" ? "bg-white shadow-sm" : "text-slate-500"}`} style={planMode === "semi-auto" ? { color: GW_BLUE } : {}}>
                    반자동 (선택 포함)
                  </button>
                </div>
                {planMode === "semi-auto" && (
                  <div className="mt-4 rounded-2xl border border-white/50 bg-white/40 p-4">
                    <p className="mb-2 text-[10px] font-bold" style={{ color: GW_BLUE }}>
                      꼭 포함할 장소 (스팟·맛집·숙소 통합 {mustGoSpots.length}/3)
                    </p>
                    {mustGoSpots.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {mustGoSpots.map((id) => {
                          const spot = KTO_MOCK_DATA.find((place) => place.id === id);
                          if (!spot) return null;
                          return (
                            <span key={id} onClick={(event) => toggleMustGoSpot(event, id)} className="glass-button flex cursor-pointer items-center rounded-full px-3 py-1.5 text-[10px] font-bold">
                              {spot.name} <X size={12} className="ml-1 text-slate-400" />
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] font-medium text-slate-500">탐색 탭에서 마음에 드는 스팟, 맛집, 숙소를 찜해주세요.</p>
                    )}
                  </div>
                )}
              </section>

              <section className="glass-panel flex items-center justify-between rounded-[2rem] p-6">
                <div>
                  <h3 className="mb-1 flex items-center text-sm font-black text-slate-800">
                    <Utensils size={16} className="mr-2" style={{ color: GW_GREEN }} /> 맛집 및 숙소 자동 포함
                  </h3>
                  <p className="text-[11px] font-medium text-slate-500">일정에 건강 맛집과 힐링 숙소를 함께 배치합니다.</p>
                </div>
                <input type="checkbox" checked={includeFoodAndStay} onChange={(event) => setIncludeFoodAndStay(event.target.checked)} className="h-5 w-5 cursor-pointer rounded accent-emerald-600" />
              </section>

              <section className="glass-panel rounded-[2rem] p-6">
                <h3 className="mb-4 flex items-center text-sm font-black text-slate-800">
                  <Navigation size={16} className="mr-2" style={{ color: GW_GREEN }} /> 이동 수단
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div onClick={() => setTravelMode("walk")} className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 transition-all ${travelMode === "walk" ? "bg-white/60 backdrop-blur-md" : "glass-button border-transparent text-slate-400"}`} style={travelMode === "walk" ? { borderColor: GW_GREEN, color: GW_GREEN } : {}}>
                    <Footprints size={24} />
                    <span className="text-[11px] font-black">뚜벅이</span>
                  </div>
                  <div onClick={() => setTravelMode("drive")} className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 transition-all ${travelMode === "drive" ? "bg-white/60 backdrop-blur-md" : "glass-button border-transparent text-slate-400"}`} style={travelMode === "drive" ? { borderColor: GW_BLUE, color: GW_BLUE } : {}}>
                    <Car size={24} />
                    <span className="text-[11px] font-black">자동차 (자가용)</span>
                  </div>
                </div>
              </section>

              <section className="glass-panel rounded-[2rem] p-6">
                <h3 className="mb-4 flex items-center text-sm font-black text-slate-800">
                  <Clock size={16} className="mr-2" style={{ color: GW_GREEN }} /> 여행 강도
                </h3>
                <div className="relative flex rounded-[1.2rem] border border-white/40 bg-white/30 p-1.5">
                  <button onClick={() => setPlanIntensity("relaxed")} className={`z-10 flex-1 rounded-[1rem] py-3 text-[12px] font-black transition-all ${planIntensity === "relaxed" ? "bg-white shadow-sm" : "text-slate-500"}`} style={planIntensity === "relaxed" ? { color: GW_BLUE } : {}}>
                    여유롭게 (2곳)
                  </button>
                  <button onClick={() => setPlanIntensity("dense")} className={`z-10 flex-1 rounded-[1rem] py-3 text-[12px] font-black transition-all ${planIntensity === "dense" ? "bg-white shadow-sm" : "text-slate-500"}`} style={planIntensity === "dense" ? { color: GW_BLUE } : {}}>
                    빽빽하게 (3곳 이상)
                  </button>
                </div>
              </section>

              <button
                onClick={generateCourse}
                disabled={isPlanning || (planMode === "semi-auto" && mustGoSpots.length === 0)}
                className="flex w-full items-center justify-center rounded-[2rem] py-5 text-sm font-black text-white shadow-[0_10px_30px_rgba(0,91,170,0.3)] transition-all active:scale-95 disabled:bg-slate-300 disabled:shadow-none"
                style={!isPlanning && !(planMode === "semi-auto" && mustGoSpots.length === 0) ? { backgroundColor: GW_BLUE } : {}}
              >
                {isPlanning ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" /> 원스톱 치유 루트 생성 중...
                  </>
                ) : (
                  "원스톱 루트 생성하기"
                )}
              </button>
            </div>
          </div>
        )}

        {activeTab === "map" && (
          <div className="p-6 pb-24">
            {!generatedCourse ? (
              <div className="glass-panel rounded-[3rem] py-24 text-center">
                <Map size={48} className="mx-auto mb-4 opacity-40" style={{ color: GW_BLUE }} />
                <p className="text-sm font-bold text-slate-600">
                  플래너 탭에서 스팟·맛집·숙소를 포함한
                  <br />
                  원스톱 경로를 먼저 생성해주세요.
                </p>
                <button onClick={() => setActiveTab("planner")} className="mt-6 rounded-full bg-white/80 px-6 py-3 text-xs font-black shadow-sm backdrop-blur-md" style={{ color: GW_GREEN }}>
                  플래너로 이동
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="mb-2 flex items-end justify-between px-2">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight" style={{ color: GW_BLUE }}>
                      원스톱 치유 루트
                    </h2>
                    <p className="mt-1 text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: GW_GREEN }}>
                      {travelMode === "walk" ? "뚜벅이 모드" : "자동차 모드"} · 웰니스+맛집+숙소 완벽 연계
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSavedPlans([{ id: Date.now(), date: new Date().toLocaleDateString(), course: generatedCourse }, ...savedPlans]);
                      alert("원스톱 루트가 저장되었습니다.");
                    }}
                    className="glass-button rounded-full p-3 shadow-sm"
                  >
                    <Save size={18} style={{ color: GW_BLUE }} />
                  </button>
                </div>

                <KakaoMapPlaceholder />

                <div className="relative ml-4 space-y-5">
                  {generatedCourse.map((item, index) => (
                    item.type !== "travel" ? (
                      <div key={`${item.id}-${index}`} className="relative pl-10">
                        <div className="absolute left-[-16px] top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-white/80 text-[13px] font-black text-white shadow-md" style={{ backgroundColor: item.category === "food" ? "#F59E0B" : item.category === "stay" ? "#8B5CF6" : GW_GREEN }}>
                          {item.category === "food" ? <Utensils size={14} /> : item.category === "stay" ? <BedDouble size={14} /> : <Leaf size={14} />}
                        </div>
                        <div className="glass-panel group relative overflow-hidden rounded-[2rem] p-5">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="rounded-full border border-white/50 bg-white/60 px-3 py-1 text-[10px] font-black" style={{ color: GW_BLUE }}>
                                {item.timeRange}
                              </span>
                              <span className={`rounded px-2 py-0.5 text-[9px] font-black ${item.category === "food" ? "bg-amber-100 text-amber-800" : item.category === "stay" ? "bg-purple-100 text-purple-800" : "bg-emerald-100 text-emerald-800"}`}>
                                {item.category === "food" ? "추천 맛집" : item.category === "stay" ? "추천 숙소" : "치유 스팟"}
                              </span>
                            </div>
                            {travelMode === "drive" && (
                              <button onClick={() => handleKakaoNavi(item.name)} className="flex items-center rounded-lg px-3 py-1.5 text-[9px] font-bold text-white shadow-sm active:scale-95" style={{ backgroundColor: GW_BLUE }}>
                                <Navigation size={10} className="mr-1" /> 길안내
                              </button>
                            )}
                          </div>
                          <h4 className="mt-2 text-[15px] font-black text-slate-800">{item.name}</h4>
                          <p className="mt-1.5 flex items-center text-[11px] font-medium text-slate-500">
                            <MapPin size={12} className="mr-1 opacity-60" style={{ color: GW_GREEN }} /> {item.addr}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div key={`travel-${index}`} className="relative py-1 pl-10">
                        <div className="absolute bottom-0 left-0 top-0 w-[2px] border-l-2 border-dashed opacity-30" style={{ borderColor: GW_BLUE }} />
                        <div className="flex w-max items-center space-x-2 rounded-xl border border-white/50 bg-white/50 px-4 py-2 text-[10px] font-bold text-slate-600 backdrop-blur-sm">
                          {item.travelType === "walk" ? <Footprints size={12} style={{ color: GW_GREEN }} /> : <Car size={12} style={{ color: GW_BLUE }} />}
                          <span>이동 약 {item.duration}분 예상</span>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "profile" && (
          <div className="space-y-8 p-6">
            <div className="glass-panel flex items-center space-x-5 rounded-[2.5rem] p-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-inner" style={{ backgroundImage: `linear-gradient(to bottom right, ${GW_GREEN}, ${GW_BLUE})` }}>
                <User size={28} />
              </div>
              <div>
                <h3 className="text-lg font-black" style={{ color: GW_BLUE }}>
                  카카오 여행자님
                </h3>
                <p className="mt-1 inline-block rounded border border-white bg-white/60 px-2 py-0.5 text-[11px] font-bold" style={{ color: GW_GREEN }}>
                  강원 원스톱 웰니스 탐험가
                </p>
              </div>
            </div>

            <section>
              <h4 className="mb-4 px-2 text-sm font-black text-slate-800">저장된 원스톱 루트 ({savedPlans.length})</h4>
              <div className="space-y-4">
                {savedPlans.length > 0 ? savedPlans.map((plan) => (
                  <div key={plan.id} className="glass-panel rounded-[2rem] p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="rounded-md border border-white/60 bg-white/50 px-2.5 py-1 text-[10px] font-black text-slate-500">{plan.date} 생성</span>
                      <button onClick={() => { setGeneratedCourse(plan.course); setActiveTab("map"); }} className="text-[10px] font-black" style={{ color: GW_BLUE }}>
                        루트 보기 &rarr;
                      </button>
                    </div>
                    <div className="no-scrollbar flex space-x-2 overflow-x-auto pb-1">
                      {plan.course.filter(isPlaceCourseItem).map((place) => (
                        <div key={`${plan.id}-${place.id}`} className="min-w-[85px] shrink-0 rounded-xl border border-white/80 bg-white/60 px-3 py-2.5 text-center shadow-sm">
                          <span className="mb-0.5 block text-[8px] font-bold text-emerald-600">{place.category === "food" ? "맛집" : place.category === "stay" ? "숙소" : "스팟"}</span>
                          <span className="block truncate text-[10px] font-bold text-slate-700">{place.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )) : (
                  <div className="glass-panel rounded-[2rem] border-dashed py-12 text-center">
                    <p className="text-[11px] font-bold text-slate-500">저장된 원스톱 루트가 없습니다.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>

      {viewingPlace && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/20 px-4 pb-8 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-sm overflow-hidden rounded-[3rem] border-white/80 !bg-white/70 shadow-2xl">
            <div className="relative flex h-44 items-center justify-center overflow-hidden border-b border-white/50 bg-white/40">
              <div className="absolute inset-0 opacity-20" style={{ backgroundColor: GW_GREEN }} />
              {viewingPlace.category === "food" ? <Utensils size={80} className="absolute text-amber-600 opacity-30" /> : viewingPlace.category === "stay" ? <BedDouble size={80} className="absolute text-purple-600 opacity-30" /> : <Leaf size={80} className="absolute opacity-30" style={{ color: GW_GREEN }} />}
              <button onClick={() => setViewingPlace(null)} className="glass-button absolute right-6 top-6 rounded-full p-2 text-slate-600 backdrop-blur-md">
                <X size={20} />
              </button>
              <div className="absolute bottom-6 left-6 z-20 flex space-x-2">
                <span className="rounded-xl border border-white bg-white/80 px-3 py-1.5 text-[10px] font-black shadow-sm backdrop-blur-md" style={{ color: GW_BLUE }}>
                  {viewingPlace.category === "food" ? "건강 맛집" : viewingPlace.category === "stay" ? "힐링 숙소" : "웰니스 스팟"}
                </span>
              </div>
            </div>
            <div className="p-8">
              <h3 className="mb-3 text-xl font-black leading-tight text-slate-800">{viewingPlace.name}</h3>
              <p className="mb-6 text-[13px] font-medium leading-relaxed text-slate-600">{viewingPlace.desc}</p>
              <p className="mb-8 flex items-center text-[11px] font-bold text-slate-500">
                <MapPin size={14} className="mr-1.5" style={{ color: GW_GREEN }} /> {viewingPlace.addr}
              </p>

              <button
                onClick={(event) => {
                  toggleMustGoSpot(event, viewingPlace.id);
                  setViewingPlace(null);
                  if (!mustGoSpots.includes(viewingPlace.id)) setActiveTab("planner");
                }}
                className={`flex w-full items-center justify-center rounded-2xl py-4 text-[13px] font-black shadow-lg transition-all active:scale-95 ${mustGoSpots.includes(viewingPlace.id) ? "glass-button text-slate-500" : "text-white"}`}
                style={!mustGoSpots.includes(viewingPlace.id) ? { backgroundColor: GW_BLUE } : {}}
              >
                {mustGoSpots.includes(viewingPlace.id) ? (
                  "필수 코스에서 제외"
                ) : (
                  <>
                    <CheckCircle2 size={16} className="mr-2" /> 이 장소 꼭 가기
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="glass-nav fixed bottom-6 left-1/2 z-[90] flex w-[90%] max-w-[340px] -translate-x-1/2 items-center justify-between rounded-[2rem] px-2 py-2">
        {[
          { id: "home", icon: <Search size={22} />, label: "탐색" },
          { id: "planner", icon: <Filter size={22} />, label: "설계" },
          { id: "map", icon: <Map size={22} />, label: "경로" },
          { id: "profile", icon: <User size={22} />, label: "MY" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ActiveTab)}
            className={`flex h-14 w-14 flex-col items-center justify-center rounded-[1.2rem] transition-all duration-300 ${activeTab === tab.id ? "scale-105 bg-white shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
            style={activeTab === tab.id ? { color: GW_BLUE } : {}}
          >
            {tab.icon}
            {activeTab === tab.id && <span className="mt-1 text-[8px] font-black">{tab.label}</span>}
          </button>
        ))}
      </nav>
    </div>
  );
}

function SubCategoryButton({
  category,
  current,
  onClick,
}: {
  category: SubCategoryFilter;
  current: SubCategoryFilter;
  onClick: (category: SubCategoryFilter) => void;
}) {
  return (
    <button
      onClick={() => onClick(category)}
      className={`whitespace-nowrap rounded-xl border px-4 py-2 text-[11px] font-bold ${current === category ? "bg-white shadow-sm" : "glass-button text-slate-500"}`}
      style={current === category ? { color: GW_GREEN } : {}}
    >
      {getSubCategoryLabel(category)}
    </button>
  );
}

function getSubCategoryLabel(category: SubCategoryFilter) {
  const labels: Record<SubCategoryFilter, string> = {
    전체: "전체보기",
    forest: "🌲 산림욕",
    yoga: "🧘‍♀️ 요가",
    meditation: "🍵 명상",
    healthy: "🥗 건강식",
    local: "🍲 향토음식",
    resort: "🏡 리조트",
    wellness: "🧘 웰니스센터",
    healing: "🌲 힐링스테이",
    hotel: "🏨 호텔",
  };

  return labels[category];
}

function KakaoMapPlaceholder() {
  return (
    <div className="mb-6 flex h-48 w-full flex-col items-center justify-center overflow-hidden rounded-3xl border border-white/50 bg-white/30 shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)] backdrop-blur-sm">
      <Map size={32} style={{ color: GW_GREEN }} className="mb-2 opacity-60" />
      <p className="px-4 text-center text-[11px] font-bold tracking-tight" style={{ color: GW_BLUE }}>
        카카오 지도 영역 (숙소·맛집 통합 경로)
        <br />
        <span className="text-[9px] font-normal opacity-80">(스팟, 음식점, 숙소 마커 표시 연동)</span>
      </p>
    </div>
  );
}

function shufflePlaces(places: Place[]) {
  return [...places].sort(() => 0.5 - Math.random());
}

function randomPlace(places: Place[]) {
  return places[Math.floor(Math.random() * places.length)];
}

function getTimeText(date: Date) {
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function addPlaceToTimeline(timeline: CourseItem[], currentTime: Date, place: Place | undefined, duration: number, suffix = "") {
  if (!place) return;
  const start = getTimeText(currentTime);
  currentTime.setMinutes(currentTime.getMinutes() + duration);
  const end = getTimeText(currentTime);
  timeline.push({ type: place.category, ...place, timeRange: `${start} - ${end}${suffix}` });
}

function addTravelToTimeline(timeline: CourseItem[], currentTime: Date, travelType: TravelMode, duration: number) {
  timeline.push({ type: "travel", duration, travelType });
  currentTime.setMinutes(currentTime.getMinutes() + duration);
}

function isPlaceCourseItem(item: CourseItem): item is PlaceCourseItem {
  return item.type !== "travel";
}
