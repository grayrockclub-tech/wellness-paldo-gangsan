import { NextRequest } from "next/server";
import { decodeKakaoSession, kakaoAuthCookies } from "@/lib/kakao-auth";
import { validateOperatorPlaceInput, type OperatorPlaceInput } from "@/lib/operator-place";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const input = (await request.json()) as Partial<OperatorPlaceInput>;
  const errors = validateOperatorPlaceInput(input);

  if (Object.keys(errors).length > 0) {
    return Response.json({ ok: false, errors }, { status: 400 });
  }

  const session = decodeKakaoSession(request.cookies.get(kakaoAuthCookies.session)?.value);
  const draft = {
    ...input,
    id: `manual-${Date.now()}`,
    createdAt: new Date().toISOString(),
    submittedBy: session?.user ?? null,
  };

  return Response.json(
    {
      ok: true,
      mode: "pending-db",
      message: "DB 연결 전 임시 접수입니다. 현재 브라우저 초안 저장과 API payload 확인 용도로 사용합니다.",
      draft,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
