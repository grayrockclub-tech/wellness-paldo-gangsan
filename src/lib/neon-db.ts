import { neon } from "@neondatabase/serverless";

export function getNeonSql() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured");
  return neon(databaseUrl);
}

export async function ensureSavedRoutesTable() {
  const sql = getNeonSql();
  await sql`
    CREATE TABLE IF NOT EXISTS saved_routes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      route_data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  return sql;
}
