# 웰니스 팔도강산

2026 관광데이터 활용 공모전 웹·앱 개발 부문 제출용 웹 프로젝트입니다.
한국관광공사 TourAPI와 기상청 예보 데이터를 결합해 강원도 웰니스 여행 코스를 추천합니다.

## 기술 스택

- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- 서버 API Route Handler
- 메모리 캐시
- Vercel 배포 예정

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## 환경변수

`.env.example`을 참고해 `.env.local`을 만듭니다.

```bash
TOUR_API_KEY=
GANGWON_RESTAURANT_API_KEY=
WEATHER_API_KEY=
NEXT_PUBLIC_KAKAO_MAP_KEY=
KAKAO_REST_API_KEY=
```

공공데이터포털 API 키는 `NEXT_PUBLIC_`을 붙이지 않습니다. 서버 라우트에서만 읽어 브라우저에 노출되지 않게 합니다.
카카오 지도 JavaScript 키는 브라우저에서 지도 SDK를 불러와야 하므로 `NEXT_PUBLIC_KAKAO_MAP_KEY`로 설정합니다.
공공데이터포털 TourAPI 키는 Encoding/Decoding 키 모두 입력 가능하도록 서버에서 정규화합니다.
강원특별자치도 일반음식점 현황 API의 업소명·업태·도로명주소를 맛집 후보에 반영합니다. 이 API는 기본적으로 공공데이터포털 공통 인증키인 `TOUR_API_KEY`를 재사용하고, 다른 계정의 키가 필요할 때만 `GANGWON_RESTAURANT_API_KEY`를 설정합니다. 원본 데이터에 좌표가 없으므로 `KAKAO_REST_API_KEY`로 도로명주소를 좌표로 변환하며, 모든 키는 서버 환경변수로만 관리합니다.

## 서버 API 라우트

- `GET /api/health`: 환경변수 설정 여부와 캐시 정책 확인
- `GET /api/tour?operation=areaBasedList2&areaCode=32`: 강원도 TourAPI 샘플 호출
- `GET /api/wellness/places`: TourAPI 장소와 강원특별자치도 일반음식점 현황을 통합해 앱 장소 모델로 정규화
- `GET /api/weather?operation=getVilageFcst&nx=73&ny=134`: 기상청 단기예보 샘플 호출
- `GET /api/recommendations?weather=rain&duration=half-day`: 추천 로직 샘플

## 이번 주 완료 기준

- 임시 웹 URL 생성
- TourAPI 샘플 호출 성공
- 기상 API 샘플 호출 성공
- 강원도 기준 추천 데이터 샘플 확보
- 서비스 핵심 기능 범위 확정
- 기능설명서용 서비스 개요 초안 작성

## 제출 리스크

- 1차 심사자료 마감: 2026년 9월 21일 16:00
- 권장 제출 완료: 2026년 9월 18일
- 웹 제출 필수 항목: 서비스 URL, 테스트 계정, OpenAPI 인증키, 활용 API, 기능설명서 PDF
