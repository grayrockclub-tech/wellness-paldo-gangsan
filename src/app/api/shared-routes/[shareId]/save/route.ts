import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { decodeKakaoSession, kakaoAuthCookies } from "@/lib/kakao-auth";
import { ensureSavedRoutesTable } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

type SharedRouteRow = { user_id: string; route_data: unknown };

function noStoreJson(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ shareId: string }> }) {
  const session = decodeKakaoSession(request.cookies.get(kakaoAuthCookies.session)?.value);
  if (!session) return noStoreJson({ error: "로그인이 필요합니다." }, 401);

  const { shareId } = await params;
  try {
    const sql = await ensureSavedRoutesTable();
    const sourceRows = await sql`
      SELECT user_id, route_data
      FROM saved_routes
      WHERE share_id = ${shareId}
      LIMIT 1
    ` as SharedRouteRow[];
    const source = sourceRows[0];
    if (!source) return noStoreJson({ error: "공유 루트를 찾을 수 없습니다." }, 404);
    if (source.user_id === session.user.id) return noStoreJson({ status: "owned" });

    const savedRows = await sql`
      SELECT id
      FROM saved_routes
      WHERE user_id = ${session.user.id} AND saved_from_share_id = ${shareId}
      LIMIT 1
    ` as { id: string }[];
    if (savedRows[0]) return noStoreJson({ status: "already-saved" });

    await sql`
      INSERT INTO saved_routes (id, user_id, route_data, saved_from_share_id)
      VALUES (${randomUUID()}, ${session.user.id}, ${JSON.stringify(source.route_data)}::jsonb, ${shareId})
    `;
    return noStoreJson({ status: "saved" }, 201);
  } catch (error) {
    console.error("Failed to save a shared route", error);
    return noStoreJson({ error: "공유 루트를 내 목록에 저장하지 못했습니다. 잠시 후 다시 시도해주세요." }, 503);
  }
}
