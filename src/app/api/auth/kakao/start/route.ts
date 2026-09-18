import { NextRequest, NextResponse } from "next/server";
import { createOAuthState, getKakaoRedirectUri, getKakaoRestApiKey, kakaoAuthCookies } from "@/lib/kakao-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const kakaoRestApiKey = getKakaoRestApiKey();

  if (!kakaoRestApiKey) {
    return NextResponse.json(
      {
        ok: false,
        message: "KAKAO_REST_API_KEY is not configured.",
      },
      { status: 500 },
    );
  }

  const origin = request.nextUrl.origin;
  const state = createOAuthState();
  const redirectUri = getKakaoRedirectUri(origin);
  const authorizeUrl = new URL("https://kauth.kakao.com/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", kakaoRestApiKey);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(kakaoAuthCookies.oauthState, state, {
    httpOnly: true,
    maxAge: kakaoAuthCookies.stateMaxAge,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
