"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatReadyToStart } from "@/lib/format";
import type { CandidateDashboard } from "@/lib/types";

type CandidateProfile = {
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
};

export default function ProfilePage() {
  const [dashboard, setDashboard] = useState<CandidateDashboard | null>(null);
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadData() {
    try {
      const [dashboardData, candidateData] = await Promise.all([
        apiFetch<CandidateDashboard>("/candidates/1/dashboard"),
        apiFetch<CandidateProfile>("/candidates/1"),
      ]);

      setDashboard(dashboardData);
      setCandidate(candidateData);
    } catch (error) {
      console.error(error);
      setMessage("Не удалось загрузить профиль");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function changeReadyToStart(value: string) {
    if (!candidate) return;

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/candidates/1", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: candidate.full_name,
          phone: candidate.phone,
          telegram_username: candidate.telegram_username || null,
          city: candidate.city,
          district: candidate.district || null,
          primary_role: candidate.primary_role,
          horeca_experience_months: candidate.horeca_experience_months,
          ready_to_start: value,
          expected_income: candidate.expected_income || null,
        }),
      });

      const data = (await response.json()) as { detail?: string };

      if (!response.ok) {
        throw new Error(data.detail || "Не удалось обновить готовность");
      }

      setMessage("Готовность обновлена");
      await loadData();
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Не удалось обновить готовность");
      }
    } finally {
      setSaving(false);
    }
  }

  if (!dashboard || !candidate) {
    return <main className="px-4 py-6">Загрузка...</main>;
  }

  return (
    <main className="space-y-6 px-4 py-6">
      {message ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          {message}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Профиль кандидата</p>
            <h1 className="mt-1 text-2xl font-semibold">{dashboard.full_name}</h1>
          </div>

          <Link
            href="/onboarding"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Редактировать анкету
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Роль</div>
            <div className="mt-1 text-base font-medium">{dashboard.primary_role}</div>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Локация</div>
            <div className="mt-1 text-base font-medium">
              {dashboard.city}
              {dashboard.district ? `, ${dashboard.district}` : ""}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Всего откликов</div>
            <div className="mt-1 text-base font-medium">{dashboard.total_matches}</div>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Активные отклики</div>
            <div className="mt-1 text-base font-medium">{dashboard.active_matches}</div>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Нанят</div>
            <div className="mt-1 text-base font-medium">{dashboard.hired_matches}</div>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Отклонен</div>
            <div className="mt-1 text-base font-medium">{dashboard.rejected_matches}</div>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
            <div className="text-xs text-slate-500">Текущая готовность выйти</div>
            <div className="mt-1 text-base font-medium">
              {formatReadyToStart(candidate.ready_to_start)}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Быстро обновить готовность</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => changeReadyToStart("today")}
            disabled={saving}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            Сегодня
          </button>
          <button
            onClick={() => changeReadyToStart("tomorrow")}
            disabled={saving}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            Завтра
          </button>
          <button
            onClick={() => changeReadyToStart("3days")}
            disabled={saving}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            В течение 3 дней
          </button>
          <button
            onClick={() => changeReadyToStart("week")}
            disabled={saving}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            В течение недели
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Что делать дальше</h2>
        <div className="mt-4 flex flex-wrap gap-3">
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
          <Link
            href="/candidate-start"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            На стартовую страницу
          </Link>
        </div>
      </section>
    </main>
  );
}