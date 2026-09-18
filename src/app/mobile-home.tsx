"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buildWellnessCourse, shiftTimeRange, type PlaceCourseItem as BuiltPlaceCourseItem, type WellnessCourseItem } from "@/lib/course-builder";
import type { TransitOrigin, TransitRoute } from "@/lib/kakao-transit";
import { getKakaoDrivingRouteUrl, getKakaoMapSearchUrl } from "@/lib/kakao-map-links";
import {
  BedDouble,
  Bus,
  Car,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  NotebookPen,
  Leaf,
  Loader2,
  LogOut,
  Map,
  MapPin,
  MessageCircle,
  Navigation,
  RefreshCw,
  Save,
  Search,
  User,
  Utensils,
  X,
} from "lucide-react";

const GW_GREEN = "#0DB14B";
const GW_BLUE = "#005BAA";
const REGION_ORDER = ["춘천", "원주", "강릉", "속초", "동해", "양양", "고성", "삼척", "영월", "인제", "정선", "철원", "평창", "홍천", "횡성", "태백", "양구", "화천"];
const DEPARTURE_TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hour = String(Math.floor(index / 2)).padStart(2, "0");
  const minute = index % 2 === 0 ? "00" : "30";
  return `${hour}:${minute}`;
});

type PlaceCategory = "spot" | "food" | "stay";
type MainCategoryFilter = "all" | PlaceCategory;
type SubCategoryFilter = "전체" | "forest" | "yoga" | "meditation" | "healthy" | "local" | "resort" | "wellness" | "healing" | "hotel";
type TravelMode = "walk" | "drive";
type PlanMode = "selected-only" | "selected-with-recommendations";
type PlanTheme = "food" | "forest" | "mindfulness" | "spa" | "temple" | "auto";
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
  contentId?: string;
  contentTypeId?: string;
  image?: string;
  dataSource?: "tourapi" | "gangwon-restaurant" | "curated" | "sample";
};

type PlaceCourseItem = BuiltPlaceCourseItem<Place>;
type CourseItem = WellnessCourseItem<Place>;

type SavedPlan = {
  id: string;
  date: string;
  course: CourseItem[];
  travelMode: TravelMode;
  planMode: PlanMode;
  mustGoSpots: string[];
  origin: TransitOrigin | null;
  originTransit: TransitRoute | null;
  transitLegs: Record<number, TransitRoute>;
  departureDate: string;
  departureClock: string;
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

type SessionUser = {
  id: string;
  nickname: string;
  email?: string;
  profileImage?: string;
};

type SessionResponse = {
  authenticated: boolean;
  user: SessionUser | null;
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
const staySubCategories: SubCategoryFilter[] = ["전체", "resort", "wellness", "healing"];
const routeThemes: { id: Exclude<PlanTheme, "auto">; label: string }[] = [
  { id: "food", label: "맛집 탐방" },
  { id: "forest", label: "숲속 트레킹" },
  { id: "mindfulness", label: "명상·요가" },
  { id: "spa", label: "온천·사우나" },
  { id: "temple", label: "템플스테이" },
];

function currentLocalDateTime() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function combineDepartureDateTime(date: string, time: string) {
  return `${date}T${time}`;
}

function initialDepartureClock() {
  const [hour, minute] = currentLocalDateTime().slice(11, 16).split(":").map(Number);
  return `${String(hour).padStart(2, "0")}:${minute < 30 ? "00" : "30"}`;
}

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
  planMode,
}: {
  places: Place[];
  mustGoIds: string[];
  knownWeather: Record<string, WeatherSummary>;
  planMode: PlanMode;
}) {
  const candidates = getCourseWeatherCandidates({ places, mustGoIds, planMode })
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
  planMode,
}: {
  places: Place[];
  mustGoIds: string[];
  planMode: PlanMode;
}) {
  const mustGoSet = new Set(mustGoIds);
  const requiredPlaces = places.filter((place) => mustGoSet.has(place.id));
  if (planMode === "selected-only") return requiredPlaces;
  const recommendations = places
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  return uniquePlaces([...requiredPlaces, ...recommendations]);
}

function uniquePlaces<TPlace extends Pick<Place, "id">>(places: TPlace[]) {
  const seen = new Set<string>();
  return places.filter((place) => {
    if (seen.has(place.id)) return false;
    seen.add(place.id);
    return true;
  });
}

