"use client";

import { MessageCircle } from "lucide-react";
import { useState } from "react";

type KakaoSdk = {
  init: (key: string) => void;
  isInitialized: () => boolean;
  Share: {
    sendDefault: (message: {
      objectType: "text";
      text: string;
      link: { mobileWebUrl: string; webUrl: string };
      buttonTitle: string;
    }) => void;
    sendScrap: (message: { requestUrl: string }) => void;
  };
};

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

let sdkPromise: Promise<KakaoSdk> | null = null;

function loadKakaoSdk(appKey: string) {
  if (window.Kakao?.isInitialized()) return Promise.resolve(window.Kakao);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<KakaoSdk>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-kakao-share-sdk="true"]');
    const initialize = () => {
      const kakao = window.Kakao;
      if (!kakao) {
        reject(new Error("카카오 공유 SDK를 불러오지 못했습니다."));
        return;
      }
      if (!kakao.isInitialized()) kakao.init(appKey);
      resolve(kakao);
    };

    if (existing) {
      existing.addEventListener("load", initialize, { once: true });
      existing.addEventListener("error", () => reject(new Error("카카오 공유 SDK를 불러오지 못했습니다.")), { once: true });
      if (window.Kakao) initialize();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.3/kakao.min.js";
    script.async = true;
    script.dataset.kakaoShareSdk = "true";
    script.onload = initialize;
    script.onerror = () => reject(new Error("카카오 공유 SDK를 불러오지 못했습니다."));
    document.head.appendChild(script);
  });

  return sdkPromise;
}

export function KakaoShareButton({ routeId, className = "" }: { routeId: string; className?: string }) {
  const [isSharing, setIsSharing] = useState(false);

  const share = async () => {
    setIsSharing(true);
    try {
      const response = await fetch("/api/routes/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: routeId }),
      });
      const data = await response.json() as { shareId?: string; error?: string };
      if (!response.ok || !data.shareId) throw new Error(data.error ?? "공유 링크를 만들지 못했습니다.");

      const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
      if (!appKey) throw new Error("카카오 공유용 JavaScript 키가 설정되지 않았습니다.");

      const shareUrl = `${window.location.origin}/share/${data.shareId}`;
      const kakao = await loadKakaoSdk(appKey);
      kakao.Share.sendScrap({ requestUrl: shareUrl });
    } catch (error) {
      alert(error instanceof Error ? error.message : "카카오톡 공유를 시작하지 못했습니다.");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <button type="button" onClick={() => void share()} disabled={isSharing} className={`flex items-center gap-1 rounded-lg border border-[#F0D900] bg-[#FEE500] px-3 py-2 text-xs font-black text-[#191919] disabled:opacity-60 ${className}`}>
      <MessageCircle size={13} fill="currentColor" />
      {isSharing ? "준비 중" : "공유"}
    </button>
  );
}
