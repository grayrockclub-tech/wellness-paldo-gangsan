import { gunzipSync } from "node:zlib";

const regionalCoordinates = {
  강릉: { lat: 37.7519, lng: 128.8761 },
  고성: { lat: 38.3806, lng: 128.4678 },
  동해: { lat: 37.5247, lng: 129.1143 },
  삼척: { lat: 37.4499, lng: 129.1652 },
  속초: { lat: 38.2070, lng: 128.5918 },
  양구: { lat: 38.1058, lng: 127.9904 },
  양양: { lat: 38.0754, lng: 128.6191 },
  영월: { lat: 37.1835, lng: 128.4619 },
  원주: { lat: 37.3422, lng: 127.9202 },
  인제: { lat: 38.0699, lng: 128.1704 },
  정선: { lat: 37.3807, lng: 128.6609 },
  철원: { lat: 38.1469, lng: 127.3123 },
  춘천: { lat: 37.8813, lng: 127.7298 },
  태백: { lat: 37.1641, lng: 128.9856 },
  평창: { lat: 37.3705, lng: 128.3902 },
  홍천: { lat: 37.6972, lng: 127.8880 },
  화천: { lat: 38.1062, lng: 127.7084 },
  횡성: { lat: 37.4918, lng: 127.9850 },
} as const;

type CuratedCategory = "spot" | "stay";
type CuratedSubCategory = "yoga" | "healing";

type CuratedPlace = {
  id: string;
  region: string;
  category: CuratedCategory;
  subCategory: CuratedSubCategory;
  name: string;
  addr: string;
  desc: string;
  score: number;
  lat: number;
  lng: number;
  dataSource: "curated";
};

const datasets: Array<{ category: CuratedCategory; subCategory: CuratedSubCategory; prefix: string; compressed: string }> = [
  { category: "spot", subCategory: "yoga", prefix: "yoga", compressed: "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" },
  { category: "stay", subCategory: "healing", prefix: "templestay", compressed: "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" },
];

const museumSan: CuratedPlace = {
  id: "curated-museum-san",
  region: "원주",
  category: "spot",
  subCategory: "yoga",
  name: "뮤지엄 산",
  addr: "강원특별자치도 원주시 지정면 오크밸리2길 260",
  desc: "예술과 자연이 어우러진 공간에서 명상과 휴식을 경험할 수 있는 웰니스 스팟입니다.",
  score: 4.9,
  lat: 37.4219,
  lng: 127.8183,
  dataSource: "curated",
};

export function getCuratedWellnessPlaces(): CuratedPlace[] {
  return [museumSan, ...datasets.flatMap((dataset) => toPlaces(dataset))];
}

function toPlaces(dataset: (typeof datasets)[number]): CuratedPlace[] {
  const csv = gunzipSync(Buffer.from(dataset.compressed, "base64")).toString("utf8");
  return parseCsv(csv).slice(1).flatMap((row, index) => {
    const [name, sourceRegion, description, address, hours, phone] = row.map((value) => value.trim());
    const region = sourceRegion.replace(/[시군]$/, "");
    const coordinates = regionalCoordinates[region as keyof typeof regionalCoordinates];
    if (!name || !address || !coordinates) return [];

    const details = [description, hours && `운영시간 ${hours}`, phone && `문의 ${phone}`].filter(Boolean).join(" · ");
    return [{
      id: `curated-${dataset.prefix}-${index + 1}`,
      region,
      category: dataset.category,
      subCategory: dataset.subCategory,
      name,
      addr: address,
      desc: details,
      score: 4.7,
      ...coordinates,
      dataSource: "curated",
    }];
  });
}

function parseCsv(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === '"') {
      if (quoted && input[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && input[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  row.push(cell);
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