export default function MobileHome({ initialPlaces }: { initialPlaces: Place[] }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>("login");
  const [mainCategoryFilter, setMainCategoryFilter] = useState<MainCategoryFilter>("all");
  const [subCategoryFilter, setSubCategoryFilter] = useState<SubCategoryFilter>("전체");
  const [regionFilter, setRegionFilter] = useState("전체");
  const [mustGoSpots, setMustGoSpots] = useState<string[]>([]);
  const [viewingPlace, setViewingPlace] = useState<Place | null>(null);
  const [imagePlace, setImagePlace] = useState<Place | null>(null);
  const [travelMode, setTravelMode] = useState<TravelMode>("walk");
  const [planMode, setPlanMode] = useState<PlanMode>("selected-with-recommendations");
  const [recommendationTheme, setRecommendationTheme] = useState<Exclude<PlanTheme, "auto">>("forest");
  const [isRecommendationOpen, setIsRecommendationOpen] = useState(false);
  const [transitOrigin, setTransitOrigin] = useState<TransitOrigin | null>(null);
  const [originQuery, setOriginQuery] = useState("");
  const [departureDate, setDepartureDate] = useState(() => currentLocalDateTime().slice(0, 10));
  const [departureClock, setDepartureClock] = useState(initialDepartureClock);
  const [isResolvingOrigin, setIsResolvingOrigin] = useState(false);
  const [originTransit, setOriginTransit] = useState<TransitRoute | null>(null);
  const [transitLegs, setTransitLegs] = useState<Record<number, TransitRoute>>({});
  const [isPlanning, setIsPlanning] = useState(false);
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const [generatedCourse, setGeneratedCourse] = useState<CourseItem[] | null>(null);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const places = initialPlaces;
  const [weatherByPlaceId, setWeatherByPlaceId] = useState<Record<string, WeatherSummary>>({});
  const [selectedMapPlaceId, setSelectedMapPlaceId] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    if (!sessionUser) return;

    let canceled = false;
    fetch("/api/routes", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to load saved routes");
        return (await response.json()) as { plans: SavedPlan[] };
      })
      .then((data) => { if (!canceled) setSavedPlans(data.plans); })
      .catch(() => { if (!canceled) setSavedPlans([]); });

    return () => { canceled = true; };
  }, [sessionUser]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const forcedMobileView = searchParams.get("view") === "mobile";
    const requestedTab = searchParams.get("tab");
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    if (desktopQuery.matches && !forcedMobileView) {
      router.replace("/desktop");
      return;
    }

    if (requestedTab === "home" || requestedTab === "planner" || requestedTab === "map") {
      const tabTimer = window.setTimeout(() => setActiveTab(requestedTab), 0);
      return () => window.clearTimeout(tabTimer);
    }
  }, [router]);

  useEffect(() => {
    let canceled = false;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (!response.ok) throw new Error(`Failed to load session: ${response.status}`);
        const data = (await response.json()) as SessionResponse;
        if (canceled) return;
        setSessionUser(data.authenticated ? data.user : null);
        const requestedTab = new URLSearchParams(window.location.search).get("tab");
        if (data.authenticated && requestedTab === "profile") {
          setActiveTab("profile");
        } else if (data.authenticated) {
          setActiveTab((current) => current === "login" ? "home" : current);
        } else if (requestedTab === "profile") {
          setActiveTab("login");
        }
      } catch {
        if (!canceled) setSessionUser(null);
      }
    }

    loadSession();

    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    if (!viewingPlace) return;
    const place = viewingPlace;
    let canceled = false;

    async function loadWeather() {
      try {
        const response = await fetch(`/api/wellness/weather?lat=${place.lat}&lng=${place.lng}`);
        if (!response.ok) throw new Error(`Failed to load weather: ${response.status}`);
        const data = (await response.json()) as WeatherSummary;
        if (!canceled) {
          setWeatherByPlaceId((current) => ({ ...current, [place.id]: data }));
        }
      } catch {
        if (!canceled) {
          setWeatherByPlaceId((current) => ({
            ...current,
            [place.id]: createWeatherFallback(),
          }));
        }
      }
    }

    loadWeather();

    return () => {
      canceled = true;
    };
  }, [viewingPlace]);

  useEffect(() => {
    if (!imagePlace && !viewingPlace && !isRecommendationOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setImagePlace(null);
        setViewingPlace(null);
        setIsRecommendationOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [imagePlace, isRecommendationOpen, viewingPlace]);

  useEffect(() => {
    if (!viewingPlace && !imagePlace && !isRecommendationOpen) return;

    const scrollY = window.scrollY;
    const bodyStyle = document.body.style;
    const htmlStyle = document.documentElement.style;
    const previous = {
      bodyOverflow: bodyStyle.overflow,
      bodyPosition: bodyStyle.position,
      bodyTop: bodyStyle.top,
      bodyWidth: bodyStyle.width,
      htmlOverflow: htmlStyle.overflow,
    };

    bodyStyle.overflow = "hidden";
    bodyStyle.position = "fixed";
    bodyStyle.top = `-${scrollY}px`;
    bodyStyle.width = "100%";
    htmlStyle.overflow = "hidden";

    return () => {
      bodyStyle.overflow = previous.bodyOverflow;
      bodyStyle.position = previous.bodyPosition;
      bodyStyle.top = previous.bodyTop;
      bodyStyle.width = previous.bodyWidth;
      htmlStyle.overflow = previous.htmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [imagePlace, isRecommendationOpen, viewingPlace]);

  const handleKakaoLogin = () => {
    router.push("/api/auth/kakao/start");
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setSessionUser(null);
    setSavedPlans([]);
    setActiveTab("login");
  };

  const handleKakaoMapSearch = (destinationName: string) => {
    window.open(getKakaoMapSearchUrl(destinationName), "_blank", "noopener,noreferrer");
  };

  const getDrivingRouteUrl = (travelIndex: number) => {
    if (!generatedCourse) return null;
    const from = [...generatedCourse.slice(0, travelIndex)].reverse().find(isPlaceCourseItem);
    const to = generatedCourse.slice(travelIndex + 1).find(isPlaceCourseItem);
    return from && to ? getKakaoDrivingRouteUrl(from, to) : null;
  };

  const filteredPlaces = useMemo(() => {
    return places.filter((place) => {
      const matchMain = mainCategoryFilter === "all" || place.category === mainCategoryFilter;
      const matchSub = subCategoryFilter === "전체" || (subCategoryFilter === "resort" ? place.subCategory === "resort" || place.subCategory === "hotel" : place.subCategory === subCategoryFilter);
      const matchRegion = regionFilter === "전체" || place.region === regionFilter;
      return matchMain && matchSub && matchRegion;
    }).sort((a, b) => {
      const selectedDifference = Number(mustGoSpots.includes(b.id)) - Number(mustGoSpots.includes(a.id));
      if (selectedDifference) return selectedDifference;
      return REGION_ORDER.indexOf(a.region) - REGION_ORDER.indexOf(b.region) || a.name.localeCompare(b.name, "ko");
    });
  }, [mainCategoryFilter, mustGoSpots, places, regionFilter, subCategoryFilter]);
  const regionOptions = useMemo(() => ["전체", ...Array.from(new Set(places.filter((place) => mainCategoryFilter === "all" || place.category === mainCategoryFilter).map((place) => place.region))).sort((a, b) => REGION_ORDER.indexOf(a) - REGION_ORDER.indexOf(b))], [mainCategoryFilter, places]);

  const generatedCoursePlaces = useMemo(() => generatedCourse?.filter(isPlaceCourseItem) ?? [], [generatedCourse]);
  const mobileMapPlaces = useMemo(() => {
    const selectedPlaces = mustGoSpots.map((id) => places.find((place) => place.id === id)).filter((place): place is Place => Boolean(place));
    const candidates = generatedCoursePlaces.length > 0 ? generatedCoursePlaces : selectedPlaces;
    return (candidates.length > 0 ? candidates : places).slice(0, 8);
  }, [generatedCoursePlaces, mustGoSpots, places]);
  const mobileSelectedMapPlace = useMemo(() => {
    return mobileMapPlaces.find((place) => place.id === selectedMapPlaceId) ?? mobileMapPlaces[0] ?? places[0] ?? KTO_MOCK_DATA[0];
  }, [mobileMapPlaces, places, selectedMapPlaceId]);

  useEffect(() => {
    if (!mobileSelectedMapPlace || weatherByPlaceId[mobileSelectedMapPlace.id]) return;
    const place = mobileSelectedMapPlace;
    let canceled = false;

    async function loadWeather() {
      try {
        const response = await fetch(`/api/wellness/weather?lat=${place.lat}&lng=${place.lng}`);
        if (!response.ok) throw new Error(`Failed to load weather: ${response.status}`);
        const data = (await response.json()) as WeatherSummary;
        if (!canceled) {
          setWeatherByPlaceId((current) => ({ ...current, [place.id]: data }));
        }
      } catch {
        if (!canceled) {
          setWeatherByPlaceId((current) => ({ ...current, [place.id]: createWeatherFallback() }));
        }
      }
    }

    loadWeather();

    return () => {
      canceled = true;
    };
  }, [mobileSelectedMapPlace, weatherByPlaceId]);

  useEffect(() => {
    const missingPlaces = generatedCoursePlaces
      .filter((place) => !weatherByPlaceId[place.id])
      .slice(0, 5);
    if (missingPlaces.length === 0) return;

    let canceled = false;

    async function loadCourseWeather() {
      const updates: Record<string, WeatherSummary> = {};

      await Promise.all(
        missingPlaces.map(async (place) => {
          try {
            const response = await fetch(`/api/wellness/weather?lat=${place.lat}&lng=${place.lng}`);
            if (!response.ok) throw new Error(`Failed to load weather: ${response.status}`);
            updates[place.id] = (await response.json()) as WeatherSummary;
          } catch {
            updates[place.id] = createWeatherFallback();
          }
        }),
      );

      if (!canceled) {
        setWeatherByPlaceId((current) => ({ ...current, ...updates }));
      }
    }

    loadCourseWeather();

    return () => {
      canceled = true;
    };
  }, [generatedCoursePlaces, weatherByPlaceId]);

  const toggleMustGoSpot = (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    setSelectedMapPlaceId(id);
    if (mustGoSpots.length === 1 && mustGoSpots.includes(id) && planMode === "selected-only") {
      setPlanMode("selected-with-recommendations");
    }
    setMustGoSpots((prev) => {
      if (prev.includes(id)) return prev.filter((placeId) => placeId !== id);
      if (prev.length >= 5) {
        alert("꼭 가고 싶은 장소는 최대 5개까지 선택 가능합니다.");
        return prev;
      }
      return [...prev, id];
    });
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("이 기기에서는 현재 위치를 사용할 수 없습니다.");
      return;
    }
    setIsResolvingOrigin(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setTransitOrigin({ name: "현재 위치", lat: position.coords.latitude, lng: position.coords.longitude });
        setIsResolvingOrigin(false);
      },
      () => {
        setIsResolvingOrigin(false);
        alert("현재 위치를 가져오지 못했습니다. 위치 권한을 허용하거나 출발지를 직접 입력해주세요.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const resolveOriginQuery = async () => {
    if (!originQuery.trim()) return;
    setIsResolvingOrigin(true);
    try {
      const response = await fetch(`/api/wellness/transit/geocode?query=${encodeURIComponent(originQuery.trim())}`);
      const origin = await response.json() as TransitOrigin & { error?: string };
      if (!response.ok || !Number.isFinite(origin.lat) || !Number.isFinite(origin.lng)) throw new Error(origin.error);
      setTransitOrigin(origin);
    } catch {
      alert("출발지를 찾지 못했습니다. 주소나 장소 이름을 더 자세히 입력해주세요.");
    } finally {
      setIsResolvingOrigin(false);
    }
  };

  const loadTransitRoutes = async (course: CourseItem[], origin: TransitOrigin) => {
    const destinations = course.filter(isPlaceCourseItem);
    const requests = destinations.map((destination, index) => {
      const start = index === 0 ? origin : destinations[index - 1];
      const params = new URLSearchParams({
        startLat: String(start.lat), startLng: String(start.lng), startName: start.name,
        endLat: String(destination.lat), endLng: String(destination.lng), endName: destination.name,
      });
      return fetch(`/api/wellness/transit?${params}`).then(async (response) => (await response.json()) as TransitRoute);
    });
    const routes = await Promise.allSettled(requests);
    const resolved = routes.map((result) => result.status === "fulfilled" ? result.value : { status: "unavailable", message: "대중교통 정보를 불러오지 못했습니다." } satisfies TransitRoute);
    setOriginTransit(resolved[0] ?? null);
    setTransitLegs(Object.fromEntries(resolved.slice(1).map((route, index) => [index, route])));
  };

  const updateGeneratedCoursePlaces = (nextPlaces: Place[]) => {
    const nextOrder = nextPlaces.map((place) => place.id);
    if (nextOrder.length === 0) {
      setGeneratedCourse(null);
      setMustGoSpots([]);
      setOriginTransit(null);
      setTransitLegs({});
      return;
    }

    const course = buildWellnessCourse({ places: nextPlaces, mustGoIds: nextOrder, planMode: "selected-only", theme: recommendationTheme, travelMode, startTime: combineDepartureDateTime(departureDate, departureClock), manualOrderIds: nextOrder, weatherByPlaceId });
    setPlanMode("selected-only");
    setMustGoSpots(nextOrder);
    setGeneratedCourse(course);
    setOriginTransit(null);
    setTransitLegs({});
    if (travelMode === "walk" && transitOrigin) void loadTransitRoutes(course, transitOrigin);
  };

  const moveGeneratedPlace = (placeId: string, direction: -1 | 1) => {
    const currentIndex = generatedCoursePlaces.findIndex((place) => place.id === placeId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= generatedCoursePlaces.length) return;
    const nextPlaces = [...generatedCoursePlaces];
    [nextPlaces[currentIndex], nextPlaces[nextIndex]] = [nextPlaces[nextIndex], nextPlaces[currentIndex]];
    updateGeneratedCoursePlaces(nextPlaces);
  };

  const removeGeneratedPlace = (placeId: string) => {
    updateGeneratedCoursePlaces(generatedCoursePlaces.filter((place) => place.id !== placeId));
  };

  const generateCourse = async () => {
    if (travelMode === "walk" && !transitOrigin) {
      alert("대중교통 경로를 만들려면 현재 위치를 사용하거나 출발지를 직접 입력해주세요.");
      return;
    }
    setIsPlanning(true);
    const planningStartedAt = Date.now();
    const courseWeather = await loadCourseCandidateWeather({
      places,
      mustGoIds: mustGoSpots,
      knownWeather: weatherByPlaceId,
      planMode,
    });
    const nextWeatherByPlaceId = { ...weatherByPlaceId, ...courseWeather };
    setWeatherByPlaceId(nextWeatherByPlaceId);
    const remainingDelay = Math.max(0, 900 - (Date.now() - planningStartedAt));

    setTimeout(() => {
      const course = buildWellnessCourse({ places, mustGoIds: mustGoSpots, planMode, theme: recommendationTheme, travelMode, startTime: combineDepartureDateTime(departureDate, departureClock), manualOrderIds: planMode === "selected-only" ? mustGoSpots : undefined, weatherByPlaceId: nextWeatherByPlaceId });
      setGeneratedCourse(course);
      setOriginTransit(null);
      setTransitLegs({});
      if (travelMode === "walk" && transitOrigin) void loadTransitRoutes(course, transitOrigin);
      setIsPlanning(false);
      setActiveTab("map");
    }, remainingDelay);
  };

  const openPlanner = () => {
    setPlanMode(mustGoSpots.length > 0 ? "selected-only" : "selected-with-recommendations");
    setActiveTab("planner");
  };

  const saveGeneratedCourse = async () => {
    if (!generatedCourse) return;
    if (!sessionUser) {
      alert("루트를 저장하려면 카카오 로그인이 필요합니다.");
      setActiveTab("login");
      return;
    }

    setIsSavingCourse(true);
    try {
      const response = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: { course: generatedCourse, travelMode, planMode, mustGoSpots, origin: transitOrigin, originTransit, transitLegs, departureDate, departureClock } }),
      });
      const data = await response.json() as { plan?: SavedPlan; error?: string };
      if (!response.ok || !data.plan) throw new Error(data.error || "Failed to save route");
      setSavedPlans((current) => [data.plan!, ...current]);
      alert("원스톱 루트가 저장되었습니다.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "루트를 저장하지 못했습니다.");
    } finally {
      setIsSavingCourse(false);
    }
  };

  const openSavedPlan = (plan: SavedPlan) => {
    setGeneratedCourse(plan.course);
    setTravelMode(plan.travelMode);
    setPlanMode(plan.planMode);
    setMustGoSpots(plan.mustGoSpots);
    setTransitOrigin(plan.origin);
    setOriginTransit(plan.originTransit);
    setTransitLegs(plan.transitLegs);
    setDepartureDate(plan.departureDate);
    setDepartureClock(plan.departureClock);
    setSelectedMapPlaceId(plan.course.find(isPlaceCourseItem)?.id ?? null);
    if (plan.travelMode === "walk" && plan.origin && !plan.originTransit) void loadTransitRoutes(plan.course, plan.origin);
    setActiveTab("map");
  };

  const originTravelMinutes = travelMode === "walk" && originTransit?.status === "ready" ? originTransit.durationMinutes ?? 0 : 0;
  const scheduleContent = (
    <section className="mt-6 border-t border-white/60 pt-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-black text-slate-800">생성된 일정</h3>
        {generatedCourse && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setIsRecommendationOpen(true)} className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-[11px] font-black text-emerald-700">추천 이유</button>
            <button type="button" onClick={() => void saveGeneratedCourse()} disabled={isSavingCourse} className="glass-button rounded-xl p-2 disabled:cursor-wait disabled:opacity-60" aria-label="루트 저장"><Save size={16} style={{ color: GW_BLUE }} /></button>
          </div>
        )}
      </div>
      {generatedCourse ? (
        <div className="space-y-4">
          {travelMode === "walk" && transitOrigin && (
            <>
              <article className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                <span className="rounded-lg bg-white/70 px-2 py-1 text-[10px] font-black" style={{ color: GW_BLUE }}>{departureClock} 출발</span>
                <h4 className="mt-3 text-sm font-black text-slate-800">{transitOrigin.name}</h4>
                <p className="mt-2 text-[11px] font-bold text-emerald-700">대중교통 출발지</p>
              </article>
              <div className="ml-3 rounded-2xl border border-dashed border-emerald-200 bg-white/50 p-3">
                <p className="flex items-start gap-1.5 text-[10px] font-black text-slate-600"><Bus size={13} className="mt-0.5 shrink-0" style={{ color: GW_GREEN }} />{transitOrigin.name} → {generatedCoursePlaces[0]?.name ?? "첫 일정"}</p>
                <TransitRouteInfo route={originTransit} />
              </div>
            </>
          )}
          {generatedCourse.map((item, index) => (
            item.type !== "travel" ? (
              <article key={`${item.id}-${index}`} onClick={() => setSelectedMapPlaceId(item.id)} className={`cursor-pointer rounded-2xl border bg-white/50 p-4 transition-all ${mobileSelectedMapPlace.id === item.id ? "border-blue-600/80" : "border-white/70"}`}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-lg bg-white/70 px-2 py-1 text-[10px] font-black" style={{ color: GW_BLUE }}>{shiftTimeRange(item.timeRange, originTravelMinutes)}</span>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={(event) => { event.stopPropagation(); removeGeneratedPlace(item.id); }} className="rounded-lg border border-white/80 bg-white/70 p-1.5 text-slate-500" aria-label={`${item.name} 일정에서 삭제`}><X size={13} /></button>
                    {travelMode === "drive" && <button type="button" onClick={(event) => { event.stopPropagation(); handleKakaoMapSearch(item.name); }} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-black text-white" style={{ backgroundColor: GW_BLUE }}><Search size={11} /> 카카오맵</button>}
                  </div>
                </div>
                <button type="button" onClick={() => setSelectedMapPlaceId(item.id)} className="text-left text-sm font-black text-slate-800">{item.name}</button>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-slate-500">
                  <span>{item.category === "food" ? "건강 맛집" : item.category === "stay" ? "힐링 숙소" : "웰니스 스팟"} · {item.region}</span>
                </div>
                <div className="mt-3 flex justify-end gap-1">
                  <button type="button" onClick={(event) => { event.stopPropagation(); moveGeneratedPlace(item.id, -1); }} disabled={generatedCoursePlaces.findIndex((place) => place.id === item.id) === 0} className="rounded-lg border border-white/80 bg-white/70 p-1.5 text-slate-500 disabled:opacity-30" aria-label={`${item.name} 위로 이동`}><ChevronUp size={13} /></button>
                  <button type="button" onClick={(event) => { event.stopPropagation(); moveGeneratedPlace(item.id, 1); }} disabled={generatedCoursePlaces.findIndex((place) => place.id === item.id) === generatedCoursePlaces.length - 1} className="rounded-lg border border-white/80 bg-white/70 p-1.5 text-slate-500 disabled:opacity-30" aria-label={`${item.name} 아래로 이동`}><ChevronDown size={13} /></button>
                </div>
              </article>
            ) : (
              <div key={`travel-${index}`} className="ml-3 min-w-0 rounded-2xl border border-dashed border-white/70 bg-white/50 p-3">
                {item.travelType === "walk" ? (
                  <TransitRouteInfo route={transitLegs[generatedCourse.slice(0, index).filter((courseItem) => courseItem.type === "travel").length]} compact />
                ) : (
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-600">
                    <Car size={13} style={{ color: GW_BLUE }} /><span>이동 약 {item.duration}분 예상</span>
                    {getDrivingRouteUrl(index) && <a href={getDrivingRouteUrl(index) ?? undefined} target="_blank" rel="noreferrer" className="rounded-lg bg-blue-50 px-2 py-1 text-blue-700">자동차 길찾기</a>}
                  </div>
                )}
              </div>
            )
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-white/40 px-4 py-8 text-center">
          <Map size={30} className="mx-auto mb-3 text-slate-300" />
          <p className="text-[12px] font-black text-slate-600">아직 생성된 루트가 없습니다.</p>
          <p className="mt-2 text-[11px] font-medium text-slate-500">계획 조건을 고른 뒤 원스톱 루트를 생성하세요.</p>
        </div>
      )}
    </section>
  );

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
      <div className="relative mx-auto flex min-h-screen w-full overflow-hidden bg-slate-50 font-sans lg:bg-[#f7fbf8]">
        <style>{styles}</style>
        <div className="animate-blob absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full opacity-30 mix-blend-multiply blur-3xl" style={{ backgroundColor: GW_GREEN }} />
        <div className="animate-blob animation-delay-2000 absolute right-[-10%] top-[20%] h-96 w-96 rounded-full opacity-30 mix-blend-multiply blur-3xl" style={{ backgroundColor: GW_BLUE }} />

        <div className="relative z-10 mx-auto grid w-full max-w-md items-center gap-8 p-8 text-center lg:max-w-6xl lg:grid-cols-[1fr_380px] lg:gap-16 lg:p-12 lg:text-left">
          <section className="lg:pr-8">
            <div className="glass-panel mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[2.5rem] border-white lg:mx-0 lg:h-28 lg:w-28">
              <Leaf size={48} style={{ color: GW_GREEN }} />
            </div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.2em]" style={{ color: GW_GREEN }}>
              강원특별자치도 웰니스 루트
            </p>
            <a href="https://wellness-paldo-gangsan.vercel.app" className="mb-4 block text-4xl font-black tracking-tight lg:text-6xl lg:leading-tight" style={{ color: GW_BLUE }}>
              웰니스 강원
            </a>
            <p className="mx-auto mb-10 max-w-md text-sm font-bold leading-7 tracking-wide opacity-80 lg:mx-0 lg:text-base" style={{ color: GW_BLUE }}>
              자연·맛집·숙소가 함께하는 원스톱 치유 여행
            </p>
          </section>

          <section className="glass-panel mx-auto w-full max-w-[360px] rounded-[2rem] p-6 text-center lg:p-8">
            <h2 className="mb-2 text-xl font-black text-slate-900">로그인</h2>
            <p className="mb-6 text-xs font-bold text-slate-500">저장한 루트와 장소 입력 기능을 이용할 수 있습니다.</p>
            <div className="w-full space-y-4">
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
            <Link
              href="/desktop"
              className="block w-full text-xs font-bold text-slate-500 underline underline-offset-4 transition-colors hover:text-slate-800"
            >
              모니터용 화면 보기
            </Link>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative min-h-screen w-full overflow-x-hidden bg-slate-50/50 font-sans text-slate-800 ${activeTab === "profile" ? "mx-auto max-w-6xl shadow-none" : "max-w-none"}`}>
      <style>{styles}</style>
      <div className="animate-blob pointer-events-none fixed left-[-15%] top-[-5%] h-80 w-80 rounded-full opacity-20 mix-blend-multiply blur-3xl" style={{ backgroundColor: GW_GREEN }} />
      <div className="animate-blob animation-delay-2000 pointer-events-none fixed right-[-10%] top-[40%] h-72 w-72 rounded-full opacity-15 mix-blend-multiply blur-3xl" style={{ backgroundColor: GW_BLUE }} />

      <main className="relative z-10 pb-32">
        <header className="glass-nav sticky top-0 z-40 rounded-b-[2rem] px-6 pb-3 pt-3">
          <a href="https://wellness-paldo-gangsan.vercel.app" className="flex items-center text-2xl font-black tracking-tighter" style={{ color: GW_BLUE }}>
            <Leaf className="mr-2" size={24} style={{ color: GW_GREEN }} /> 웰니스 강원
          </a>
        </header>

        {activeTab === "home" && (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-black tracking-tight" style={{ color: GW_BLUE }}>
                힐링스팟·맛집·숙소를 원스톱으로
              </h2>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2 min-[390px]:grid-cols-4">
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
                    setRegionFilter("전체");
                  }}
                  className={`min-w-0 rounded-2xl border px-1 py-2.5 text-[11px] font-black transition-all ${
                    mainCategoryFilter === category.id ? "border-transparent text-white shadow-md" : "glass-button text-slate-600"
                  }`}
                  style={mainCategoryFilter === category.id ? { backgroundColor: GW_BLUE } : {}}
                >
                  {category.label}
                </button>
              ))}
            </div>

            {mainCategoryFilter !== "all" && (
              <div className="mb-2 flex flex-wrap gap-2 pb-4">
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
            )}

            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-black text-slate-800">장소 탐색</h3>
              <div className="flex flex-wrap items-center gap-2">
              <label className="glass-button flex items-center gap-2 rounded-2xl px-3 py-2 text-[11px] font-black text-slate-600">지역
                <select value={regionFilter} onChange={(event) => setRegionFilter(event.target.value)} className="bg-transparent text-[11px] font-black outline-none">
                  {regionOptions.map((region) => <option key={region} value={region}>{region === "전체" ? "전체" : `${region} 지역`}</option>)}
                </select>
              </label>
              <span className="rounded-xl bg-emerald-50 px-2 py-2 text-[11px] font-black text-emerald-700">{filteredPlaces.length}개</span>
              <button
                type="button"
                onClick={() => { setMainCategoryFilter("all"); setSubCategoryFilter("전체"); setRegionFilter("전체"); }}
                className="glass-button flex items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-black text-slate-600"
              >
                <RefreshCw size={12} /> 초기화
              </button>
              </div>
            </div>

            <div className="space-y-4">
              {filteredPlaces.map((place) => (
                <div key={place.id} onClick={() => { setSelectedMapPlaceId(place.id); setViewingPlace(place); }} className="glass-panel group relative cursor-pointer rounded-[2rem] p-5 transition-all hover:border-white">
                  <div className="flex min-w-0 items-start space-x-4">
                    {place.image ? (
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); setImagePlace(place); }}
                        className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl shadow-[inset_0_2px_5px_rgba(255,255,255,0.8)]"
                        aria-label={`${place.name} 대표 이미지 확대`}
                      >
                        <img src={place.image} alt="" className="h-full w-full object-cover" />
                      </button>
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/60 shadow-[inset_0_2px_5px_rgba(255,255,255,0.8)]" style={{ color: GW_GREEN }}>
                        {place.category === "food" ? <Utensils size={24} /> : place.category === "stay" ? <BedDouble size={24} /> : <Leaf size={24} />}
                      </div>
                    )}
                    <div className="min-w-0 flex-1 pr-8">
                      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="shrink-0 whitespace-nowrap rounded-md border border-white/50 bg-white/60 px-2 py-0.5 text-[9px] font-black" style={{ color: GW_BLUE }}>
                          강원 {place.region}
                        </span>
                        <span className="shrink-0 whitespace-nowrap rounded-md border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                          {place.category === "food" ? "맛집" : place.category === "stay" ? "숙소" : "스팟"}
                        </span>
                      </div>
                      <h4 className="mb-1 text-[14px] font-bold leading-tight text-slate-800">{place.name}</h4>
                      <div>
                        <p className="mb-0.5 text-[9px] font-black text-slate-400">장소 설명</p>
                        <p className="line-clamp-1 text-[11px] font-medium text-slate-500">{place.desc}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(event) => toggleMustGoSpot(event, place.id)}
                    aria-label={`${place.name} ${mustGoSpots.includes(place.id) ? "선택 해제" : "선택"}`}
                    aria-pressed={mustGoSpots.includes(place.id)}
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
            <h2 className="mb-6 text-2xl font-black tracking-tight" style={{ color: GW_BLUE }}>나만의 여행 계획</h2>
            <section className="glass-panel rounded-[2rem] p-6">
              <h3 className="mb-2 flex items-center text-sm font-black text-slate-800">
                <CheckCircle2 size={16} className="mr-2" style={{ color: GW_GREEN }} /> 선택한 장소 {mustGoSpots.length}/5
              </h3>
              <p className="mb-4 text-[11px] font-medium leading-5 text-slate-500">
                {mustGoSpots.length === 0 ? "선택하지 않으면 테마를 기준으로 앱이 3~5곳을 추천합니다." : "탐색 탭에서 체크한 장소를 우선 반영합니다."}
              </p>
              {mustGoSpots.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {mustGoSpots.map((id) => {
                    const place = places.find((item) => item.id === id);
                    return place ? <button key={id} type="button" onClick={(event) => toggleMustGoSpot(event, id)} className="glass-button flex items-center rounded-full px-3 py-1.5 text-[10px] font-bold" aria-label={`${place.name} 선택 해제`}>{place.name}<X size={12} className="ml-1 text-slate-400" /></button> : null;
                  })}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <button type="button" disabled={mustGoSpots.length === 0} onClick={() => setPlanMode("selected-only")} className={`rounded-2xl border-2 px-3 py-3 text-[11px] font-black transition-all disabled:cursor-not-allowed disabled:opacity-45 ${planMode === "selected-only" ? "bg-white/70" : "border-transparent bg-white/35 text-slate-400"}`} style={planMode === "selected-only" ? { borderColor: GW_GREEN, color: GW_GREEN } : {}}>선택한 장소만</button>
                <button type="button" onClick={() => setPlanMode("selected-with-recommendations")} className={`rounded-2xl border-2 px-3 py-3 text-[11px] font-black transition-all ${planMode === "selected-with-recommendations" ? "bg-white/70" : "border-transparent bg-white/35 text-slate-400"}`} style={planMode === "selected-with-recommendations" ? { borderColor: GW_BLUE, color: GW_BLUE } : {}}>앱 추천 포함</button>
              </div>
              {planMode === "selected-with-recommendations" && (
                <div className="mt-5">
                  <p className="mb-2 text-[11px] font-black text-slate-700">원하는 테마</p>
                  <div className="flex flex-wrap gap-2">
                    {routeThemes.map((theme) => <button key={theme.id} type="button" onClick={() => setRecommendationTheme(theme.id)} className={`rounded-full border px-3 py-2 text-[11px] font-black ${recommendationTheme === theme.id ? "text-white" : "border-white/70 bg-white/45 text-slate-500"}`} style={recommendationTheme === theme.id ? { backgroundColor: GW_GREEN, borderColor: GW_GREEN } : {}}>{theme.label}</button>)}
                  </div>
                </div>
              )}

              <section className="mt-6 border-t border-white/60 pt-5">
                <h3 className="mb-4 flex items-center text-sm font-black text-slate-800"><Navigation size={16} className="mr-2" style={{ color: GW_GREEN }} /> 이동 수단</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setTravelMode("walk")} className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 transition-all ${travelMode === "walk" ? "bg-white/60" : "glass-button border-transparent text-slate-400"}`} style={travelMode === "walk" ? { borderColor: GW_GREEN, color: GW_GREEN } : {}}><Bus size={24} /><span className="text-[11px] font-black">대중교통</span></button>
                  <button type="button" onClick={() => setTravelMode("drive")} className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 transition-all ${travelMode === "drive" ? "bg-white/60" : "glass-button border-transparent text-slate-400"}`} style={travelMode === "drive" ? { borderColor: GW_BLUE, color: GW_BLUE } : {}}><Car size={24} /><span className="text-[11px] font-black">자동차</span></button>
                </div>
              </section>

              {travelMode === "walk" && (
                <section className="mt-6 border-t border-white/60 pt-5">
                  <h3 className="mb-1 flex items-center text-sm font-black text-slate-800"><Bus size={16} className="mr-2" style={{ color: GW_GREEN }} /> 대중교통 출발 설정</h3>
                  <p className="mb-4 text-[11px] font-medium leading-5 text-slate-500">출발 위치부터 실제 버스·지하철 경로를 조회합니다.</p>
                  <button type="button" onClick={useCurrentLocation} disabled={isResolvingOrigin} className="mb-3 flex w-full items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-[11px] font-black text-emerald-700 disabled:opacity-60"><MapPin size={15} className="mr-2" />{isResolvingOrigin ? "현재 위치 확인 중..." : transitOrigin?.name === "현재 위치" ? "현재 위치 사용 중" : "현재 위치 사용"}</button>
                  <div className="flex gap-2">
                    <input value={originQuery} onChange={(event) => setOriginQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void resolveOriginQuery(); }} placeholder="출발지 주소 또는 장소명" className="min-w-0 flex-1 rounded-2xl border border-white/70 bg-white/70 px-3 py-3 text-[11px] font-bold text-slate-700 outline-none placeholder:text-slate-400" />
                    <button type="button" onClick={() => void resolveOriginQuery()} disabled={isResolvingOrigin || !originQuery.trim()} className="rounded-2xl px-4 text-[11px] font-black text-white disabled:bg-slate-300" style={{ backgroundColor: GW_BLUE }}>검색</button>
                  </div>
                  {transitOrigin && <p className="mt-3 rounded-xl bg-white/60 px-3 py-2 text-[10px] font-black text-slate-600"><MapPin size={12} className="mr-1 inline" style={{ color: GW_GREEN }} /> 출발: {transitOrigin.name}</p>}
                  <div className="mt-4 grid grid-cols-1 gap-3">
                    <label className="block min-w-0 text-[11px] font-black text-slate-700">출발 날짜<input type="date" value={departureDate} onChange={(event) => setDepartureDate(event.target.value)} className="mt-2 w-full min-w-0 rounded-2xl border border-white/70 bg-white/70 px-3 py-3 text-[11px] font-bold text-slate-700 outline-none" /></label>
                    <label className="block min-w-0 text-[11px] font-black text-slate-700">출발 시간<select value={departureClock} onChange={(event) => setDepartureClock(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/70 bg-white/70 px-3 py-3 text-[11px] font-bold text-slate-700 outline-none">{DEPARTURE_TIME_OPTIONS.map((time) => <option key={time} value={time}>{time}</option>)}</select></label>
                  </div>
                </section>
              )}

              <button type="button" onClick={generateCourse} disabled={isPlanning} className="mt-6 flex w-full items-center justify-center rounded-2xl py-5 text-sm font-black text-white shadow-lg transition-all active:scale-95 disabled:bg-slate-300 disabled:shadow-none" style={!isPlanning ? { backgroundColor: GW_BLUE } : {}}>
                {isPlanning ? <><Loader2 size={18} className="mr-2 animate-spin" /> 원스톱 루트 생성 중...</> : "원스톱 루트 생성하기"}
              </button>
            </section>
          </div>
        )}

        {activeTab === "map" && (
          <div className="p-6 pb-24">
            {!generatedCourse ? (
              <div className="space-y-5">
                <div className="mb-2 px-2">
                  <h2 className="text-2xl font-black tracking-tight" style={{ color: GW_BLUE }}>
                    웰니스 지도
                  </h2>
                  <p className="mt-1 text-[11px] font-bold leading-5 text-slate-500">
                    계획을 생성하면 선택한 장소의 이동 순서와 연결선을 확인할 수 있습니다.
                  </p>
                </div>
                <div className="glass-panel rounded-[2rem] p-8 text-center">
                  <Map size={34} className="mx-auto mb-4 text-slate-300" />
                  <p className="text-[14px] font-black text-slate-700">아직 생성된 경로가 없습니다.</p>
                  <p className="mt-2 text-[12px] font-bold leading-5 text-slate-500">
                    계획 탭에서 원스톱 루트를 생성하면 이곳에 경로가 표시됩니다.
                  </p>
                  <button onClick={openPlanner} className="mt-4 rounded-full bg-white/80 px-6 py-3 text-xs font-black shadow-sm backdrop-blur-md" style={{ color: GW_GREEN }}>
                    플래너로 이동
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="mb-2 flex items-end justify-between px-2">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight" style={{ color: GW_BLUE }}>
                      원스톱 치유 루트
                    </h2>
                    <p className="mt-1 text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: GW_GREEN }}>
                      {travelMode === "walk" ? "대중교통 모드" : "자동차 모드"} · 웰니스+맛집+숙소 완벽 연계
                    </p>
                  </div>
                </div>

                <MobileKakaoMapPanel
                  places={mobileMapPlaces}
                  selectedPlace={mobileSelectedMapPlace}
                  generatedCourse={generatedCourse}
                  weather={weatherByPlaceId[mobileSelectedMapPlace.id]}
                  onSelectPlace={(place) => setSelectedMapPlaceId(place.id)}
                />

                {scheduleContent}
              </div>
            )}
          </div>
        )}

        {activeTab === "profile" && (
          <div className="mx-auto space-y-6 p-6 lg:max-w-6xl lg:p-10">
            <div className="grid min-w-0 gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
              <section className="space-y-4">
                <div className="glass-panel flex items-center space-x-5 rounded-[2.5rem] p-6 lg:flex-col lg:items-start lg:space-x-0 lg:space-y-6 lg:p-8">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl text-white shadow-inner lg:h-20 lg:w-20" style={{ backgroundImage: `linear-gradient(to bottom right, ${GW_GREEN}, ${GW_BLUE})` }}>
                    {sessionUser?.profileImage ? (
                      <div
                        aria-hidden="true"
                        className="h-full w-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${sessionUser.profileImage})` }}
                      />
                    ) : (
                      <User size={28} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="mb-2 text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: GW_GREEN }}>
                      My Wellness Route
                    </p>
                    <h3 className="text-lg font-black lg:text-3xl" style={{ color: GW_BLUE }}>
                      {sessionUser ? `${sessionUser.nickname}님` : "카카오 여행자님"}
                    </h3>
                    <p className="mt-2 inline-block rounded border border-white bg-white/60 px-2 py-0.5 text-[11px] font-bold" style={{ color: GW_GREEN }}>
                      {sessionUser ? "카카오 로그인 연결됨" : "게스트 모드"}
                    </p>
                  </div>
                </div>

                {sessionUser ? (
                  <button onClick={handleLogout} className="glass-panel flex w-full items-center justify-center rounded-2xl px-4 py-4 text-[12px] font-black text-slate-600">
                    <LogOut size={16} className="mr-2" />
                    로그아웃
                  </button>
                ) : (
                  <button onClick={handleKakaoLogin} className="flex w-full items-center justify-center rounded-2xl bg-[#FEE500] px-4 py-4 text-[12px] font-black text-black">
                    <MessageCircle size={16} className="mr-2" fill="currentColor" />
                    카카오 로그인
                  </button>
                )}
              </section>

              <section className="glass-panel min-w-0 rounded-[2rem] p-5 lg:min-h-[360px] lg:p-8">
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="mb-2 text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: GW_GREEN }}>
                      Saved Routes
                    </p>
                    <h4 className="text-lg font-black text-slate-800 lg:text-2xl">저장된 원스톱 루트 ({savedPlans.length})</h4>
                  </div>
                </div>
                <div className="space-y-4">
                  {savedPlans.length > 0 ? savedPlans.map((plan) => (
                    <div key={plan.id} className="rounded-[1.5rem] border border-white/70 bg-white/50 p-5 shadow-sm">
                      <div className="mb-4 flex items-center justify-between">
                        <span className="rounded-md border border-white/60 bg-white/50 px-2.5 py-1 text-[10px] font-black text-slate-500">{plan.date} 생성</span>
                        <button onClick={() => openSavedPlan(plan)} className="text-[10px] font-black" style={{ color: GW_BLUE }}>
                          루트 보기 &rarr;
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {plan.course.filter(isPlaceCourseItem).map((place) => (
                          <div key={`${plan.id}-${place.id}`} className="min-w-0 rounded-xl border border-white/80 bg-white/60 px-3 py-2.5 text-center shadow-sm">
                            <span className="mb-0.5 block text-[8px] font-bold text-emerald-600">{place.category === "food" ? "맛집" : place.category === "stay" ? "숙소" : "스팟"}</span>
                            <span className="block truncate text-[10px] font-bold text-slate-700">{place.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )) : (
                    <div className="flex min-h-[180px] items-center justify-center rounded-[2rem] border border-dashed border-white/80 bg-white/45 text-center lg:min-h-[240px]">
                      <p className="text-[11px] font-bold text-slate-500">저장된 원스톱 루트가 없습니다.</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </main>

      {isRecommendationOpen && generatedCourse && (
        <div className="fixed inset-0 z-[110] flex touch-none items-center justify-center overflow-hidden bg-black/40 p-4" onClick={() => setIsRecommendationOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="mobile-recommendation-title" className="max-h-[calc(100dvh-2rem)] w-full max-w-sm touch-pan-y overflow-y-auto overscroll-contain rounded-[2rem] bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <h3 id="mobile-recommendation-title" className="text-lg font-black text-slate-800">추천 이유</h3>
              <button type="button" autoFocus onClick={() => setIsRecommendationOpen(false)} className="rounded-xl border border-slate-200 p-2 text-slate-600" aria-label="추천 이유 닫기"><X size={18} /></button>
            </div>
            <div className="mt-5 space-y-3">
              {generatedCoursePlaces.map((place, index) => (
                <article key={`${place.id}-${index}`} className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                  <h4 className="text-[12px] font-black text-slate-800">{index + 1}. {place.name}</h4>
                  <p className="mt-2 text-[11px] font-medium leading-5 text-slate-600">{place.recommendationReason}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {imagePlace && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-5" onClick={() => setImagePlace(null)}>
          <div className="relative max-h-full max-w-full" onClick={(event) => event.stopPropagation()}>
            <img src={imagePlace.image} alt={`${imagePlace.name} 대표 이미지`} className="max-h-[78dvh] max-w-full rounded-3xl object-contain shadow-2xl" />
            <div className="mt-3 flex items-center justify-between gap-3 text-white">
              <p className="min-w-0 truncate text-sm font-black">{imagePlace.name}</p>
              <button onClick={() => setImagePlace(null)} className="shrink-0 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-800">닫기</button>
            </div>
          </div>
        </div>
      )}

      {viewingPlace && (
        <div className="fixed inset-0 z-[100] flex touch-none items-center justify-center overflow-hidden bg-slate-900/20 p-4 backdrop-blur-sm">
          <div className="glass-panel max-h-[calc(100dvh-2rem)] w-full max-w-sm touch-pan-y overflow-y-auto overscroll-contain rounded-[3rem] border-white/80 !bg-white/70 shadow-2xl">
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
              <p className="mb-1 text-[10px] font-black text-slate-400">장소 설명</p>
              <p className="mb-4 text-[13px] font-medium leading-relaxed text-slate-600">{viewingPlace.desc}</p>
              <WeatherInsightCard weather={weatherByPlaceId[viewingPlace.id]} compact />
              <p className="mb-8 flex items-center text-[11px] font-bold text-slate-500">
                <MapPin size={14} className="mr-1.5" style={{ color: GW_GREEN }} /> {viewingPlace.addr}
              </p>

              <button
                onClick={(event) => {
                  toggleMustGoSpot(event, viewingPlace.id);
                  setViewingPlace(null);
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

      <nav
        className="glass-nav fixed bottom-0 left-0 right-0 z-[90] flex w-full items-center justify-around rounded-t-[2rem] px-3 pt-2"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        {[
          { id: "home", icon: <Search size={22} />, label: "탐색" },
          { id: "planner", icon: <NotebookPen size={22} />, label: "계획" },
          { id: "map", icon: <Map size={22} />, label: "경로" },
          { id: "profile", icon: <User size={22} />, label: "MY" },
        ].map((tab) => (
          <button
            key={tab.id}
            aria-label={tab.label}
            onClick={() => { if (tab.id === "planner") openPlanner(); else setActiveTab(tab.id === "profile" && !sessionUser ? "login" : tab.id as ActiveTab); }}
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
    resort: "🏨 호텔·리조트",
    wellness: "🧘 웰니스센터",
    healing: "🌲 힐링스테이",
    hotel: "🏨 호텔",
  };

  return labels[category];
}

function TransitRouteInfo({ route, compact = false }: { route: TransitRoute | null | undefined; compact?: boolean }) {
  if (!route) return <p className="mt-2 text-[10px] font-bold text-slate-400">대중교통 경로를 조회하고 있습니다.</p>;
  if (route.status !== "ready") return <p className="mt-2 text-[10px] font-bold text-slate-400">{route.message ?? "대중교통 정보를 확인할 수 없습니다."}</p>;

  const modeLabel = route.mode === "BUS" ? "버스" : route.mode === "SUBWAY" ? "지하철" : route.mode === "BUS_AND_SUBWAY" ? "버스·지하철" : "대중교통";
  return (
    <div className={`mt-2 flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-600 ${compact ? "pl-1" : ""}`}>
      <span>{modeLabel} {route.durationMinutes ?? "-"}분</span>
      {route.transfers !== undefined && <span>환승 {route.transfers}회</span>}
      {route.fare !== undefined && <span>{route.fare.toLocaleString()}원</span>}
      {route.landingUrl && <a href={route.landingUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-blue-50 px-2 py-1 text-blue-700">카카오맵 보기</a>}
      {route.steps?.filter((step) => step.type !== "WALKING").slice(0, 2).map((step, index) => <p key={`${step.guidance}-${index}`} className="w-full rounded-lg bg-white/60 px-2 py-1.5 text-[9px] leading-4 text-slate-600"><span className="font-black text-emerald-700">{step.type === "BUS" ? "버스" : step.type === "SUBWAY" ? "지하철" : "이동"}</span>{step.vehicles?.length ? ` ${step.vehicles.join(", ")}` : ""} · {step.guidance}{step.stops?.length === 2 ? ` (${step.stops[0]} → ${step.stops[1]})` : ""}</p>)}
    </div>
  );
}

function MobileKakaoMapPanel({
  places,
  selectedPlace,
  generatedCourse,
  weather,
  onSelectPlace,
}: {
  places: Place[];
  selectedPlace: Place;
  generatedCourse: CourseItem[] | null;
  weather?: WeatherSummary;
  onSelectPlace: (place: Place) => void;
}) {
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
        mapRef.current = new maps.Map(mapElementRef.current, { center, level: 9 });
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
    const visiblePlaces = places.slice(0, 8);
    const visiblePlacesKey = visiblePlaces.map((place) => place.id).join("|");
    const positions = visiblePlaces.map((place) => new maps.LatLng(place.lat, place.lng));
    if (positions.length === 0) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = visiblePlaces.map((place, index) => {
      const markerElement = createMobileMapMarker({
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

    if (generatedCourse && positions.length > 1) {
      polylineRef.current = new maps.Polyline({
        path: positions,
        strokeWeight: 4,
        strokeColor: GW_BLUE,
        strokeOpacity: 0.7,
        strokeStyle: "solid",
      });
      polylineRef.current.setMap(map);
    }

    if (fittedPlacesKeyRef.current !== visiblePlacesKey) {
      const bounds = new maps.LatLngBounds();
      positions.forEach((position) => bounds.extend(position));
      map.setBounds(bounds);
      fittedPlacesKeyRef.current = visiblePlacesKey;
    }

    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      polylineRef.current?.setMap(null);
      polylineRef.current = null;
    };
  }, [generatedCourse, mapStatus, onSelectPlace, places, selectedPlace.id]);

  return (
    <div className="glass-panel overflow-hidden rounded-[2rem] p-3">
      <div className="relative h-[360px] overflow-hidden rounded-[1.5rem] border border-white/70 bg-emerald-50">
        <div ref={mapElementRef} aria-label="강원도 웰니스 카카오 지도" className="absolute inset-0 h-full w-full" />
        {mapStatus !== "ready" && <MobileKakaoMapFallback selectedPlace={selectedPlace} places={places} onSelectPlace={onSelectPlace} />}
        <div className="absolute left-4 top-4 rounded-2xl bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
          <p className="text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: GW_GREEN }}>
            {mapStatus === "ready" ? "Kakao Map" : "Kakao Map 대기"}
          </p>
          <p className="mt-0.5 text-[11px] font-black" style={{ color: GW_BLUE }}>
            {generatedCourse ? "원스톱 경로" : "장소 위치 탐색"}
          </p>
        </div>
        <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-white/92 p-4 shadow-sm backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black text-slate-400">현재 선택</p>
              <h3 className="mt-1 truncate text-[15px] font-black text-slate-800">{selectedPlace.name}</h3>
              <p className="mt-1 line-clamp-2 text-[11px] font-bold leading-5 text-slate-500">{selectedPlace.addr}</p>
            </div>
            <span className="shrink-0 rounded-xl bg-emerald-50 px-2.5 py-2 text-[11px] font-black text-emerald-700">
              {selectedPlace.region}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <MobileWeatherInline weather={weather} />
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

function createMobileMapMarker({
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
  button.style.boxShadow = selected ? "0 8px 18px rgba(0, 91, 170, 0.32)" : "0 6px 14px rgba(0, 0, 0, 0.2)";
  button.style.color = "#ffffff";
  button.style.cursor = "pointer";
  button.style.display = "flex";
  button.style.fontSize = "13px";
  button.style.fontWeight = "900";
  button.style.height = selected ? "40px" : "34px";
  button.style.justifyContent = "center";
  button.style.lineHeight = "1";
  button.style.outline = "none";
  button.style.transition = "transform 160ms ease, box-shadow 160ms ease";
  button.style.width = selected ? "40px" : "34px";
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });

  return button;
}

function MobileKakaoMapFallback({ selectedPlace, places, onSelectPlace }: { selectedPlace: Place; places: Place[]; onSelectPlace: (place: Place) => void }) {
  return (
    <>
      <div
        aria-label="강원도 웰니스 지도"
        className="absolute inset-0 bg-cover bg-center opacity-75"
        role="img"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80)",
        }}
      />
      <div className="absolute inset-0 bg-[#113524]/35" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M19 35 C31 30, 42 54, 51 48 S68 32, 79 42" fill="none" stroke="rgba(255,255,255,.78)" strokeDasharray="3 3" strokeLinecap="round" strokeWidth="0.65" />
      </svg>
      {places.slice(0, 5).map((place, index) => (
        <MobileFallbackMarker key={`${place.id}-${index}`} place={place} index={index} selected={place.id === selectedPlace.id} onSelect={() => onSelectPlace(place)} />
      ))}
    </>
  );
}

function MobileFallbackMarker({ place, index, selected, onSelect }: { place: Place; index: number; selected: boolean; onSelect: () => void }) {
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
      <button
        type="button"
        onClick={onSelect}
        aria-label={`${index + 1}번 장소 ${place.name} 선택`}
        className={`flex h-10 w-10 items-center justify-center rounded-full border-4 border-white text-xs font-black text-white shadow-lg ${
          selected ? "scale-110" : ""
        }`}
        style={{ backgroundColor: selected ? GW_BLUE : getCategoryColor(place.category) }}
      >
        {index + 1}
      </button>
      <div className="mt-1 whitespace-nowrap rounded-md bg-white/90 px-2 py-1 text-[10px] font-black text-slate-700 shadow-sm">{place.region}</div>
    </div>
  );
}

function getCategoryColor(category: PlaceCategory) {
  if (category === "food") return "#F59E0B";
  if (category === "stay") return "#8B5CF6";
  return GW_GREEN;
}

function MobileWeatherInline({ weather }: { weather?: WeatherSummary }) {
  const levelClass = weather
    ? {
        good: "border-emerald-100 bg-emerald-50 text-emerald-800",
        normal: "border-blue-100 bg-blue-50 text-blue-800",
        caution: "border-amber-100 bg-amber-50 text-amber-800",
      }[weather.activityLevel]
    : "border-slate-100 bg-white/70 text-slate-500";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${levelClass}`}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[10px] font-black">기상 기반 방문 적합도</p>
      </div>
      {weather ? (
        <>
          <p className="text-[12px] font-black">{weather.activityLabel}</p>
          <p className="mt-1 text-[11px] font-bold leading-5 opacity-80">{weather.message}</p>
        </>
      ) : (
        <div className="flex items-center gap-2 text-[11px] font-bold">
          <Loader2 size={13} className="animate-spin" />
          선택 장소의 초단기예보를 확인하는 중입니다.
        </div>
      )}
    </div>
  );
}

function WeatherInsightCard({ weather, compact = false }: { weather?: WeatherSummary; compact?: boolean }) {
  const levelClass = weather
    ? {
        good: "border-emerald-100 bg-emerald-50 text-emerald-800",
        normal: "border-blue-100 bg-blue-50 text-blue-800",
        caution: "border-amber-100 bg-amber-50 text-amber-800",
      }[weather.activityLevel]
    : "border-slate-100 bg-slate-50 text-slate-500";

  return (
    <section className={`mb-6 rounded-2xl border px-4 py-3 ${levelClass}`}>
      <div className="mb-2">
        <p className="text-[10px] font-black">기상 기반 방문 적합도</p>
      </div>
      {weather ? (
        <>
          <p className={`${compact ? "text-[12px]" : "text-sm"} font-black`}>{weather.activityLabel}</p>
          <p className="mt-1 text-[11px] font-bold leading-5 opacity-80">{weather.message}</p>
          <p className="mt-2 text-[11px] font-medium leading-5 opacity-80">{weather.recommendationHint}</p>
        </>
      ) : (
        <div className="flex items-center gap-2 text-[11px] font-bold">
          <Loader2 size={13} className="animate-spin" />
          선택 장소의 초단기예보를 불러오는 중입니다.
        </div>
      )}
    </section>
  );
}

function isPlaceCourseItem(item: CourseItem): item is PlaceCourseItem {
  return item.type !== "travel";
}
