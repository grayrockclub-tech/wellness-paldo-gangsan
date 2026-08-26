"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Database, Loader2, Plus, Save, Trash2 } from "lucide-react";
import type { OperatorPlaceCategory, OperatorPlaceDraft, OperatorPlaceInput } from "@/lib/operator-place";

type SessionUser = {
  id: string;
  nickname: string;
  email?: string;
  profileImage?: string;
};

type SessionResponse = {
  authenticated: boolean;
  user: SessionUser | null;
};

type FormState = {
  name: string;
  region: string;
  category: OperatorPlaceCategory;
  subCategory: string;
  addr: string;
  lat: string;
  lng: string;
  score: string;
  desc: string;
  image: string;
  contact: string;
  homepage: string;
  contentId: string;
  sourceNote: string;
};

const STORAGE_KEY = "wellness_admin_place_drafts";
const GW_GREEN = "#0DB14B";
const GW_BLUE = "#005BAA";

const initialForm: FormState = {
  name: "",
  region: "",
  category: "spot",
  subCategory: "wellness",
  addr: "",
  lat: "",
  lng: "",
  score: "4.8",
  desc: "",
  image: "",
  contact: "",
  homepage: "",
  contentId: "",
  sourceNote: "",
};

const categoryOptions: { id: OperatorPlaceCategory; label: string; defaultSubCategory: string }[] = [
  { id: "spot", label: "웰니스 스팟", defaultSubCategory: "wellness" },
  { id: "food", label: "건강 맛집", defaultSubCategory: "healthy" },
  { id: "stay", label: "힐링 숙소", defaultSubCategory: "healing" },
];

