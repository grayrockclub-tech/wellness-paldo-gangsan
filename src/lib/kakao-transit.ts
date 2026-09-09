export type TransitRoute = {
  status: "ready" | "unavailable" | "no-route";
  durationMinutes?: number;
  transfers?: number;
  fare?: number;
  mode?: "BUS" | "SUBWAY" | "BUS_AND_SUBWAY" | "MIXED";
  landingUrl?: string;
  steps?: TransitStep[];
  message?: string;
};

export type TransitStep = {
  type: "BUS" | "SUBWAY" | "WALKING" | "OTHER";
  guidance: string;
  durationMinutes?: number;
  vehicles?: string[];
  stops?: string[];
};

export type TransitOrigin = {
  name: string;
  lat: number;
  lng: number;
};
