"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatReadyToStart } from "@/lib/format";

type CandidateProfileStatus = {
  id: number;
  full_name: string;
  city: string;
  district?: string | null;
  primary_role: string;
  ready_to_start: string;
  is_active: boolean;
};

export default function CandidateStartPage() {
  const [candidate, setCandidate] = useState<CandidateProfileStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<CandidateProfileStatus>("/candidates/1")
      .then(setCandidate)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <main className="px-4 py-6">Загрузка...</main>;
  }

  return (
    <main className="space-y-6 px-4 py-6">
      <section className="rounded-2xl border border-slate-200 p-6 shadow-sm">
        <p className="text-sm text-slate-500">Кандидатский контур</p>
        <h1 className="mt-2 text-3xl font-semibold">Добро пожаловать в Hubsty</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Здесь можно заполнить анкету, посмотреть подходящие вакансии,
          отправить отклик и следить за своими статусами.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/onboarding"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Заполнить анкету
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Смотреть вакансии
          </Link>
          <Link
            href="/matches"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Мои отклики
          </Link>
        </div>
      </section>

      {candidate ? (
        <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Текущий статус профиля</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Кандидат</div>
              <div className="mt-1 text-base font-medium">{candidate.full_name}</div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Роль</div>
              <div className="mt-1 text-base font-medium">{candidate.primary_role}</div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Локация</div>
              <div className="mt-1 text-base font-medium">
                {candidate.city}
                {candidate.district ? `, ${candidate.district}` : ""}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Готовность выйти</div>
              <div className="mt-1 text-base font-medium">
                {formatReadyToStart(candidate.ready_to_start)}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
              <div className="text-xs text-slate-500">Статус профиля</div>
              <div className="mt-1 text-base font-medium">
                {candidate.is_active ? "Профиль активен" : "Профиль неактивен"}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}