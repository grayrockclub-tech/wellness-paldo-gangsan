export type CoursePlaceCategory = "spot" | "food" | "stay";
export type CourseTravelMode = "walk" | "drive";
export type CoursePlanIntensity = "relaxed" | "dense";
export type CoursePlanMode = "auto" | "semi-auto";

export type CoursePlace = {
  id: string;
  region: string;
  category: CoursePlaceCategory;
  subCategory: string;
  name: string;
  addr: string;
  desc: string;
  score: number;
  lat: number;
  lng: number;
};

export type TravelCourseItem = {
  type: "travel";
  duration: number;
  travelType: CourseTravelMode;
};

export type PlaceCourseItem<TPlace extends CoursePlace = CoursePlace> = TPlace & {
  type: CoursePlaceCategory;
  timeRange: string;
  recommendationReason: string;
};

export type WellnessCourseItem<TPlace extends CoursePlace = CoursePlace> = TravelCourseItem | PlaceCourseItem<TPlace>;

export function buildWellnessCourse<TPlace extends CoursePlace>({
  places,
  mustGoIds,
  planIntensity,
  planMode,
  includeFoodAndStay,
  travelMode,
}: {
  places: TPlace[];
  mustGoIds: string[];
  planIntensity: CoursePlanIntensity;
  planMode: CoursePlanMode;
  includeFoodAndStay: boolean;
  travelMode: CourseTravelMode;
}) {
  const mustGoSet = new Set(mustGoIds);
  const mandatory = places.filter((place) => mustGoSet.has(place.id));
  const spotCount = planIntensity === "dense" ? 3 : 2;
  const selectedSpots = selectSpots(places, mandatory, mustGoSet, spotCount, planMode);
  const selectedFood = includeFoodAndStay ? selectSupportingPlace(places, mandatory, selectedSpots, "food") : undefined;
  const selectedStay = includeFoodAndStay ? selectSupportingPlace(places, mandatory, [...selectedSpots, selectedFood].filter(Boolean) as TPlace[], "stay") : undefined;

  const timeline: WellnessCourseItem<TPlace>[] = [];
  const currentTime = new Date();
  currentTime.setHours(10, 0, 0);

  addPlace(timeline, currentTime, selectedSpots[0], 120, makeReason(selectedSpots[0], { mustGoSet, anchor: selectedSpots[0], role: "spot", order: 1 }));

  addLegAndPlace(timeline, currentTime, selectedSpots[0], selectedFood, travelMode, 90, makeReason(selectedFood, { mustGoSet, anchor: selectedSpots[0], role: "food" }));
  addLegAndPlace(timeline, currentTime, selectedFood ?? selectedSpots[0], selectedSpots[1], travelMode, 120, makeReason(selectedSpots[1], { mustGoSet, anchor: selectedFood ?? selectedSpots[0], role: "spot", order: 2 }));

  if (planIntensity === "dense") {
    addLegAndPlace(timeline, currentTime, selectedSpots[1], selectedSpots[2], travelMode, 90, makeReason(selectedSpots[2], { mustGoSet, anchor: selectedSpots[1], role: "spot", order: 3 }));
  }

  addLegAndPlace(timeline, currentTime, selectedSpots.at(-1), selectedStay, travelMode, 60, makeReason(selectedStay, { mustGoSet, anchor: selectedSpots.at(-1), role: "stay" }), " (체크인 및 휴식)");

  return timeline;
}

function selectSpots<TPlace extends CoursePlace>(
  places: TPlace[],
  mandatory: TPlace[],
  mustGoSet: Set<string>,
  spotCount: number,
  planMode: CoursePlanMode,
) {
  const mandatorySpots = mandatory.filter((place) => place.category === "spot");
  const selected = [...mandatorySpots];
  const baseAnchors = planMode === "semi-auto" ? mandatory : [];

  while (selected.length < spotCount) {
    const anchors = [...baseAnchors, ...selected];
    const candidate = places
      .filter((place) => place.category === "spot" && !selected.some((selectedPlace) => selectedPlace.id === place.id))
      .sort((a, b) => scoreCandidate(b, anchors, mustGoSet, "spot") - scoreCandidate(a, anchors, mustGoSet, "spot"))[0];

    if (!candidate) break;
    selected.push(candidate);
  }

  return selected.slice(0, spotCount);
}

function selectSupportingPlace<TPlace extends CoursePlace>(
  places: TPlace[],
  mandatory: TPlace[],
  anchors: TPlace[],
  category: "food" | "stay",
) {
  const mandatoryPlace = mandatory.find((place) => place.category === category);
  if (mandatoryPlace) return mandatoryPlace;

  return places
    .filter((place) => place.category === category)
    .sort((a, b) => scoreCandidate(b, anchors, new Set(), category) - scoreCandidate(a, anchors, new Set(), category))[0];
}

