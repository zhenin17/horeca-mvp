"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, normalizeMediaUrl } from "@/lib/api";
import { formatReadyToStart, formatSalary } from "@/lib/format";

type CandidatePhoto = {
  id: number;
  candidate_id?: number;
  photo_url: string;
  sort_order?: number;
  is_cover?: boolean | null;
  is_main?: boolean | null;
  created_at?: string | null;
};

type CandidateItem = {
  id: number;
  full_name: string;
  phone: string;
  telegram_username?: string | null;
  city: string;
  district?: string | null;
  primary_role: string;
  horeca_experience_months: number;
  ready_to_start: string;
  expected_income?: string | null;
  is_active: boolean;

  // Optional: /me/staff/candidates already returns photos through CandidateRead.
  photos?: CandidatePhoto[] | null;
};

function getStatusClass(isActive: boolean): string {
  if (isActive) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

function getStatusText(isActive: boolean): string {
  return isActive ? "Активен" : "Неактивен";
}

function getInitials(fullName: string): string {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getMainPhoto(candidate: CandidateItem): CandidatePhoto | null {
  if (!candidate.photos || candidate.photos.length === 0) {
    return null;
  }

  return (
    candidate.photos.find((photo) => photo.is_cover || photo.is_main) ||
    candidate.photos[0]
  );
}

export default function AdminCandidatesPage() {
  const [candidates, setCandidates] = useState<CandidateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    async function loadCandidates() {
      try {
        setErrorText("");
        const data = await apiFetch<CandidateItem[]>("/me/staff/candidates");
        setCandidates(data);
      } catch (error) {
        console.error(error);
        if (error instanceof Error) {
          setErrorText(error.message);
        } else {
          setErrorText("Не удалось загрузить кандидатов");
        }
      } finally {
        setLoading(false);
      }
    }

    loadCandidates();
  }, []);

  const counters = useMemo(() => {
    return candidates.reduce(
      (acc, candidate) => {
        acc.total += 1;

        if (candidate.is_active) {
          acc.active += 1;
        } else {
          acc.inactive += 1;
        }

        return acc;
      },
      {
        total: 0,
        active: 0,
        inactive: 0,
      }
    );
  }, [candidates]);

  if (loading) {
    return <main className="px-4 py-6">Загрузка кандидатов...</main>;
  }

  return (
    <main className="px-4 py-6 space-y-6">
      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Админка · Кандидаты</h1>
            <p className="mt-1 text-sm text-slate-500">
              MVP-список для просмотра профилей и модерации кандидатов.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Всего кандидатов: <span className="font-semibold">{counters.total}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Всего</div>
            <div className="mt-1 text-xl font-semibold">{counters.total}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Активные</div>
            <div className="mt-1 text-xl font-semibold">{counters.active}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Неактивные</div>
            <div className="mt-1 text-xl font-semibold">{counters.inactive}</div>
          </div>
        </div>

        {errorText ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorText}
          </div>
        ) : candidates.length === 0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            Пока нет кандидатов.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {candidates.map((candidate) => {
              const mainPhoto = getMainPhoto(candidate);
              const photoUrl = mainPhoto
                ? normalizeMediaUrl(mainPhoto.photo_url) || ""
                : "";

              return (
                <div
                  key={candidate.id}
                  className="rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50/60"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={`Фото кандидата ${candidate.id}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-slate-500">
                            {getInitials(candidate.full_name)}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-medium">
                            #{candidate.id} · {candidate.full_name}
                          </div>

                          <span
                            className={`rounded-full border px-2 py-1 text-xs font-medium ${getStatusClass(
                              candidate.is_active
                            )}`}
                          >
                            {getStatusText(candidate.is_active)}
                          </span>
                        </div>

                        <div className="mt-1 text-sm text-slate-700">
                          {candidate.primary_role}
                        </div>

                        <div className="mt-1 text-sm text-slate-600">
                          {candidate.city}
                          {candidate.district ? `, ${candidate.district}` : ""}
                        </div>

                        <div className="mt-2 grid gap-1 text-sm text-slate-500 sm:grid-cols-2">
                          <div>Опыт: {candidate.horeca_experience_months} мес.</div>
                          <div>
                            Готовность: {formatReadyToStart(candidate.ready_to_start)}
                          </div>
                          <div>Доход: {formatSalary(candidate.expected_income)}</div>
                          <div>Телефон: {candidate.phone}</div>
                          <div>Telegram: {candidate.telegram_username || "-"}</div>
                          <div>ID: {candidate.id}</div>
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/admin/candidates/${candidate.id}`}
                      className="shrink-0 rounded-xl border border-slate-300 px-4 py-2 text-center text-sm font-medium hover:bg-white sm:hover:bg-slate-50"
                    >
                      Открыть
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}