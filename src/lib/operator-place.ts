export type OperatorPlaceCategory = "spot" | "food" | "stay";

export type OperatorPlaceDraft = {
  id: string;
  name: string;
  region: string;
  category: OperatorPlaceCategory;
  subCategory: string;
  addr: string;
  lat: number | null;
  lng: number | null;
  score: number;
  desc: string;
  image?: string;
  contact?: string;
  homepage?: string;
  contentId?: string;
  sourceNote?: string;
  createdAt: string;
};

export type OperatorPlaceInput = Omit<OperatorPlaceDraft, "id" | "createdAt">;

export function validateOperatorPlaceInput(input: Partial<OperatorPlaceInput>) {
  const errors: Record<string, string> = {};

  if (!input.name?.trim()) errors.name = "장소명을 입력해주세요.";
  if (!input.region?.trim()) errors.region = "지역을 입력해주세요.";
  if (!input.category) errors.category = "카테고리를 선택해주세요.";
  if (!input.subCategory?.trim()) errors.subCategory = "세부 분류를 입력해주세요.";
  if (!input.addr?.trim()) errors.addr = "주소를 입력해주세요.";
  if (!input.desc?.trim()) errors.desc = "장소 설명을 입력해주세요.";

  if (typeof input.score !== "number" || Number.isNaN(input.score) || input.score < 0 || input.score > 5) {
    errors.score = "평점은 0~5 사이 숫자로 입력해주세요.";
  }

  if (input.lat !== null && input.lat !== undefined && (Number.isNaN(input.lat) || input.lat < 33 || input.lat > 39)) {
    errors.lat = "위도는 강원도 좌표 범위에 가까운 숫자로 입력해주세요.";
  }

  if (input.lng !== null && input.lng !== undefined && (Number.isNaN(input.lng) || input.lng < 124 || input.lng > 132)) {
    errors.lng = "경도는 강원도 좌표 범위에 가까운 숫자로 입력해주세요.";
  }

  return errors;
}
