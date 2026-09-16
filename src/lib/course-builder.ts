export type CoursePlaceCategory = "spot" | "food" | "stay";
export type CourseTravelMode = "walk" | "drive";
export type CoursePlanMode = "auto" | "selected-only" | "selected-with-recommendations";
export type CourseTheme = "food" | "forest" | "mindfulness" | "spa" | "temple" | "auto";
export type CourseWeatherActivityLevel = "good" | "normal" | "caution";

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

export type CourseWeatherSummary = {
  activityLevel: CourseWeatherActivityLevel;
  sky?: string;
  precipitation?: string;
  temperature?: number;
  message?: string;
  recommendationHint?: string;
};

export function shiftTimeRange(timeRange: string, offsetMinutes: number) {
  if (offsetMinutes === 0) return timeRange;
  return timeRange.replace(/(\d{2}):(\d{2})/g, (_match, hour: string, minute: string) => {
    const totalMinutes = (Number(hour) * 60 + Number(minute) + offsetMinutes) % (24 * 60);
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
  });
}

export function buildWellnessCourse<TPlace extends CoursePlace>({
  places,
  mustGoIds,
  planMode,
  theme,
  travelMode,
  startTime,
  manualOrderIds,
  weatherByPlaceId = {},
}: {
  places: TPlace[];
  mustGoIds: string[];
  planMode: CoursePlanMode;
  theme: CourseTheme;
  travelMode: CourseTravelMode;
  startTime?: string;
  manualOrderIds?: string[];
  weatherByPlaceId?: Record<string, CourseWeatherSummary>;
}) {
  const mustGoSet = new Set(mustGoIds);
  const mandatory = places.filter((place) => mustGoSet.has(place.id));
  const scoringContext = { mustGoSet, travelMode, weatherByPlaceId, theme };

  if (planMode === "selected-only") {
    return buildSelectedOnlyCourse(mandatory, travelMode, scoringContext, startTime, manualOrderIds);
  }

  const selectedSpots = orderByNearestPath(
    selectSpots(places, mandatory, planMode === "auto" ? 2 : Math.max(2, 3 - mandatory.filter((place) => place.category === "spot").length), planMode, scoringContext),
    mandatory,
    travelMode,
  );
  const selectedFood = theme === "food" ? undefined : selectSupportingPlace(places, mandatory, selectedSpots, "food", scoringContext);
  const selectedStay = selectSupportingPlace(places, mandatory, [...selectedSpots, selectedFood].filter(Boolean) as TPlace[], "stay", scoringContext);

  const timeline: WellnessCourseItem<TPlace>[] = [];
  const currentTime = createTimelineStart(startTime);

  addPlace(timeline, currentTime, selectedSpots[0], selectedSpots[0]?.category === "food" ? 90 : 120, makeReason(selectedSpots[0], { mustGoSet, anchor: selectedSpots[0], role: selectedSpots[0]?.category ?? "spot", order: 1, travelMode, weatherByPlaceId }));

  addLegAndPlace(timeline, currentTime, selectedSpots[0], selectedFood, travelMode, 90, makeReason(selectedFood, { mustGoSet, anchor: selectedSpots[0], role: "food", travelMode, weatherByPlaceId }));
  addLegAndPlace(timeline, currentTime, selectedFood ?? selectedSpots[0], selectedSpots[1], travelMode, selectedSpots[1]?.category === "food" ? 90 : 120, makeReason(selectedSpots[1], { mustGoSet, anchor: selectedFood ?? selectedSpots[0], role: selectedSpots[1]?.category ?? "spot", order: 2, travelMode, weatherByPlaceId }));

  addLegAndPlace(timeline, currentTime, selectedSpots.at(-1), selectedStay, travelMode, 60, makeReason(selectedStay, { mustGoSet, anchor: selectedSpots.at(-1), role: "stay", travelMode, weatherByPlaceId }), " (체크인 및 휴식)");

  return timeline;
}

function createTimelineStart(startTime?: string) {
  const requested = startTime ? new Date(startTime) : undefined;
  if (requested && Number.isFinite(requested.getTime())) return requested;
  const fallback = new Date();
  fallback.setHours(10, 0, 0, 0);
  return fallback;
}

