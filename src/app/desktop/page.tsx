"use client";

import {
  BedDouble,
  Car,
  CheckCircle2,
  Filter,
  Footprints,
  Leaf,
  Loader2,
  Map,
  MapPin,
  Menu,
  Navigation,
  Save,
  Search,
  SlidersHorizontal,
  Star,
  Utensils,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildWellnessCourse, type PlaceCourseItem as BuiltPlaceCourseItem, type WellnessCourseItem } from "@/lib/course-builder";

const GW_GREEN = "#0DB14B";
const GW_BLUE = "#005BAA";

type PlaceCategory = "spot" | "food" | "stay";
type MainCategoryFilter = "all" | PlaceCategory;
type SubCategoryFilter =
  | "전체"
  | "forest"
  | "yoga"
  | "meditation"
  | "healthy"
  | "local"
  | "resort"
  | "wellness"
  | "healing"
  | "hotel";
type TravelMode = "walk" | "drive";
type PlanIntensity = "relaxed" | "dense";
type PlanMode = "auto" | "semi-auto";

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
  contentId?: string;
  contentTypeId?: string;
  image?: string;
};

type PlaceCourseItem = BuiltPlaceCourseItem<Place>;
type CourseItem = WellnessCourseItem<Place>;

type TourPlacesResponse = {
  source: "tourapi" | "mixed" | "fallback";
  places: Place[];
};

type WeatherSummary = {
  source: "weatherapi" | "fallback";
  forecastTime?: string;
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  sky: string;
  precipitation: string;
  activityLevel: "good" | "normal" | "caution";
  activityLabel: string;
  message: string;
  recommendationHint: string;
};

type KakaoLatLng = unknown;
type KakaoBounds = {
  extend: (latLng: KakaoLatLng) => void;
};
type KakaoMapInstance = {
  panTo: (latLng: KakaoLatLng) => void;
  setCenter: (latLng: KakaoLatLng) => void;
  setBounds: (bounds: KakaoBounds) => void;
};
type KakaoMapOverlay = {
  setMap: (map: KakaoMapInstance | null) => void;
};
type KakaoMapPolyline = {
  setMap: (map: KakaoMapInstance | null) => void;
};
type KakaoMapsApi = {
  load: (callback: () => void) => void;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  LatLngBounds: new () => KakaoBounds;
  Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMapInstance;
  CustomOverlay: new (options: {
    position: KakaoLatLng;
    content: HTMLElement;
    map?: KakaoMapInstance;
    xAnchor?: number;
    yAnchor?: number;
    zIndex?: number;
  }) => KakaoMapOverlay;
  Polyline: new (options: {
    path: KakaoLatLng[];
    strokeWeight: number;
    strokeColor: string;
    strokeOpacity: number;
    strokeStyle: string;
  }) => KakaoMapPolyline;
};

declare global {
  interface Window {
    kakao?: {
      maps: KakaoMapsApi;
    };
  }
}

let kakaoMapsLoader: Promise<KakaoMapsApi> | null = null;

const PLACES: Place[] = [
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

const subCategoryMap: Record<PlaceCategory, SubCategoryFilter[]> = {
  spot: ["전체", "forest", "yoga", "meditation"],
  food: ["전체", "healthy", "local"],
  stay: ["전체", "resort", "wellness", "healing", "hotel"],
};

function createWeatherFallback(): WeatherSummary {
  return {
    source: "fallback",
    sky: "날씨 확인 필요",
    precipitation: "정보 없음",
    activityLevel: "normal",
    activityLabel: "기상 확인 대기",
    message: "기상 API 응답을 아직 확인하지 못했습니다.",
    recommendationHint: "실제 운영에서는 선택한 장소 좌표 기준의 초단기예보로 추천 사유를 보강합니다.",
  };
}

async function loadCourseCandidateWeather({
  places,
  mustGoIds,
  knownWeather,
  includeFoodAndStay,
  planIntensity,
}: {
  places: Place[];
  mustGoIds: string[];
  knownWeather: Record<string, WeatherSummary>;
  includeFoodAndStay: boolean;
  planIntensity: PlanIntensity;
}) {
  const candidates = getCourseWeatherCandidates({ places, mustGoIds, includeFoodAndStay, planIntensity })
    .filter((place) => !knownWeather[place.id])
    .slice(0, 10);
  if (candidates.length === 0) return {};

  const updates: Record<string, WeatherSummary> = {};

  await Promise.all(
    candidates.map(async (place) => {
      try {
        const response = await fetch(`/api/wellness/weather?lat=${place.lat}&lng=${place.lng}`);
        if (!response.ok) throw new Error(`Failed to load weather: ${response.status}`);
        updates[place.id] = (await response.json()) as WeatherSummary;
      } catch {
        updates[place.id] = createWeatherFallback();
      }
    }),
  );

  return updates;
}

function getCourseWeatherCandidates({
  places,
  mustGoIds,
  includeFoodAndStay,
  planIntensity,
}: {
  places: Place[];
  mustGoIds: string[];
  includeFoodAndStay: boolean;
  planIntensity: PlanIntensity;
}) {
  const mustGoSet = new Set(mustGoIds);
  const requiredPlaces = places.filter((place) => mustGoSet.has(place.id));
  const spotLimit = planIntensity === "dense" ? 7 : 5;
  const scoredSpots = places
    .filter((place) => place.category === "spot")
    .sort((a, b) => b.score - a.score)
    .slice(0, spotLimit);
  const supportingPlaces = includeFoodAndStay
    ? (["food", "stay"] as const).flatMap((category) =>
        places
          .filter((place) => place.category === category)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3),
      )
    : [];

  return uniquePlaces([...requiredPlaces, ...scoredSpots, ...supportingPlaces]);
}