export default function AdminPlacesPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [drafts, setDrafts] = useState<OperatorPlaceDraft[]>(() => {
    if (typeof window === "undefined") return [];

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as OperatorPlaceDraft[]) : [];
    } catch {
      return [];
    }
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: SessionResponse) => setSessionUser(data.authenticated ? data.user : null))
      .catch(() => setSessionUser(null));
  }, []);

  const payload = useMemo(() => toOperatorInput(form), [form]);

  const updateForm = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const handleCategoryChange = (category: OperatorPlaceCategory) => {
    const option = categoryOptions.find((item) => item.id === category);
    setForm((current) => ({
      ...current,
      category,
      subCategory: option?.defaultSubCategory ?? current.subCategory,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setSaveMessage("");

    try {
      const response = await fetch("/api/admin/places", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        setErrors(data.errors ?? { form: "입력값을 다시 확인해주세요." });
        return;
      }

      const draft: OperatorPlaceDraft = {
        ...payload,
        id: data.draft?.id ?? `manual-${Date.now()}`,
        createdAt: data.draft?.createdAt ?? new Date().toISOString(),
      };
      const nextDrafts = [draft, ...drafts].slice(0, 30);
      setDrafts(nextDrafts);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDrafts));
      setForm(initialForm);
      setSaveMessage("초안이 저장되었습니다. DB 연결 후 이 payload를 그대로 전송하면 됩니다.");
    } catch {
      setErrors({ form: "저장 중 오류가 발생했습니다." });
    } finally {
      setIsSaving(false);
    }
  };

  const removeDraft = (id: string) => {
    const nextDrafts = drafts.filter((draft) => draft.id !== id);
    setDrafts(nextDrafts);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDrafts));
  };

  return (
    <main className="min-h-screen bg-[#eef3ee] px-5 py-6 text-[#17211b]">
      <div className="mx-auto grid max-w-[1440px] gap-5 xl:grid-cols-[1fr_420px]">
        <section className="rounded-lg border border-[#d3dfd4] bg-white">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d3dfd4] px-6 py-5">
            <div>
              <Link href="/desktop" className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-[#526158]">
                <ArrowLeft size={16} />
                데스크톱 화면
              </Link>
              <p className="text-sm font-black text-[#0DB14B]">운영자 장소 등록</p>
              <h1 className="mt-1 text-2xl font-black text-[#005BAA]">수동 장소 입력폼</h1>
            </div>
            <div className="rounded-lg border border-[#d3dfd4] bg-[#f7faf6] px-4 py-3 text-sm font-bold text-[#526158]">
              {sessionUser ? `${sessionUser.nickname} 로그인` : "게스트 입력"}
            </div>
          </header>

          <form onSubmit={handleSubmit} className="grid gap-5 p-6 lg:grid-cols-2">
            {errors.form && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 lg:col-span-2">{errors.form}</p>}
            {saveMessage && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 lg:col-span-2">{saveMessage}</p>}

            <Field label="장소명" error={errors.name}>
              <input value={form.name} onChange={(event) => updateForm("name", event.target.value)} className="admin-input" placeholder="예: 오대산 전나무숲길" />
            </Field>

            <Field label="지역" error={errors.region}>
              <input value={form.region} onChange={(event) => updateForm("region", event.target.value)} className="admin-input" placeholder="예: 평창" />
            </Field>

            <Field label="카테고리" error={errors.category}>
              <div className="grid grid-cols-3 gap-2">
                {categoryOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleCategoryChange(option.id)}
                    className={`rounded-lg border px-3 py-3 text-sm font-black transition ${
                      form.category === option.id ? "border-transparent text-white" : "border-[#d3dfd4] bg-[#fbfcf8] text-[#526158]"
                    }`}
                    style={form.category === option.id ? { backgroundColor: GW_BLUE } : undefined}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="세부 분류" error={errors.subCategory}>
              <input value={form.subCategory} onChange={(event) => updateForm("subCategory", event.target.value)} className="admin-input" placeholder="예: yoga, meditation, healthy" />
            </Field>

            <Field label="주소" error={errors.addr}>
              <input value={form.addr} onChange={(event) => updateForm("addr", event.target.value)} className="admin-input" placeholder="강원특별자치도 ..." />
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field label="위도" error={errors.lat}>
                <input value={form.lat} onChange={(event) => updateForm("lat", event.target.value)} className="admin-input" inputMode="decimal" placeholder="37.65" />
              </Field>
              <Field label="경도" error={errors.lng}>
                <input value={form.lng} onChange={(event) => updateForm("lng", event.target.value)} className="admin-input" inputMode="decimal" placeholder="128.68" />
              </Field>
              <Field label="평점" error={errors.score}>
                <input value={form.score} onChange={(event) => updateForm("score", event.target.value)} className="admin-input" inputMode="decimal" placeholder="4.8" />
              </Field>
            </div>

            <Field label="장소 설명" error={errors.desc} wide>
              <textarea value={form.desc} onChange={(event) => updateForm("desc", event.target.value)} className="admin-input min-h-36 resize-y" placeholder="운영자가 직접 작성하거나 TourAPI overview를 보강한 설명을 입력합니다." />
            </Field>

            <Field label="이미지 URL">
              <input value={form.image} onChange={(event) => updateForm("image", event.target.value)} className="admin-input" placeholder="https://..." />
            </Field>

            <Field label="연락처">
              <input value={form.contact} onChange={(event) => updateForm("contact", event.target.value)} className="admin-input" placeholder="033-..." />
            </Field>

            <Field label="홈페이지">
              <input value={form.homepage} onChange={(event) => updateForm("homepage", event.target.value)} className="admin-input" placeholder="https://..." />
            </Field>

            <Field label="TourAPI contentId">
              <input value={form.contentId} onChange={(event) => updateForm("contentId", event.target.value)} className="admin-input" placeholder="수동 장소면 비워둬도 됩니다." />
            </Field>

            <Field label="운영 메모" wide>
              <textarea value={form.sourceNote} onChange={(event) => updateForm("sourceNote", event.target.value)} className="admin-input min-h-24 resize-y" placeholder="검수 상태, 데이터 출처, 등록 요청자 등을 남깁니다." />
            </Field>

            <div className="flex flex-wrap gap-3 lg:col-span-2">
              <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-black text-white shadow-sm disabled:bg-slate-300" style={!isSaving ? { backgroundColor: GW_BLUE } : undefined}>
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                초안 저장
              </button>
              <button type="button" onClick={() => setForm(initialForm)} className="inline-flex items-center gap-2 rounded-lg border border-[#d3dfd4] bg-[#fbfcf8] px-5 py-3 text-sm font-black text-[#526158]">
                <Plus size={18} />
                새 입력
              </button>
            </div>
          </form>
        </section>

        <aside className="grid gap-5">
          <section className="rounded-lg border border-[#d3dfd4] bg-white p-5">
            <h2 className="flex items-center gap-2 text-lg font-black text-[#005BAA]">
              <Database size={20} />
              DB 연결 준비
            </h2>
            <p className="mt-3 text-sm font-bold leading-6 text-[#526158]">
              동료가 DB를 준비하면 `/api/admin/places`의 저장 부분만 실제 insert로 교체하면 됩니다.
            </p>
            <pre className="mt-4 max-h-72 overflow-auto rounded-lg bg-[#17211b] p-4 text-xs leading-5 text-white">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </section>

          <section className="rounded-lg border border-[#d3dfd4] bg-white">
            <div className="flex items-center justify-between border-b border-[#d3dfd4] px-5 py-4">
              <h2 className="text-lg font-black text-[#17211b]">저장된 초안</h2>
              <span className="rounded-md bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-700">{drafts.length}개</span>
            </div>
            <div className="max-h-[560px] overflow-auto p-5">
              {drafts.length === 0 ? (
                <p className="rounded-lg bg-[#f7faf6] px-4 py-10 text-center text-sm font-bold text-[#8a978f]">아직 저장된 장소 초안이 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {drafts.map((draft) => (
                    <article key={draft.id} className="rounded-lg border border-[#d3dfd4] bg-[#fbfcf8] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-black text-[#17211b]">{draft.name}</h3>
                          <p className="mt-1 text-xs font-bold text-[#526158]">{draft.region} · {getCategoryLabel(draft.category)}</p>
                        </div>
                        <button type="button" onClick={() => removeDraft(draft.id)} className="rounded-lg border border-[#d3dfd4] bg-white p-2 text-[#526158]">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p className="mt-3 line-clamp-2 text-xs font-medium leading-5 text-[#526158]">{draft.desc}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>

      <style jsx>{`
        .admin-input {
          width: 100%;
          border-radius: 8px;
          border: 1px solid #d3dfd4;
          background: #fbfcf8;
          padding: 12px 14px;
          font-size: 14px;
          font-weight: 700;
          color: #17211b;
          outline: none;
        }

        .admin-input:focus {
          border-color: ${GW_GREEN};
          box-shadow: 0 0 0 3px rgba(13, 177, 75, 0.1);
        }
      `}</style>
    </main>
  );
}

function Field({
  label,
  error,
  wide,
  children,
}: {
  label: string;
  error?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`block ${wide ? "lg:col-span-2" : ""}`}>
      <span className="mb-2 block text-sm font-black text-[#526158]">{label}</span>
      {children}
      {error && <span className="mt-2 block text-xs font-bold text-red-600">{error}</span>}
    </label>
  );
}

function toOperatorInput(form: FormState): OperatorPlaceInput {
  return {
    name: form.name.trim(),
    region: form.region.trim(),
    category: form.category,
    subCategory: form.subCategory.trim(),
    addr: form.addr.trim(),
    lat: parseOptionalNumber(form.lat),
    lng: parseOptionalNumber(form.lng),
    score: Number(form.score),
    desc: form.desc.trim(),
    image: form.image.trim() || undefined,
    contact: form.contact.trim() || undefined,
    homepage: form.homepage.trim() || undefined,
    contentId: form.contentId.trim() || undefined,
    sourceNote: form.sourceNote.trim() || undefined,
  };
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) return null;
  return Number(value);
}

function getCategoryLabel(category: OperatorPlaceCategory) {
  if (category === "food") return "건강 맛집";
  if (category === "stay") return "힐링 숙소";
  return "웰니스 스팟";
}
