import { NextRequest } from "next/server";
import { decodeKakaoSession, kakaoAuthCookies } from "@/lib/kakao-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = decodeKakaoSession(request.cookies.get(kakaoAuthCookies.session)?.value);

  return Response.json(
    session
      ? {
          authenticated: true,
          user: session.user,
        }
      : {
          authenticated: false,
          user: null,
        },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
