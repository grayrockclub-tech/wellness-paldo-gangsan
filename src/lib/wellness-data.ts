export type WeatherMode = "clear" | "rain" | "heat" | "cold";
export type TripDuration = "half-day" | "full-day" | "overnight";

export type WellnessPlace = {
  id: string;
  title: string;
  region: string;
  type: "forest" | "spa" | "food" | "stay" | "culture" | "trail";
  indoorOutdoor: "indoor" | "outdoor" | "mixed";
  weatherFit: WeatherMode[];
  tags: string[];
  reason: string;
};

export const wellnessPlaces: WellnessPlace[] = [
  {
    id: "gangneung-aroma-spa",
    title: "강릉 아로마 스파",
    region: "강릉",
    type: "spa",
    indoorOutdoor: "indoor",
    weatherFit: ["rain", "cold", "heat"],
    tags: ["휴식", "실내", "회복"],
    reason: "비나 한파에도 일정 변동 없이 체류형 웰니스 경험을 제공할 수 있습니다.",
  },
  {
    id: "pyeongchang-healing-forest",
    title: "평창 치유숲 산책",
    region: "평창",
    type: "forest",
    indoorOutdoor: "outdoor",
    weatherFit: ["clear"],
    tags: ["숲", "산책", "호흡"],
    reason: "맑은 날씨와 적정 기온에서 걷기 중심의 회복 경험을 만들기 좋습니다.",
  },
  {
    id: "chuncheon-lake-trail",
    title: "춘천 호수 명상길",
    region: "춘천",
    type: "trail",
    indoorOutdoor: "outdoor",
    weatherFit: ["clear"],
    tags: ["호수", "명상", "반나절"],
    reason: "짧은 체류시간에도 이동 부담이 낮은 야외 웰니스 코스로 구성할 수 있습니다.",
  },
  {
    id: "sokcho-tea-culture",
    title: "속초 로컬 티 테라피",
    region: "속초",
    type: "culture",
    indoorOutdoor: "indoor",
    weatherFit: ["rain", "cold"],
    tags: ["차", "실내", "지역성"],
    reason: "우천 시에도 지역 식문화와 휴식을 결합한 대체 코스로 활용하기 좋습니다.",
  },
  {
    id: "jeongseon-stay",
    title: "정선 산림 숙박",
    region: "정선",
    type: "stay",
    indoorOutdoor: "mixed",
    weatherFit: ["clear", "cold"],
    tags: ["숙박", "체류", "산림"],
    reason: "1박 일정에서 회복형 숙박과 주변 자연 콘텐츠를 연결하기 좋습니다.",
  },
  {
    id: "wonju-wellness-food",
    title: "원주 로컬 보양식",
    region: "원주",
    type: "food",
    indoorOutdoor: "indoor",
    weatherFit: ["heat", "cold", "rain"],
    tags: ["음식", "체력", "실내"],
    reason: "날씨 부담이 큰 날에도 일정 만족도를 유지하는 식도락형 콘텐츠입니다.",
  },
];

export function buildWellnessRecommendations({
  weather = "clear",
  duration = "half-day",
}: {
  weather?: WeatherMode;
  duration?: TripDuration;
}) {
  const fitted = wellnessPlaces.filter((place) => place.weatherFit.includes(weather));
  const fallback = fitted.length > 0 ? fitted : wellnessPlaces;
  const limit = duration === "overnight" ? 4 : duration === "full-day" ? 3 : 2;

  return {
    weather,
    duration,
    title: getScenarioTitle(weather, duration),
    places: fallback.slice(0, limit),
    nextDataTasks: [
      "TourAPI contentId 연결",
      "실제 좌표와 이동거리 계산",
      "기상청 예보값 기반 weather 자동 매핑",
    ],
  };
}

function getScenarioTitle(weather: WeatherMode, duration: TripDuration) {
  const weatherLabel = {
    clear: "맑은 날",
    rain: "비 오는 날",
    heat: "더운 날",
    cold: "추운 날",
  }[weather];

  const durationLabel = {
    "half-day": "반나절",
    "full-day": "하루",
    overnight: "1박",
  }[duration];

  return `${weatherLabel} ${durationLabel} 강원 웰니스 코스`;
}