function uniquePlaces<TPlace extends Pick<Place, "id">>(places: TPlace[]) {
  const seen = new Set<string>();
  return places.filter((place) => {
    if (seen.has(place.id)) return false;
    seen.add(place.id);
    return true;
  });
}

function buildCourseEvidence(course: CourseItem[], travelMode: TravelMode, weatherByPlaceId: Record<string, WeatherSummary>) {
  const placeItems = course.filter(isPlaceCourseItem);
  const travelMinutes = course.reduce((total, item) => item.type === "travel" ? total + item.duration : total, 0);
  const weatherItems = placeItems.map((place) => weatherByPlaceId[place.id]).filter(Boolean);
  const goodWeatherCount = weatherItems.filter((weather) => weather.activityLevel === "good").length;
  const cautionWeatherCount = weatherItems.filter((weather) => weather.activityLevel === "caution").length;
  const tourApiCount = placeItems.filter((place) => place.contentId).length;
  const regionCount = new Set(placeItems.map((place) => place.region)).size;

  return [
    travelMode === "walk"
      ? `뚜벅이 기준 이동 ${travelMinutes}분 이내로 동선을 압축`
      : `자동차 기준 이동 ${travelMinutes}분 규모로 권역 연결`,
    cautionWeatherCount > 0
      ? `기상 부담 ${cautionWeatherCount}곳을 고려해 실내·회복형 장소 보강`
      : goodWeatherCount > 0
        ? `야외 적합 예보 ${goodWeatherCount}곳을 우선 반영`
        : "기상 예보 확인값을 추천 점수에 반영",
    `TourAPI 장소 ${tourApiCount}/${placeItems.length}곳 기반`,
    regionCount === 1 ? `${placeItems[0]?.region ?? "강원"} 권역 중심 일정` : `${regionCount}개 권역을 이동 부담 기준으로 정렬`,
  ];
}

