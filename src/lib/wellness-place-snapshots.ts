import { getNeonSql } from "@/lib/neon-db";
import { getWellnessPlacesFromTourApi, type WellnessPlace, type WellnessPlacesResult } from "@/lib/tour-places";

export type WellnessPlaceSnapshot = Pick<WellnessPlacesResult, "source" | "places"> & {
  snapshotDate: string;
  generatedAt: string;
};

type SnapshotRow = {
  snapshot_date: string;
  source: WellnessPlacesResult["source"];
  places: WellnessPlace[] | string;
  generated_at: string;
};

function koreanDateKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function rowToSnapshot(row: SnapshotRow): WellnessPlaceSnapshot {
  return {
    snapshotDate: row.snapshot_date,
    source: row.source,
    places: typeof row.places === "string" ? JSON.parse(row.places) : row.places,
    generatedAt: row.generated_at,
  };
}

export async function ensureWellnessPlaceSnapshotsTable() {
  const sql = getNeonSql();
  await sql`
    CREATE TABLE IF NOT EXISTS wellness_place_snapshots (
      snapshot_date TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      places JSONB NOT NULL,
      warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
      generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  return sql;
}

export async function getLatestWellnessPlaceSnapshot(): Promise<WellnessPlaceSnapshot | null> {
  const sql = await ensureWellnessPlaceSnapshotsTable();
  const rows = await sql`
    SELECT snapshot_date, source, places, generated_at
    FROM wellness_place_snapshots
    ORDER BY snapshot_date DESC
    LIMIT 1
  ` as SnapshotRow[];
  return rows[0] ? rowToSnapshot(rows[0]) : null;
}

export async function getCurrentWellnessPlaceSnapshot(): Promise<WellnessPlaceSnapshot> {
  const latest = await getLatestWellnessPlaceSnapshot();
  if (latest?.places.some((place) => place.dataSource === "wellness-tour")) return latest;
  return await refreshWellnessPlaceSnapshot();
}

export async function refreshWellnessPlaceSnapshot(): Promise<WellnessPlaceSnapshot> {
  const result = await getWellnessPlacesFromTourApi();
  const sql = await ensureWellnessPlaceSnapshotsTable();
  const snapshotDate = koreanDateKey();
  const rows = await sql`
    INSERT INTO wellness_place_snapshots (snapshot_date, source, places, warnings, generated_at)
    VALUES (${snapshotDate}, ${result.source}, ${JSON.stringify(result.places)}::jsonb, ${JSON.stringify(result.warnings)}::jsonb, NOW())
    ON CONFLICT (snapshot_date) DO UPDATE SET
      source = EXCLUDED.source,
      places = EXCLUDED.places,
      warnings = EXCLUDED.warnings,
      generated_at = EXCLUDED.generated_at
    RETURNING snapshot_date, source, places, generated_at
  ` as SnapshotRow[];
  return rowToSnapshot(rows[0]);
}
