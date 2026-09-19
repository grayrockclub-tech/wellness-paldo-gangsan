import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { decodeKakaoSession, kakaoAuthCookies } from "@/lib/kakao-auth";
import { ensureSavedRoutesTable } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

function noStoreJson(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const session = decodeKakaoSession(request.cookies.get(kakaoAuthCookies.session)?.value);
  if (!session) return noStoreJson({ error: "로그인이 필요합니다." }, 401);

  const body = await request.json().catch(() => null) as { id?: unknown } | null;
  const routeId = typeof body?.id === "string" ? body.id : "";
  if (!routeId) return noStoreJson({ error: "공유할 루트를 찾을 수 없습니다." }, 400);

  try {
    const sql = await ensureSavedRoutesTable();
    const rows = await sql`
      UPDATE saved_routes
      SET share_id = COALESCE(share_id, ${randomUUID()})
      WHERE id = ${routeId} AND user_id = ${session.user.id}
      RETURNING share_id
    ` as { share_id: string }[];
    const shareId = rows[0]?.share_id;
    if (!shareId) return noStoreJson({ error: "공유할 루트를 찾을 수 없습니다." }, 404);

    return noStoreJson({ shareId });
  } catch (error) {
    console.error("Failed to create shared route", error);
    return noStoreJson({ error: "공유 링크를 만들지 못했습니다. 잠시 후 다시 시도해주세요." }, 503);
  }
}
