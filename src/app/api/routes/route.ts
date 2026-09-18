import { NextRequest } from "next/server";
import { decodeKakaoSession, kakaoAuthCookies } from "@/lib/kakao-auth";
import { ensureSavedRoutesTable } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

type SavedRouteRow = {
  id: string;
  route_data: unknown;
  created_at: string;
};

function requireUserId(request: NextRequest) {
  const session = decodeKakaoSession(request.cookies.get(kakaoAuthCookies.session)?.value);
  if (!session) return null;
  return session.user.id;
}

function noStoreJson(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: NextRequest) {
  const userId = requireUserId(request);
  if (!userId) return noStoreJson({ error: "로그인이 필요합니다." }, 401);

  try {
    const sql = await ensureSavedRoutesTable();
    const rows = await sql`
      SELECT id, route_data, created_at
      FROM saved_routes
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    ` as SavedRouteRow[];
    const plans = rows.map((row) => ({
      ...(typeof row.route_data === "string" ? JSON.parse(row.route_data) : row.route_data as object),
      id: row.id,
      date: new Date(row.created_at).toLocaleDateString("ko-KR"),
    }));
    return noStoreJson({ plans });
  } catch (error) {
    console.error("Failed to load saved routes", error);
    return noStoreJson({ error: "저장된 루트를 불러오지 못했습니다." }, 503);
  }
}

export async function POST(request: NextRequest) {
  const userId = requireUserId(request);
  if (!userId) return noStoreJson({ error: "로그인이 필요합니다." }, 401);

  try {
    const body = await request.json() as { plan?: unknown };
    if (!body.plan || typeof body.plan !== "object") return noStoreJson({ error: "저장할 루트 정보가 없습니다." }, 400);

    const id = crypto.randomUUID();
    const sql = await ensureSavedRoutesTable();
    const rows = await sql`
      INSERT INTO saved_routes (id, user_id, route_data)
      VALUES (${id}, ${userId}, ${JSON.stringify(body.plan)}::jsonb)
      RETURNING id, route_data, created_at
    ` as SavedRouteRow[];
    const row = rows[0];
    return noStoreJson({
      plan: {
        ...(typeof row.route_data === "string" ? JSON.parse(row.route_data) : row.route_data as object),
        id: row.id,
        date: new Date(row.created_at).toLocaleDateString("ko-KR"),
      },
    }, 201);
  } catch (error) {
    console.error("Failed to save route", error);
    return noStoreJson({ error: "루트를 저장하지 못했습니다. 잠시 후 다시 시도해주세요." }, 503);
  }
}

export async function DELETE(request: NextRequest) {
  const userId = requireUserId(request);
  if (!userId) return noStoreJson({ error: "로그인이 필요합니다." }, 401);

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return noStoreJson({ error: "삭제할 루트를 찾을 수 없습니다." }, 400);

  try {
    const sql = await ensureSavedRoutesTable();
    const rows = await sql`
      DELETE FROM saved_routes
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id
    ` as { id: string }[];
    if (!rows[0]) return noStoreJson({ error: "삭제할 루트를 찾을 수 없습니다." }, 404);
    return noStoreJson({ id: rows[0].id });
  } catch (error) {
    console.error("Failed to delete saved route", error);
    return noStoreJson({ error: "저장된 루트를 삭제하지 못했습니다." }, 503);
  }
}
