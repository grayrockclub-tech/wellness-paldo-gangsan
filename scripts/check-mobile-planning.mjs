import assert from "node:assert/strict";
import { buildWellnessCourse, shiftTimeRange } from "../src/lib/course-builder.ts";

const places = [
  { id: "a", category: "spot", subCategory: "forest" },
  { id: "b", category: "spot", subCategory: "forest" },
  { id: "food", category: "food", subCategory: "healthy" },
  { id: "stay", category: "stay", subCategory: "healing" },
].map((place, index) => ({
  ...place,
  name: place.id,
  region: "강릉",
  addr: "강릉시",
  desc: "검증용 장소",
  score: 4.7,
  lat: 37.76 + index * 0.005,
  lng: 128.9 + index * 0.005,
}));

for (const travelMode of ["walk", "drive"]) {
  const options = { places, travelMode, theme: "forest", startTime: "2026-09-18T09:30" };
  const recommended = buildWellnessCourse({ ...options, mustGoIds: [], planMode: "selected-with-recommendations" });
  const recommendedPlaces = recommended.filter((item) => item.type !== "travel");
  assert.ok(recommendedPlaces.length >= 3 && recommendedPlaces.length <= 5, "선택 없이도 앱 추천 생성");

  const selected = buildWellnessCourse({ ...options, mustGoIds: ["b", "a"], manualOrderIds: ["b", "a"], planMode: "selected-only" });
  const selectedPlaces = selected.filter((item) => item.type !== "travel");
  assert.deepEqual(selectedPlaces.map((place) => place.id), ["b", "a"], "선택한 장소와 순서만 반영");
  assert.equal(selectedPlaces[0].timeRange, "09:30 - 11:30");
  assert.equal(shiftTimeRange(selectedPlaces[0].timeRange, 45), "10:15 - 12:15", "첫 구간 이동 시간 반영");
}

assert.equal(shiftTimeRange("23:30 - 00:30 (체크인 및 휴식)", 60), "00:30 - 01:30 (체크인 및 휴식)");
assert.equal(shiftTimeRange("09:30 - 11:30", 0), "09:30 - 11:30");
console.log("모바일 계획: 빈 선택 추천, 직접 선택 순서, 이동 시간 반영 확인 완료");
