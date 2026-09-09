export type TransitRoute = {
  status: "ready" | "unavailable" | "no-route";
  durationMinutes?: number;
  transfers?: number;
  fare?: number;
  mode?: "BUS" | "SUBWAY" | "BUS_AND_SUBWAY" | "MIXED";
  landingUrl?: string;
  message?: string;
};

export type TransitOrigin = {
  name: string;
  lat: number;
  lng: number;
};
