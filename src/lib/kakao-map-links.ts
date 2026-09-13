type KakaoMapPlace = Pick<{ name: string; lat: number; lng: number }, "name" | "lat" | "lng">;

export function getKakaoMapSearchUrl(name: string) {
  return `https://map.kakao.com/link/search/${encodeURIComponent(name)}`;
}

export function getKakaoDrivingRouteUrl(from: KakaoMapPlace, to: KakaoMapPlace) {
  return `https://map.kakao.com/link/by/car/${encodeURIComponent(from.name)},${from.lat},${from.lng}/${encodeURIComponent(to.name)},${to.lat},${to.lng}`;
}