function buildSelectedOnlyCourse<TPlace extends CoursePlace>(
  mandatory: TPlace[],
  travelMode: CourseTravelMode,
  context: ScoringContext,
  startTime?: string,
  manualOrderIds?: string[],
) {
  const orderIndex = new Map((manualOrderIds ?? []).map((id, index) => [id, index]));
  const orderedPlaces = orderIndex.size > 0
    ? [...mandatory].sort((a, b) => (orderIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (orderIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER))
    : orderByNearestPath(mandatory, mandatory, travelMode);
  const timeline: WellnessCourseItem<TPlace>[] = [];
  const currentTime = createTimelineStart(startTime);

  orderedPlaces.forEach((place, index) => {
    const previous = orderedPlaces[index - 1];
    if (previous) addTravel(timeline, currentTime, travelMode, estimateTravelMinutes(previous, place, travelMode));
    const duration = place.category === "stay" ? 60 : place.category === "food" ? 90 : 120;
    const suffix = place.category === "stay" ? " (체크인 및 휴식)" : "";
    addPlace(timeline, currentTime, place, duration, makeReason(place, { ...context, anchor: previous, role: place.category, order: index + 1 }), suffix);
  });

  return timeline;
}

type ScoringContext = {
  mustGoSet: Set<string>;
  travelMode: CourseTravelMode;
  weatherByPlaceId: Record<string, CourseWeatherSummary>;
  theme: CourseTheme;
};

function selectSpots<TPlace extends CoursePlace>(
  places: TPlace[],
  mandatory: TPlace[],
  spotCount: number,
  planMode: CoursePlanMode,
  context: ScoringContext,
) {
  const primaryCategory: CoursePlaceCategory = context.theme === "food" ? "food" : "spot";
  const mandatorySpots = mandatory.filter((place) => place.category === primaryCategory);
  const selected = [...mandatorySpots];
  const baseAnchors = planMode === "selected-with-recommendations" ? mandatory : [];

  while (selected.length < spotCount) {
    const anchors = [...baseAnchors, ...selected];
    const candidate = places
      .filter((place) => place.category === primaryCategory && !selected.some((selectedPlace) => selectedPlace.id === place.id))
      .sort((a, b) => scoreCandidate(b, anchors, primaryCategory, context) - scoreCandidate(a, anchors, primaryCategory, context))[0];

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
  context: ScoringContext,
) {
  const mandatoryPlace = mandatory.find((place) => place.category === category);
  if (mandatoryPlace) return mandatoryPlace;

  return places
    .filter((place) => place.category === category)
    .sort((a, b) => scoreCandidate(b, anchors, category, context) - scoreCandidate(a, anchors, category, context))[0];
}

function scoreCandidate(place: CoursePlace, anchors: CoursePlace[], role: CoursePlaceCategory, context: ScoringContext) {
  const nearestDistance = nearestDistanceKm(place, anchors);
  const sameRegionBonus = anchors.some((anchor) => anchor.region === place.region) ? 24 : 0;
  const mustGoBonus = context.mustGoSet.has(place.id) ? 40 : 0;
  const categoryBonus = place.category === role ? 18 : 0;
  const themeBonus = getThemeBonus(place, context.theme);
  const weatherBonus = getWeatherFitScore(place, context.weatherByPlaceId[place.id]);
  const distancePenalty = getDistancePenalty(nearestDistance, context.travelMode);
  return place.score * 12 + sameRegionBonus + mustGoBonus + categoryBonus + themeBonus + weatherBonus - distancePenalty;
}

function getThemeBonus(place: CoursePlace, theme: CourseTheme) {
  const text = `${place.name} ${place.desc} ${place.subCategory}`;
  if (theme === "auto") return 0;
  if (theme === "food") return place.category === "food" || /산채|막국수|순두부|한식|로컬|향토|건강|식당/.test(text) ? 80 : 0;
  if (theme === "forest") return /휴양림|숲|산림|생태|공원|전나무|계곡|트레킹|둘레길/.test(text) ? 80 : 0;
  if (theme === "mindfulness") return /요가|명상|다도|마음|디톡스|웰니스/.test(text) ? 80 : 0;
  if (theme === "spa") return /온천|사우나|스파|찜질|온열|목욕/.test(text) ? 80 : 0;
  return /사찰|템플|절|불교|한옥/.test(text) ? 80 : 0;
}

function getWeatherFitScore(place: CoursePlace, weather?: CourseWeatherSummary) {
  if (!weather) return 0;
  const indoorFriendly = isIndoorFriendly(place);
  const outdoorWellness = isOutdoorWellness(place);

  if (weather.activityLevel === "good") {
    if (place.category === "spot" && outdoorWellness) return 22;
    if (place.category === "spot") return 14;
    return 4;
  }

  if (weather.activityLevel === "caution") {
    if (place.category === "food") return 16;
    if (place.category === "stay") return 18;
    if (indoorFriendly) return 12;
    if (outdoorWellness) return -24;
    return -8;
  }

  if (place.category === "spot" && indoorFriendly) return 6;
  return 2;
}

function getDistancePenalty(distanceKmValue: number, travelMode: CourseTravelMode) {
  if (!Number.isFinite(distanceKmValue) || distanceKmValue <= 0) return 0;
  const basePenalty = Math.min(distanceKmValue, 120) * (travelMode === "walk" ? 1.25 : 0.55);
  const longMovePenalty =
    travelMode === "walk" && distanceKmValue > 12
      ? 26
      : travelMode === "drive" && distanceKmValue > 55
        ? 18
        : 0;
  return basePenalty + longMovePenalty;
}

function isOutdoorWellness(place: CoursePlace) {
  return /휴양림|숲|산림|생태|공원|전나무|계곡|해변|둘레길|산책|자연|수목|국립/.test(`${place.name} ${place.desc} ${place.subCategory}`);
}

function isIndoorFriendly(place: CoursePlace) {
  return /뮤지엄|박물관|미술관|센터|한옥|실내|온열|찜질|스파|리조트|호텔|숙소|식당|카페|다도|요가|명상/.test(`${place.name} ${place.desc} ${place.subCategory}`);
}

function orderByNearestPath<TPlace extends CoursePlace>(spots: TPlace[], mandatory: TPlace[], travelMode: CourseTravelMode) {
  if (spots.length <= 2) return spots;
  const requiredSpotIds = new Set(mandatory.filter((place) => place.category === "spot").map((place) => place.id));
  const [first, ...rest] = spots;
  const ordered = [first];
  const remaining = [...rest];

  while (remaining.length > 0) {
    const current = ordered.at(-1);
    const nextIndex = remaining
      .map((place, index) => ({
        index,
        score: distanceKm(current ?? place, place) + (requiredSpotIds.has(place.id) ? -5 : 0) + (travelMode === "walk" ? distanceKm(current ?? place, place) * 0.3 : 0),
      }))
      .sort((a, b) => a.score - b.score)[0]?.index ?? 0;

    ordered.push(remaining.splice(nextIndex, 1)[0]);
  }

  return ordered;
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
    travelMode,
    weatherByPlaceId,
  }: {
    mustGoSet: Set<string>;
    anchor?: CoursePlace;
    role: CoursePlaceCategory;
    order?: number;
    travelMode: CourseTravelMode;
    weatherByPlaceId: Record<string, CourseWeatherSummary>;
  },
) {
  if (!place) return "";
  const selectedPrefix = mustGoSet.has(place.id) ? "사용자가 꼭 가고 싶은 장소로 선택해 우선 반영했습니다. " : "";
  const regionText = makeMoveReason(anchor, place, travelMode);
  const weatherText = makeWeatherReason(place, weatherByPlaceId[place.id]);

  if (role === "food") {
    return `${selectedPrefix}${weatherText}${regionText}웰니스 활동 사이에 체력 회복이 가능하도록 지역 음식점을 배치했습니다.`;
  }

  if (role === "stay") {
    return `${selectedPrefix}${weatherText}${regionText}하루 일정을 무리 없이 마무리하고 다음 날까지 체류형 회복 경험을 이어가기 좋습니다.`;
  }

  const sequence = order === 1 ? "첫 일정" : order === 2 ? "오후 일정" : "추가 회복 일정";
  return `${selectedPrefix}${weatherText}${regionText}${sequence}으로 자연·명상·산책형 콘텐츠를 배치해 웰니스 여행의 중심 경험을 만들었습니다.`;
}

function makeWeatherReason(place: CoursePlace, weather?: CourseWeatherSummary) {
  if (!weather) return "";
  if (weather.activityLevel === "good" && place.category === "spot") {
    return "기상 조건이 야외 웰니스 활동에 적합해 스팟 우선순위를 높였습니다. ";
  }
  if (weather.activityLevel === "caution" && (place.category === "food" || place.category === "stay" || isIndoorFriendly(place))) {
    return "비·더위·바람 등 기상 부담을 고려해 실내형 회복 동선을 보강했습니다. ";
  }
  if (weather.activityLevel === "caution" && isOutdoorWellness(place)) {
    return "야외 활동 부담이 있어 체류 시간을 짧게 가져가는 보조 일정으로 반영했습니다. ";
  }
  return "기상 예보를 확인해 무리 없는 활동 강도로 배치했습니다. ";
}

function makeMoveReason(anchor: CoursePlace | undefined, place: CoursePlace, travelMode: CourseTravelMode) {
  if (!anchor || anchor.id === place.id) return "";
  const distance = distanceKm(anchor, place);
  if (anchor.region === place.region) return `${anchor.region} 권역 안에서 이동 부담을 낮췄습니다. `;
  if (travelMode === "walk" && distance <= 8) return "도보 이동 부담이 낮은 인접 장소로 연결했습니다. ";
  if (travelMode === "drive" && distance <= 35) return "자동차 이동 시간이 과하지 않은 권역으로 연결했습니다. ";
  return "강원 권역 간 이동 시간이 길어지지 않도록 후속 일정을 압축했습니다. ";
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
