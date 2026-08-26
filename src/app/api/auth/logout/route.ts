import { NextResponse } from "next/server";
import { kakaoAuthCookies } from "@/lib/kakao-auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(kakaoAuthCookies.session, "", {
    maxAge: 0,
    path: "/",
  });

  return response;
}