function scoreCandidate(place: CoursePlace, anchors: CoursePlace[], mustGoSet: Set<string>, role: CoursePlaceCategory) {
  const nearestDistance = nearestDistanceKm(place, anchors);
  const sameRegionBonus = anchors.some((anchor) => anchor.region === place.region) ? 24 : 0;
  const mustGoBonus = mustGoSet.has(place.id) ? 40 : 0;
  const categoryBonus = place.category === role ? 18 : 0;
  const subCategoryBonus = getSubCategoryBonus(place);
  return place.score * 12 + sameRegionBonus + mustGoBonus + categoryBonus + subCategoryBonus - Math.min(nearestDistance, 80) * 0.45;
}

function getSubCategoryBonus(place: CoursePlace) {
  const text = `${place.name} ${place.desc} ${place.subCategory}`;
  if (/휴양림|숲|산림|생태|공원|전나무|계곡/.test(text)) return 16;
  if (/산채|막국수|순두부|한식|로컬|향토|건강/.test(text)) return 14;
  if (/한옥|리조트|펜션|웰니스|휴식|스테이/.test(text)) return 14;
  return 0;
}

function addLegAndPlace<TPlace extends CoursePlace>(
  timeline: WellnessCourseItem<TPlace>[],
  currentTime: Date,
  from: TPlace | undefined,
  to: TPlace | undefined,
  travelType: CourseTravelMode,
  duration: number,
  recommendationReason: string,
  suffix = "",
) {
  if (!to) return;
  addTravel(timeline, currentTime, travelType, estimateTravelMinutes(from, to, travelType));
  addPlace(timeline, currentTime, to, duration, recommendationReason, suffix);
}

function addPlace<TPlace extends CoursePlace>(
  timeline: WellnessCourseItem<TPlace>[],
  currentTime: Date,
  place: TPlace | undefined,
  duration: number,
  recommendationReason: string,
  suffix = "",
) {
  if (!place) return;
  const start = timeText(currentTime);
  currentTime.setMinutes(currentTime.getMinutes() + duration);
  const end = timeText(currentTime);
  timeline.push({ ...place, type: place.category, timeRange: `${start} - ${end}${suffix}`, recommendationReason });
}

function addTravel<TPlace extends CoursePlace>(
  timeline: WellnessCourseItem<TPlace>[],
  currentTime: Date,
  travelType: CourseTravelMode,
  duration: number,
) {
  timeline.push({ type: "travel", duration, travelType });
  currentTime.setMinutes(currentTime.getMinutes() + duration);
}

function makeReason(
  place: CoursePlace | undefined,
  {
    mustGoSet,
    anchor,
    role,
    order,
  }: {
    mustGoSet: Set<string>;
    anchor?: CoursePlace;
    role: CoursePlaceCategory;
    order?: number;
  },
) {
  if (!place) return "";
  const selectedPrefix = mustGoSet.has(place.id) ? "사용자가 꼭 가고 싶은 장소로 선택해 우선 반영했습니다. " : "";
  const regionText = anchor && anchor.id !== place.id && anchor.region === place.region ? `${anchor.region} 권역 안에서 이동 부담을 낮췄습니다. ` : "";

  if (role === "food") {
    return `${selectedPrefix}${regionText}웰니스 활동 사이에 체력 회복이 가능하도록 지역 음식점을 배치했습니다.`;
  }

  if (role === "stay") {
    return `${selectedPrefix}${regionText}하루 일정을 무리 없이 마무리하고 다음 날까지 체류형 회복 경험을 이어가기 좋습니다.`;
  }

  const sequence = order === 1 ? "첫 일정" : order === 2 ? "오후 일정" : "추가 회복 일정";
  return `${selectedPrefix}${regionText}${sequence}으로 자연·명상·산책형 콘텐츠를 배치해 웰니스 여행의 중심 경험을 만들었습니다.`;
}

function estimateTravelMinutes(from: CoursePlace | undefined, to: CoursePlace, travelType: CourseTravelMode) {
  if (!from) return travelType === "drive" ? 15 : 30;
  const distance = distanceKm(from, to);
  if (!Number.isFinite(distance) || distance <= 0.2) return travelType === "drive" ? 10 : 18;

  if (travelType === "drive") {
    return clamp(Math.round(distance * 1.6 + 12), 12, 75);
  }

  return clamp(Math.round(distance * 7 + 20), 25, 110);
}

function nearestDistanceKm(place: CoursePlace, anchors: CoursePlace[]) {
  if (anchors.length === 0) return 0;
  return Math.min(...anchors.map((anchor) => distanceKm(place, anchor)));
}

function distanceKm(a: CoursePlace, b: CoursePlace) {
  if (!a.lat || !a.lng || !b.lat || !b.lng) return 40;
  const radiusKm = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return radiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function timeText(date: Date) {
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