export default function DesktopPage() {
  const [mainCategoryFilter, setMainCategoryFilter] = useState<MainCategoryFilter>("all");
  const [subCategoryFilter, setSubCategoryFilter] = useState<SubCategoryFilter>("전체");
  const [mustGoSpots, setMustGoSpots] = useState<string[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place>(PLACES[0]);
  const [places, setPlaces] = useState<Place[]>(PLACES);
  const [tourDataSource, setTourDataSource] = useState<"loading" | "tourapi" | "mixed" | "fallback">("loading");
  const [travelMode, setTravelMode] = useState<TravelMode>("walk");
  const [planIntensity, setPlanIntensity] = useState<PlanIntensity>("relaxed");
  const [planMode, setPlanMode] = useState<PlanMode>("auto");
  const [includeFoodAndStay, setIncludeFoodAndStay] = useState(true);
  const [isPlanning, setIsPlanning] = useState(false);
  const [generatedCourse, setGeneratedCourse] = useState<CourseItem[] | null>(null);
  const [weatherByPlaceId, setWeatherByPlaceId] = useState<Record<string, WeatherSummary>>({});
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);
  const placeCardRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    let canceled = false;

    async function loadTourPlaces() {
      try {
        const response = await fetch("/api/wellness/places");
        if (!response.ok) throw new Error(`Failed to load places: ${response.status}`);
        const data = (await response.json()) as TourPlacesResponse;
        if (canceled) return;
        if (Array.isArray(data.places) && data.places.length > 0) {
          setPlaces(data.places);
          setSelectedPlace(data.places[0]);
          setMustGoSpots([]);
          setGeneratedCourse(null);
        }
        setTourDataSource(data.source ?? "fallback");
      } catch (error) {
        console.error(error);
        if (!canceled) setTourDataSource("fallback");
      }
    }

    loadTourPlaces();

    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    let canceled = false;

    async function loadWeather() {
      try {
        const response = await fetch(`/api/wellness/weather?lat=${selectedPlace.lat}&lng=${selectedPlace.lng}`);
        if (!response.ok) throw new Error(`Failed to load weather: ${response.status}`);
        const data = (await response.json()) as WeatherSummary;
        if (!canceled) {
          setWeatherByPlaceId((current) => ({ ...current, [selectedPlace.id]: data }));
        }
      } catch {
        if (!canceled) {
          setWeatherByPlaceId((current) => ({
            ...current,
            [selectedPlace.id]: createWeatherFallback(),
          }));
        }
      }
    }

    loadWeather();

    return () => {
      canceled = true;
    };
  }, [selectedPlace]);

  const filteredPlaces = useMemo(() => {
    return places.filter((place) => {
      const matchMain = mainCategoryFilter === "all" || place.category === mainCategoryFilter;
      const matchSub = subCategoryFilter === "전체" || place.subCategory === subCategoryFilter;
      return matchMain && matchSub;
    });
  }, [mainCategoryFilter, places, subCategoryFilter]);
  const subCategoryOptions: SubCategoryFilter[] =
    mainCategoryFilter === "all" ? ["전체"] : subCategoryMap[mainCategoryFilter];

  const selectedMustGoPlaces = places.filter((place) => mustGoSpots.includes(place.id));
  const generatedCourseEvidence = useMemo(() => {
    return generatedCourse ? buildCourseEvidence(generatedCourse, travelMode, weatherByPlaceId) : [];
  }, [generatedCourse, travelMode, weatherByPlaceId]);

  useEffect(() => {
    placeCardRefs.current[selectedPlace.id]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [selectedPlace.id, filteredPlaces]);

  const toggleMustGoSpot = (id: string) => {
    setMustGoSpots((prev) => {
      if (prev.includes(id)) return prev.filter((placeId) => placeId !== id);
      if (prev.length >= 3) {
        alert("꼭 가고 싶은 장소는 최대 3개까지 선택 가능합니다.");
        return prev;
      }
      return [...prev, id];
    });
  };

  const generateCourse = async () => {
    setIsPlanning(true);
    setIsPlannerOpen(true);
    const planningStartedAt = Date.now();
    const courseWeather = await loadCourseCandidateWeather({
      places,
      mustGoIds: mustGoSpots,
      knownWeather: weatherByPlaceId,
      includeFoodAndStay,
      planIntensity,
    });
    const nextWeatherByPlaceId = { ...weatherByPlaceId, ...courseWeather };
    setWeatherByPlaceId(nextWeatherByPlaceId);
    const remainingDelay = Math.max(0, 900 - (Date.now() - planningStartedAt));

    window.setTimeout(() => {
      const timeline = buildCourse({
        places,
        mustGoIds: mustGoSpots,
        planIntensity,
        planMode,
        includeFoodAndStay,
        travelMode,
        weatherByPlaceId: nextWeatherByPlaceId,
      });
      setGeneratedCourse(timeline);
      setIsPlanning(false);
    }, remainingDelay);
  };

  return (
    <main className="min-h-screen bg-[#eef3ee] text-[#17211b]">
      <div className="mx-auto min-h-screen max-w-[1760px] bg-[#f7faf6]">
        <header className="sticky top-0 z-30 border-b border-[#d3dfd4] bg-white/95 px-6 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: GW_BLUE }}>
                <Leaf size={26} />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-normal" style={{ color: GW_BLUE }}>
                  웰니스 강원
                </h1>
                <p className="text-xs font-bold text-[#5f6f66]">원스톱 치유 여행</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Link href="/?view=mobile" className="rounded-lg border border-[#d3dfd4] bg-[#fbfcf8] px-4 py-3 font-bold text-[#526158]">
                모바일 화면
              </Link>
              <div className="rounded-lg border border-[#d3dfd4] bg-[#fbfcf8] px-4 py-3 font-bold">
                Data <span className="ml-2 text-[#087a36]">{tourDataSource === "tourapi" ? "TourAPI" : tourDataSource === "mixed" ? "TourAPI + Sample" : tourDataSource === "loading" ? "Loading" : "Sample"}</span>
              </div>
              <button
                onClick={() => setIsPlannerOpen(true)}
                className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-black text-white shadow-sm"
                style={{ backgroundColor: GW_BLUE }}
              >
                <Menu size={18} />
                루트 설계
                {mustGoSpots.length > 0 && <span className="rounded-md bg-white/20 px-2 py-0.5 text-xs">{mustGoSpots.length}개 선택</span>}
              </button>
            </div>
          </div>

          <nav className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {[
              { id: "all", label: "전체 탐색", icon: Search },
              { id: "spot", label: "웰니스 스팟", icon: Leaf },
              { id: "food", label: "건강 맛집", icon: Utensils },
              { id: "stay", label: "힐링 숙소", icon: BedDouble },
            ].map((item) => {
              const Icon = item.icon;
              const active = mainCategoryFilter === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setMainCategoryFilter(item.id as MainCategoryFilter);
                    setSubCategoryFilter("전체");
                  }}
                  className={`flex shrink-0 items-center gap-2 rounded-lg border px-4 py-3 text-left text-sm font-black transition ${
                    active ? "border-transparent text-white shadow-sm" : "border-[#d3dfd4] bg-[#fbfcf8] text-[#526158] hover:bg-white"
                  }`}
                  style={active ? { backgroundColor: GW_BLUE } : {}}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}

            <div className="flex shrink-0 items-center gap-2 rounded-lg border border-[#d3dfd4] bg-[#fbfcf8] px-3 py-2">
              <Filter size={16} style={{ color: GW_BLUE }} />
              {subCategoryOptions.map((category) => (
                <button
                  key={category}
                  onClick={() => setSubCategoryFilter(category)}
                  className={`rounded-md border px-3 py-2 text-xs font-bold ${
                    subCategoryFilter === category ? "border-[#0DB14B] bg-[#ebf8ef] text-[#087a36]" : "border-transparent bg-white text-[#617168]"
                  }`}
                >
                  {getSubCategoryLabel(category)}
                </button>
              ))}
            </div>

            <div className="flex shrink-0 items-center gap-2 rounded-lg border border-[#d3dfd4] bg-[#fbfcf8] px-3 py-2">
              <span className="text-xs font-black" style={{ color: GW_BLUE }}>꼭 가고 싶은 장소</span>
              <span className="rounded-md bg-[#ebf8ef] px-2 py-1 text-xs font-black text-[#087a36]">{mustGoSpots.length}/3</span>
              {selectedMustGoPlaces.length > 0 ? (
                selectedMustGoPlaces.map((place) => (
                  <button
                    key={place.id}
                    onClick={() => toggleMustGoSpot(place.id)}
                    className="flex max-w-[180px] items-center gap-2 rounded-md bg-white px-2 py-1 text-xs font-bold text-[#2f4037]"
                  >
                    <span className="truncate">{place.name}</span>
                    <X size={13} />
                  </button>
                ))
              ) : (
                <span className="text-xs font-bold text-[#66756c]">카드 체크로 지정</span>
              )}
            </div>
          </nav>
        </header>

        <section className="grid min-h-[calc(100vh-136px)] grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)] gap-5 p-6">
          <div className="grid min-h-0 grid-rows-[minmax(520px,calc(100vh-202px))]">
            <section className="grid min-h-0 grid-cols-[minmax(0,1fr)_380px] gap-5">
              <KakaoMapPanel selectedPlace={selectedPlace} generatedCourse={generatedCourse} onSelectPlace={setSelectedPlace} />

              <PlaceDetailPanel
                place={selectedPlace}
                selected={mustGoSpots.includes(selectedPlace.id)}
                weather={weatherByPlaceId[selectedPlace.id]}
                onToggle={() => toggleMustGoSpot(selectedPlace.id)}
              />
            </section>
          </div>

          <section className="min-h-0 rounded-lg border border-[#d3dfd4] bg-white">
            <div className="flex items-center justify-between border-b border-[#e1e8df] px-5 py-4">
              <div>
                <h3 className="text-lg font-black">장소 탐색</h3>
                <p className="mt-1 text-xs font-bold text-[#66756c]">웰니스 스팟, 건강 맛집, 힐링 숙소를 함께 선택합니다.</p>
              </div>
              <span className="rounded-lg bg-[#ebf8ef] px-3 py-2 text-xs font-black text-[#087a36]">{filteredPlaces.length}개</span>
            </div>
            <div className="grid max-h-[calc(100vh-228px)] min-h-[520px] grid-cols-2 gap-3 overflow-auto p-4">
              {filteredPlaces.map((place) => (
                <PlaceCard
                  key={place.id}
                  cardRef={(node) => {
                    placeCardRefs.current[place.id] = node;
                  }}
                  place={place}
                  selected={selectedPlace.id === place.id}
                  mustGo={mustGoSpots.includes(place.id)}
                  onOpen={() => setSelectedPlace(place)}
                  onToggle={() => toggleMustGoSpot(place.id)}
                />
              ))}
            </div>
          </section>
        </section>

        {isPlannerOpen && (
          <button
            aria-label="루트 설계 패널 닫기"
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setIsPlannerOpen(false)}
          />
        )}

        <aside
          className={`fixed bottom-0 right-0 top-0 z-50 w-[430px] max-w-[calc(100vw-24px)] overflow-auto border-l border-[#d3dfd4] bg-[#fbfcf8] px-6 py-6 shadow-2xl transition-transform duration-300 ${
            isPlannerOpen ? "translate-x-0 pointer-events-auto" : "translate-x-full pointer-events-none"
          }`}
          aria-hidden={!isPlannerOpen}
        >
          <section className="rounded-lg border border-[#d3dfd4] bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-black" style={{ color: GW_BLUE }}>
                <SlidersHorizontal size={18} />
                원스톱 루트 설계
              </h3>
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-[#eaf2ff] px-3 py-1 text-xs font-black" style={{ color: GW_BLUE }}>
                  MVP
                </span>
                <button onClick={() => setIsPlannerOpen(false)} className="rounded-lg border border-[#dce6dc] p-2 text-[#526158]" title="닫기">
                  <X size={16} />
                </button>
              </div>
            </div>

            <ControlGroup title="설계 방식">
              <SegmentedControl
                items={[
                  { id: "auto", label: "전체 자동" },
                  { id: "semi-auto", label: "반자동" },
                ]}
                value={planMode}
                onChange={(value) => setPlanMode(value as PlanMode)}
              />
            </ControlGroup>

            <ControlGroup title="이동 수단">
              <div className="grid grid-cols-2 gap-2">
                <ModeButton active={travelMode === "walk"} icon={<Footprints size={18} />} label="뚜벅이" onClick={() => setTravelMode("walk")} />
                <ModeButton active={travelMode === "drive"} icon={<Car size={18} />} label="자동차" onClick={() => setTravelMode("drive")} />
              </div>
            </ControlGroup>

            <ControlGroup title="여행 강도">
              <SegmentedControl
                items={[
                  { id: "relaxed", label: "여유롭게" },
                  { id: "dense", label: "빽빽하게" },
                ]}
                value={planIntensity}
                onChange={(value) => setPlanIntensity(value as PlanIntensity)}
              />
            </ControlGroup>

            <label className="mt-5 flex items-center justify-between rounded-lg border border-[#dce6dc] bg-[#f7faf6] px-4 py-3">
              <span>
                <span className="block text-sm font-black">맛집 및 숙소 자동 포함</span>
                <span className="mt-1 block text-xs font-bold text-[#66756c]">건강 맛집과 힐링 숙소를 함께 배치</span>
              </span>
              <input
                type="checkbox"
                checked={includeFoodAndStay}
                onChange={(event) => setIncludeFoodAndStay(event.target.checked)}
                className="h-5 w-5 accent-[#0DB14B]"
              />
            </label>

            <button
              onClick={generateCourse}
              disabled={isPlanning || (planMode === "semi-auto" && mustGoSpots.length === 0)}
              className="mt-5 flex w-full items-center justify-center rounded-lg px-4 py-4 text-sm font-black text-white shadow-sm disabled:bg-slate-300"
              style={!isPlanning && !(planMode === "semi-auto" && mustGoSpots.length === 0) ? { backgroundColor: GW_BLUE } : {}}
            >
              {isPlanning ? (
                <>
                  <Loader2 size={17} className="mr-2 animate-spin" />
                  루트 생성 중
                </>
              ) : (
                "원스톱 루트 생성하기"
              )}
            </button>
          </section>

          <section className="mt-5 rounded-lg border border-[#d3dfd4] bg-white">
            <div className="flex items-center justify-between border-b border-[#e1e8df] px-5 py-4">
              <h3 className="text-lg font-black">생성된 일정</h3>
              <button className="rounded-lg border border-[#dce6dc] p-2 text-[#526158]" title="저장">
                <Save size={16} />
              </button>
            </div>
            <div className="max-h-[calc(100vh-558px)] min-h-[280px] overflow-auto p-5">
              {generatedCourse ? (
                <div className="space-y-4">
                  <CourseEvidencePanel items={generatedCourseEvidence} />
                  <Timeline course={generatedCourse} travelMode={travelMode} weatherByPlaceId={weatherByPlaceId} />
                </div>
              ) : (
                <div className="flex min-h-[260px] flex-col items-center justify-center rounded-lg bg-[#f4f7f3] px-6 text-center">
                  <Map size={34} className="mb-3 text-[#9aad9f]" />
                  <p className="text-sm font-black text-[#526158]">아직 생성된 루트가 없습니다.</p>
                  <p className="mt-2 text-xs leading-5 text-[#75837b]">설계 조건을 고른 뒤 원스톱 루트를 생성하세요.</p>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function KakaoMapPanel({
  selectedPlace,
  generatedCourse,
  onSelectPlace,
}: {
  selectedPlace: Place;
  generatedCourse: CourseItem[] | null;
  onSelectPlace: (place: Place) => void;
}) {
  const generatedPlaces = useMemo(() => generatedCourse?.filter(isPlaceCourseItem) ?? null, [generatedCourse]);
  const places = useMemo(() => generatedPlaces ?? [selectedPlace], [generatedPlaces, selectedPlace]);
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const markersRef = useRef<KakaoMapOverlay[]>([]);
  const polylineRef = useRef<KakaoMapPolyline | null>(null);
  const initialMapCenterRef = useRef({ lat: selectedPlace.lat, lng: selectedPlace.lng });
  const fittedPlacesKeyRef = useRef<string | null>(null);
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "fallback">(
    process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ? "loading" : "fallback",
  );

  useEffect(() => {
    let cancelled = false;
    const mapKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    const container = mapElementRef.current;

    if (!mapKey || !container) {
      setMapStatus("fallback");
      return;
    }

    loadKakaoMaps(mapKey)
      .then((maps) => {
        if (cancelled || !mapElementRef.current) return;
        const center = new maps.LatLng(initialMapCenterRef.current.lat, initialMapCenterRef.current.lng);
        mapRef.current = new maps.Map(mapElementRef.current, { center, level: 8 });
        setMapStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setMapStatus("fallback");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (mapStatus !== "ready" || !mapRef.current || !window.kakao?.maps) return;

    const nextCenter = new window.kakao.maps.LatLng(selectedPlace.lat, selectedPlace.lng);
    mapRef.current.panTo(nextCenter);
  }, [mapStatus, selectedPlace.lat, selectedPlace.lng]);

  useEffect(() => {
    if (mapStatus !== "ready" || !mapRef.current || !window.kakao?.maps) return;

    const maps = window.kakao.maps;
    const map = mapRef.current;
    const visiblePlaces = places.slice(0, 5);
    const visiblePlacesKey = visiblePlaces.map((place) => place.id).join("|");
    const positions = visiblePlaces.map((place) => new maps.LatLng(place.lat, place.lng));
    if (positions.length === 0) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = visiblePlaces.map((place, index) => {
      const markerElement = createNumberedMapMarker({
        index,
        place,
        selected: selectedPlace.id === place.id,
        onClick: () => onSelectPlace(place),
      });

      return new maps.CustomOverlay({
        map,
        position: positions[index],
        content: markerElement,
        xAnchor: 0.5,
        yAnchor: 1,
        zIndex: selectedPlace.id === place.id ? 20 : 10,
      });
    });

    polylineRef.current?.setMap(null);
    polylineRef.current = null;

    if (positions.length > 1) {
      polylineRef.current = new maps.Polyline({
        path: positions,
        strokeWeight: 4,
        strokeColor: GW_BLUE,
        strokeOpacity: 0.72,
        strokeStyle: "solid",
      });
      polylineRef.current.setMap(map);

      const bounds = new maps.LatLngBounds();
      if (fittedPlacesKeyRef.current !== visiblePlacesKey) {
        positions.forEach((position) => bounds.extend(position));
        map.setBounds(bounds);
        fittedPlacesKeyRef.current = visiblePlacesKey;
      }
    } else {
      map.panTo(positions[0]);
      fittedPlacesKeyRef.current = visiblePlacesKey;
    }

    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      polylineRef.current?.setMap(null);
      polylineRef.current = null;
    };
  }, [mapStatus, onSelectPlace, places, selectedPlace.id]);

  return (
    <div className="relative min-h-0 overflow-hidden rounded-lg border border-[#d3dfd4] bg-[#dce8dd]">
      <div ref={mapElementRef} aria-label="강원도 웰니스 카카오 지도" className="absolute inset-0 h-full w-full" />
      {mapStatus !== "ready" && <KakaoMapFallback selectedPlace={selectedPlace} places={places} />}
      <div className="absolute left-5 top-5 rounded-lg bg-white/92 px-4 py-3 shadow-sm backdrop-blur">
        <p className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: GW_GREEN }}>
          {mapStatus === "ready" ? "Kakao Map" : "Kakao Map 대기"}
        </p>
        <p className="mt-1 text-sm font-black" style={{ color: GW_BLUE }}>
          스팟·맛집·숙소 통합 경로
        </p>
      </div>
      <div className="absolute bottom-5 left-5 right-5 rounded-lg bg-white/92 p-4 shadow-sm backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black text-[#66756c]">현재 선택</p>
            <h3 className="mt-1 text-lg font-black text-[#17211b]">{selectedPlace.name}</h3>
            <p className="mt-1 text-sm text-[#526158]">{selectedPlace.addr}</p>
          </div>
          <span className="rounded-lg bg-[#ebf8ef] px-3 py-2 text-sm font-black text-[#087a36]">평점 {selectedPlace.score}</span>
        </div>
      </div>
    </div>
  );
}

function loadKakaoMaps(appKey: string) {
  if (window.kakao?.maps) {
    return new Promise<KakaoMapsApi>((resolve) => window.kakao?.maps.load(() => resolve(window.kakao!.maps)));
  }

  if (kakaoMapsLoader) return kakaoMapsLoader;

  kakaoMapsLoader = new Promise<KakaoMapsApi>((resolve, reject) => {
    const existingScript = document.getElementById("kakao-map-sdk") as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", () => window.kakao?.maps.load(() => resolve(window.kakao!.maps)), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Kakao Maps SDK failed to load")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "kakao-map-sdk";
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`;
    script.onload = () => window.kakao?.maps.load(() => resolve(window.kakao!.maps));
    script.onerror = () => reject(new Error("Kakao Maps SDK failed to load"));
    document.head.appendChild(script);
  });

  return kakaoMapsLoader;
}

function createNumberedMapMarker({
  index,
  place,
  selected,
  onClick,
}: {
  index: number;
  place: Place;
  selected: boolean;
  onClick: () => void;
}) {
  const button = document.createElement("button");
  button.type = "button";
  button.title = `${index + 1}. ${place.name}`;
  button.setAttribute("aria-label", `${index + 1}번 장소 ${place.name} 선택`);
  button.textContent = String(index + 1);
  button.style.alignItems = "center";
  button.style.background = selected ? GW_BLUE : getCategoryColor(place.category);
  button.style.border = "3px solid #ffffff";
  button.style.borderRadius = "999px";
  button.style.boxShadow = selected ? "0 8px 18px rgba(0, 91, 170, 0.32)" : "0 6px 14px rgba(0, 0, 0, 0.22)";
  button.style.color = "#ffffff";
  button.style.cursor = "pointer";
  button.style.display = "flex";
  button.style.fontSize = "14px";
  button.style.fontWeight = "900";
  button.style.height = selected ? "42px" : "36px";
  button.style.justifyContent = "center";
  button.style.lineHeight = "1";
  button.style.outline = "none";
  button.style.transition = "transform 160ms ease, box-shadow 160ms ease";
  button.style.width = selected ? "42px" : "36px";
  button.addEventListener("mouseenter", () => {
    button.style.transform = "translateY(-2px) scale(1.04)";
  });
  button.addEventListener("mouseleave", () => {
    button.style.transform = "translateY(0) scale(1)";
  });
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });

  return button;
}

function KakaoMapFallback({ selectedPlace, places }: { selectedPlace: Place; places: PlaceCourseItem[] | Place[] }) {
  return (
    <>
      <div
        aria-label="강원도 웰니스 지도"
        className="absolute inset-0 bg-cover bg-center opacity-75"
        role="img"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80)",
        }}
      />
      <div className="absolute inset-0 bg-[#113524]/35" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M19 35 C31 30, 42 54, 51 48 S68 32, 79 42" fill="none" stroke="rgba(255,255,255,.78)" strokeDasharray="3 3" strokeLinecap="round" strokeWidth="0.65" />
      </svg>
      {places.slice(0, 5).map((place, index) => (
        <MapMarker key={`${place.id}-${index}`} place={place} index={index} selected={place.id === selectedPlace.id} />
      ))}
    </>
  );
}

function MapMarker({ place, index, selected }: { place: Place; index: number; selected: boolean }) {
  const points = [
    ["22%", "34%"],
    ["42%", "55%"],
    ["61%", "38%"],
    ["73%", "50%"],
    ["52%", "27%"],
  ];
  const [left, top] = points[index] ?? points[0];

  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left, top }}>
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-full border-4 border-white text-sm font-black text-white shadow-lg ${
          selected ? "scale-110" : ""
        }`}
        style={{ backgroundColor: getCategoryColor(place.category) }}
      >
        {index + 1}
      </div>
      <div className="mt-2 whitespace-nowrap rounded-md bg-white/90 px-2 py-1 text-xs font-black text-[#2f4037] shadow-sm">{place.region}</div>
    </div>
  );
}

function PlaceDetailPanel({
  place,
  selected,
  weather,
  onToggle,
}: {
  place: Place;
  selected: boolean;
  weather?: WeatherSummary;
  onToggle: () => void;
}) {
  const Icon = place.category === "food" ? Utensils : place.category === "stay" ? BedDouble : Leaf;

  return (
    <article className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-[#d3dfd4] bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: getCategoryColor(place.category) }}>
            <Icon size={26} />
          </div>
          <h3 className="min-w-0 text-2xl font-black leading-8">{place.name}</h3>
        </div>
        <button
          onClick={onToggle}
          aria-label={selected ? "꼭 가고 싶은 장소에서 해제" : "꼭 가고 싶은 장소로 선택"}
          className={`shrink-0 rounded-lg p-2 ${selected ? "text-white" : "bg-white text-[#8a978f]"}`}
          style={selected ? { backgroundColor: GW_BLUE } : {}}
        >
          <CheckCircle2 size={18} />
        </button>
      </div>
      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-[220px] flex-1 flex-col rounded-lg bg-[#f7faf6] px-4 py-3">
          <p className="shrink-0 text-[11px] font-black text-[#66756c]">장소 설명</p>
          <div className="mt-2 min-h-0 flex-1 overflow-y-auto pb-3 pr-3">
            <p className="text-sm leading-6 text-[#526158]">{place.desc}</p>
          </div>
        </div>
        <p className="mt-4 flex shrink-0 items-start gap-2 text-sm font-bold leading-6 text-[#66756c]">
          <MapPin size={17} className="mt-1 shrink-0" style={{ color: GW_GREEN }} />
          {place.addr}
        </p>
      </div>
      <WeatherInsightCard weather={weather} />
      <dl className="mt-4 grid grid-cols-3 gap-3">
        <Metric label="지역" value={place.region} />
        <Metric label="평점" value={place.score.toFixed(1)} />
        <Metric label="좌표" value={`${place.lat.toFixed(2)}, ${place.lng.toFixed(2)}`} />
      </dl>
    </article>
  );
}

function WeatherInsightCard({ weather }: { weather?: WeatherSummary }) {
  const levelClass = weather
    ? {
        good: "border-[#cfe8d5] bg-[#f4fbf6] text-[#087a36]",
        normal: "border-blue-100 bg-blue-50 text-[#005BAA]",
        caution: "border-amber-100 bg-amber-50 text-amber-800",
      }[weather.activityLevel]
    : "border-[#dce6dc] bg-[#f7faf6] text-[#66756c]";

  return (
    <section className={`mt-4 rounded-lg border px-4 py-3 ${levelClass}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-black">기상 기반 방문 적합도</p>
        <span className="rounded-md bg-white/70 px-2 py-1 text-[10px] font-black">
          {weather ? (weather.source === "weatherapi" ? "기상청 API" : "예비값") : "확인 중"}
        </span>
      </div>
      {weather ? (
        <>
          <p className="text-sm font-black">{weather.activityLabel}</p>
          <p className="mt-1 text-xs font-bold leading-5 opacity-80">{weather.message}</p>
          <p className="mt-2 text-xs font-medium leading-5 opacity-80">{weather.recommendationHint}</p>
        </>
      ) : (
        <div className="flex items-center gap-2 text-xs font-bold">
          <Loader2 size={14} className="animate-spin" />
          선택 장소의 초단기예보를 불러오는 중입니다.
        </div>
      )}
    </section>
  );
}

function PlaceCard({
  cardRef,
  place,
  selected,
  mustGo,
  onOpen,
  onToggle,
}: {
  cardRef?: (node: HTMLElement | null) => void;
  place: Place;
  selected: boolean;
  mustGo: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const Icon = place.category === "food" ? Utensils : place.category === "stay" ? BedDouble : Leaf;

  return (
    <article
      ref={cardRef}
      className={`rounded-lg border bg-[#fbfcf8] p-4 transition ${selected ? "border-[#005BAA] shadow-sm" : "border-[#dce6dc] hover:border-[#9ebca7]"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <button onClick={onOpen} className="flex min-w-0 flex-1 items-start gap-3 text-left">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: getCategoryColor(place.category) }}>
            <Icon size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="shrink-0 whitespace-nowrap rounded-md bg-white px-2 py-1 text-[11px] font-black text-[#526158]">{place.region}</span>
              <span className="shrink-0 whitespace-nowrap rounded-md bg-[#ebf8ef] px-2 py-1 text-[11px] font-black text-[#087a36]">{getCategoryLabel(place.category)}</span>
            </div>
            <h4 className="mt-3 line-clamp-2 text-sm font-black leading-5 text-[#17211b]">{place.name}</h4>
          </div>
        </button>
        <button onClick={onToggle} className={`rounded-lg p-2 ${mustGo ? "text-white" : "bg-white text-[#8a978f]"}`} style={mustGo ? { backgroundColor: GW_BLUE } : {}}>
          <CheckCircle2 size={18} />
        </button>
      </div>
      <div className="mt-3">
        <p className="text-[11px] font-black text-[#8a978f]">장소 설명</p>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#64746b]">{place.desc}</p>
      </div>
      <div className="mt-4 flex items-center gap-1 text-xs font-black text-[#66756c]">
        <Star size={14} className="fill-[#F59E0B] text-[#F59E0B]" />
        {place.score.toFixed(1)}
      </div>
    </article>
  );
}

function CourseEvidencePanel({ items }: { items: string[] }) {
  return (
    <section className="rounded-lg border border-[#cfe8d5] bg-[#f4fbf6] px-4 py-3">
      <p className="text-[11px] font-black text-[#087a36]">추천 기준 요약</p>
      <div className="mt-2 grid gap-2">
        {items.map((item) => (
          <p key={item} className="flex gap-2 text-xs font-bold leading-5 text-[#526158]">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#0DB14B]" />
            <span>{item}</span>
          </p>
        ))}
      </div>
    </section>
  );
}

function Timeline({
  course,
  travelMode,
  weatherByPlaceId,
}: {
  course: CourseItem[];
  travelMode: TravelMode;
  weatherByPlaceId: Record<string, WeatherSummary>;
}) {
  return (
    <div className="space-y-4">
      {course.map((item, index) =>
        item.type === "travel" ? (
          <div key={`travel-${index}`} className="ml-5 flex items-center gap-2 rounded-lg border border-dashed border-[#cbd9ce] bg-[#f7faf6] px-3 py-2 text-xs font-bold text-[#526158]">
            {item.travelType === "walk" ? <Footprints size={15} style={{ color: GW_GREEN }} /> : <Car size={15} style={{ color: GW_BLUE }} />}
            이동 약 {item.duration}분
          </div>
        ) : (
          <article key={`${item.id}-${index}`} className="relative rounded-lg border border-[#dce6dc] bg-[#fbfcf8] p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-md bg-white px-2 py-1 text-[11px] font-black" style={{ color: GW_BLUE }}>
                {item.timeRange}
              </span>
              {travelMode === "drive" && (
                <button className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-black text-white" style={{ backgroundColor: GW_BLUE }}>
                  <Navigation size={12} />
                  길안내
                </button>
              )}
            </div>
            <h4 className="mt-3 text-sm font-black leading-5">{item.name}</h4>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold text-[#66756c]">{getCategoryLabel(item.category)} · {item.region}</p>
              <CourseWeatherPill weather={weatherByPlaceId[item.id]} />
            </div>
            <div className="mt-3 rounded-lg bg-white px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-[#66756c]">장소 설명</span>
              </div>
              <p className="mt-2 line-clamp-2 text-xs font-medium leading-5 text-[#526158]">{item.desc}</p>
            </div>
            <p className="mt-2 rounded-lg border border-[#cfe8d5] bg-[#f4fbf6] px-3 py-2 text-xs font-bold leading-5 text-[#526158]">
              <span className="mb-1 flex items-center justify-between text-[11px] font-black text-[#087a36]">
                <span>추천 로직</span>
                <span className="rounded-md bg-white/80 px-2 py-0.5 text-[10px]">기상·이동 반영</span>
              </span>
              {item.recommendationReason}
            </p>
          </article>
        ),
      )}
    </div>
  );
}

function CourseWeatherPill({ weather }: { weather?: WeatherSummary }) {
  const label = weather
    ? {
        good: "야외 적합",
        normal: "보통",
        caution: "기상 주의",
      }[weather.activityLevel]
    : "기상 확인";
  const className = weather
    ? {
        good: "bg-emerald-50 text-[#087a36]",
        normal: "bg-blue-50 text-[#005BAA]",
        caution: "bg-amber-50 text-amber-800",
      }[weather.activityLevel]
    : "bg-[#f2f6f1] text-[#66756c]";

  return <span className={`rounded-md px-2 py-1 text-[10px] font-black ${className}`}>{label}</span>;
}

function ControlGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <p className="mb-2 text-xs font-black text-[#66756c]">{title}</p>
      {children}
    </div>
  );
}

function SegmentedControl({
  items,
  value,
  onChange,
}: {
  items: { id: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 rounded-lg border border-[#dce6dc] bg-[#f5f8f4] p-1">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={`rounded-md px-3 py-2 text-xs font-black ${value === item.id ? "bg-white shadow-sm" : "text-[#66756c]"}`}
          style={value === item.id ? { color: GW_BLUE } : {}}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function ModeButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-xs font-black ${
        active ? "border-[#0DB14B] bg-[#ebf8ef] text-[#087a36]" : "border-[#dce6dc] bg-[#f7faf6] text-[#66756c]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#f2f6f1] p-3">
      <dt className="text-[11px] font-black text-[#66756c]">{label}</dt>
      <dd className="mt-1 truncate text-sm font-black text-[#17211b]">{value}</dd>
    </div>
  );
}

function buildCourse({
  places,
  mustGoIds,
  planIntensity,
  planMode,
  includeFoodAndStay,
  travelMode,
  weatherByPlaceId,
}: {
  places: Place[];
  mustGoIds: string[];
  planIntensity: PlanIntensity;
  planMode: PlanMode;
  includeFoodAndStay: boolean;
  travelMode: TravelMode;
  weatherByPlaceId: Record<string, WeatherSummary>;
}) {
  return buildWellnessCourse({ places, mustGoIds, planIntensity, planMode, includeFoodAndStay, travelMode, weatherByPlaceId });
}

function isPlaceCourseItem(item: CourseItem): item is PlaceCourseItem {
  return item.type !== "travel";
}

function getSubCategoryLabel(category: SubCategoryFilter) {
  const labels: Record<SubCategoryFilter, string> = {
    전체: "전체보기",
    forest: "산림욕",
    yoga: "요가",
    meditation: "명상",
    healthy: "건강식",
    local: "향토음식",
    resort: "리조트",
    wellness: "웰니스센터",
    healing: "힐링스테이",
    hotel: "호텔",
  };

  return labels[category];
}

function getCategoryLabel(category: PlaceCategory) {
  const labels: Record<PlaceCategory, string> = {
    spot: "웰니스 스팟",
    food: "건강 맛집",
    stay: "힐링 숙소",
  };

  return labels[category];
}

function getCategoryColor(category: PlaceCategory) {
  const colors: Record<PlaceCategory, string> = {
    spot: GW_GREEN,
    food: "#F59E0B",
    stay: "#7C3AED",
  };

  return colors[category];
}
