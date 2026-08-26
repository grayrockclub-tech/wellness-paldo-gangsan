import { createHmac, randomUUID, timingSafeEqual } from "crypto";

export type KakaoSessionUser = {
  id: string;
  nickname: string;
  email?: string;
  profileImage?: string;
};

export type KakaoSession = {
  user: KakaoSessionUser;
  issuedAt: string;
};

const SESSION_COOKIE_NAME = "wellness_session";
const OAUTH_STATE_COOKIE_NAME = "kakao_oauth_state";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const STATE_MAX_AGE_SECONDS = 60 * 10;

export const kakaoAuthCookies = {
  session: SESSION_COOKIE_NAME,
  oauthState: OAUTH_STATE_COOKIE_NAME,
  sessionMaxAge: SESSION_MAX_AGE_SECONDS,
  stateMaxAge: STATE_MAX_AGE_SECONDS,
};

export function createOAuthState() {
  return randomUUID();
}

export function getKakaoRestApiKey() {
  return process.env.KAKAO_REST_API_KEY?.trim() ?? "";
}

export function getKakaoClientSecret() {
  return process.env.KAKAO_CLIENT_SECRET?.trim() ?? "";
}

export function getKakaoRedirectUri(origin: string) {
  return process.env.KAKAO_REDIRECT_URI?.trim() || `${origin}/api/auth/kakao/callback`;
}

export function encodeKakaoSession(session: KakaoSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = signSessionPayload(payload);
  return `${payload}.${signature}`;
}

export function decodeKakaoSession(value?: string): KakaoSession | null {
  if (!value) return null;

  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = signSessionPayload(payload);
  if (!safeEquals(signature, expectedSignature)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as KakaoSession;
    if (!parsed.user?.id || !parsed.user.nickname) return null;
    return parsed;
  } catch {
    return null;
  }
}

function signSessionPayload(payload: string) {
  const secret =
    process.env.AUTH_SECRET?.trim() ||
    process.env.KAKAO_CLIENT_SECRET?.trim() ||
    process.env.KAKAO_REST_API_KEY?.trim() ||
    "wellness-paldo-gangsan-dev-session";

  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEquals(a: string, b: string) {
  const first = Buffer.from(a);
  const second = Buffer.from(b);
  if (first.byteLength !== second.byteLength) return false;
  return timingSafeEqual(first, second);
}
