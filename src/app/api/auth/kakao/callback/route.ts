import { NextRequest, NextResponse } from "next/server";
import {
  encodeKakaoSession,
  getKakaoClientSecret,
  getKakaoRedirectUri,
  getKakaoRestApiKey,
  kakaoAuthCookies,
  type KakaoSessionUser,
} from "@/lib/kakao-auth";

export const dynamic = "force-dynamic";

type KakaoTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type KakaoUserResponse = {
  id?: number;
  properties?: {
    nickname?: string;
    profile_image?: string;
  };
  kakao_account?: {
    email?: string;
    profile?: {
      nickname?: string;
      profile_image_url?: string;
      thumbnail_image_url?: string;
    };
  };
};

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const savedState = request.cookies.get(kakaoAuthCookies.oauthState)?.value;
  const returnTo = getSafeReturnPath(request.cookies.get(kakaoAuthCookies.oauthReturnTo)?.value) ?? "/?tab=home";
  const redirectTarget = new URL(returnTo, request.nextUrl.origin);

  if (!code || !state || !savedState || state !== savedState) {
    redirectTarget.searchParams.set("auth", "failed");
    return clearStateCookie(NextResponse.redirect(redirectTarget));
  }

  const kakaoRestApiKey = getKakaoRestApiKey();
  if (!kakaoRestApiKey) {
    redirectTarget.searchParams.set("auth", "missing-key");
    return clearStateCookie(NextResponse.redirect(redirectTarget));
  }

  try {
    const token = await requestKakaoToken({
      code,
      clientId: kakaoRestApiKey,
      redirectUri: getKakaoRedirectUri(request.nextUrl.origin),
      clientSecret: getKakaoClientSecret(),
    });
    if (!token.access_token) throw new Error(token.error_description || token.error || "Kakao token request failed");

    const kakaoUser = await requestKakaoUser(token.access_token);
    const user = normalizeKakaoUser(kakaoUser);
    if (!user) throw new Error("Kakao user profile is empty");

    const response = clearStateCookie(NextResponse.redirect(redirectTarget));
    response.cookies.set(
      kakaoAuthCookies.session,
      encodeKakaoSession({
        user,
        issuedAt: new Date().toISOString(),
      }),
      {
        httpOnly: true,
        maxAge: kakaoAuthCookies.sessionMaxAge,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    );

    return response;
  } catch (error) {
    console.error(error);
    redirectTarget.searchParams.set("auth", "failed");
    return clearStateCookie(NextResponse.redirect(redirectTarget));
  }
}

async function requestKakaoToken({
  code,
  clientId,
  redirectUri,
  clientSecret,
}: {
  code: string;
  clientId: string;
  redirectUri: string;
  clientSecret: string;
}) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code,
  });

  if (clientSecret) body.set("client_secret", clientSecret);

  const response = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body,
  });

  return (await response.json()) as KakaoTokenResponse;
}

async function requestKakaoUser(accessToken: string) {
  const response = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
  });

  if (!response.ok) throw new Error(`Kakao profile request failed: ${response.status}`);
  return (await response.json()) as KakaoUserResponse;
}

function normalizeKakaoUser(kakaoUser: KakaoUserResponse): KakaoSessionUser | null {
  if (!kakaoUser.id) return null;

  const nickname =
    kakaoUser.kakao_account?.profile?.nickname ||
    kakaoUser.properties?.nickname ||
    "카카오 여행자";

  return {
    id: String(kakaoUser.id),
    nickname,
    email: kakaoUser.kakao_account?.email,
    profileImage: kakaoUser.kakao_account?.profile?.profile_image_url || kakaoUser.kakao_account?.profile?.thumbnail_image_url || kakaoUser.properties?.profile_image,
  };
}

function clearStateCookie(response: NextResponse) {
  response.cookies.set(kakaoAuthCookies.oauthState, "", {
    maxAge: 0,
    path: "/",
  });
  response.cookies.set(kakaoAuthCookies.oauthReturnTo, "", {
    maxAge: 0,
    path: "/",
  });
  return response;
}

function getSafeReturnPath(value?: string) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : null;
}
