"use client";

import { BookmarkPlus, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type SaveStatus = "idle" | "saving" | "saved" | "owned" | "already-saved";

export function SaveSharedRouteButton({ shareId }: { shareId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<SaveStatus>("idle");

  const save = async () => {
    setStatus("saving");
    try {
      const response = await fetch(`/api/shared-routes/${encodeURIComponent(shareId)}/save`, { method: "POST" });
      if (response.status === 401) {
        router.push(`/api/auth/kakao/start?next=${encodeURIComponent(`/share/${shareId}`)}`);
        return;
      }

      const data = await response.json() as { status?: SaveStatus; error?: string };
      if (!response.ok || !data.status) throw new Error(data.error ?? "루트를 저장하지 못했습니다.");
      setStatus(data.status);
    } catch (error) {
      setStatus("idle");
      alert(error instanceof Error ? error.message : "루트를 저장하지 못했습니다.");
    }
  };

  const label = status === "saving" ? "저장 중" : status === "saved" ? "내 루트에 저장됨" : status === "already-saved" ? "이미 저장한 루트" : status === "owned" ? "내가 만든 루트" : "내 루트에 저장";
  const disabled = status !== "idle";

  return (
    <button type="button" onClick={() => void save()} disabled={disabled} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#087a36] bg-white px-5 py-4 text-sm font-black text-[#087a36] transition hover:bg-emerald-50 disabled:cursor-default disabled:opacity-80">
      {status === "saved" || status === "already-saved" || status === "owned" ? <Check size={18} /> : <BookmarkPlus size={18} />}
      {label}
    </button>
  );
}
