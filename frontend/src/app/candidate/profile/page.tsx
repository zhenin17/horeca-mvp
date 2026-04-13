"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

function readyButtonClass(isActive: boolean) {
  return isActive
    ? "rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
    : "rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";
}

function getProfileBadge(candidate: CandidateProfile | null) {
  if (!candidate) {
    return {
      text: "Профиль не загружен",
      className: "border border-slate-200 bg-slate-50 text-slate-600",
    };
  }

  if (!candidate.is_active) {
    return {
      text: "Профиль неактивен",
      className: "border border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    text: "Профиль активен",
    className: "border border-emerald-200 bg-emerald-50 text-emerald-700",
  };
}

function getNextAction(candidate: CandidateProfile | null, dashboard: CandidateDashboard | null) {
  if (!candidate || !dashboard) {
    return {
      title: "Проверьте профиль",
      text: "Сначала убедитесь, что анкета загружена и данные отображаются корректно.",
      href: "/candidate/onboarding",
      label: "Открыть анкету",
    };
  }

  if (!candidate.is_active) {
    return {
      title: "Нужно активировать профиль",
      text: "Пока профиль неактивен, лучше сначала проверить анкету и привести ее в порядок.",
      href: "/candidate/onboarding",
      label: "Проверить анкету",
    };
  }

  if (dashboard.active_matches > 0) {
    return {
      title: "У вас есть активные отклики",
      text: "Сейчас важнее всего быстро смотреть изменения по статусам и не пропускать движение.",
      href: "/candidate/matches",
      label: "Открыть отклики",
    };
  }

  return {
    title: "Можно искать новые вакансии",
    text: "Профиль уже настроен. Следующий логичный шаг — посмотреть подходящие вакансии и откликнуться.",
    href: "/candidate/vacancies",
    label: "Смотреть вакансии",
  };
}

export default function CandidateProfilePage() {
  const [dashboard, setDashboard] = useState<CandidateDashboard | null>(null);
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadData() {
    try {
      setMessage("");

      const [dashboardData, candidateData] = await Promise.all([
        apiFetch<CandidateDashboard>("/candidates/1/dashboard"),
        apiFetch<CandidateProfile>("/candidates/1"),
      ]);

      setDashboard(dashboardData);
      setCandidate(candidateData);
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Не удалось загрузить профиль");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
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

  const profileBadge = useMemo(() => getProfileBadge(candidate), [candidate]);
  const nextAction = useMemo(
    () => getNextAction(candidate, dashboard),
    [candidate, dashboard]
  );

  if (loading) {
    return <main className="px-4 py-6">Загрузка...</main>;
  }

  if (!dashboard || !candidate) {
    return (
      <main className="px-4 py-6">
        {message ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {message}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Не удалось загрузить профиль.
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="space-y-6 px-4 py-6">
      {message ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {message}
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm text-slate-500">Профиль кандидата</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {dashboard.full_name}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Здесь можно быстро проверить свой статус, обновить готовность к выходу
              и перейти туда, где сейчас важнее всего действие.
            </p>
          </div>

          <div
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${profileBadge.className}`}
          >
            {profileBadge.text}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Сейчас главное
          </div>

          <div className="mt-2 text-xl font-semibold text-slate-900">
            {nextAction.title}
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            {nextAction.text}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={nextAction.href}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              {nextAction.label}
            </Link>

            <Link
              href="/candidate/onboarding"
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Редактировать анкету
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Коротко о профиле</h2>
            <p className="mt-1 text-sm text-slate-500">
              Только самое важное, без лишнего шума.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Основная роль</div>
            <div className="mt-1 text-base font-medium text-slate-900">
              {dashboard.primary_role}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Локация</div>
            <div className="mt-1 text-base font-medium text-slate-900">
              {dashboard.city}
              {dashboard.district ? `, ${dashboard.district}` : ""}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Готовность выйти</div>
            <div className="mt-1 text-base font-medium text-slate-900">
              {formatReadyToStart(candidate.ready_to_start)}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Желаемый доход</div>
            <div className="mt-1 text-base font-medium text-slate-900">
              {candidate.expected_income?.trim() ? candidate.expected_income : "Не указан"}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Статусы и результат</h2>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Всего откликов</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {dashboard.total_matches}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Активные</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {dashboard.active_matches}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Нанят</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {dashboard.hired_matches}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Отклонен</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {dashboard.rejected_matches}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Быстро обновить готовность</h2>
        <p className="mt-2 text-sm text-slate-500">
          Это полезно, если хотите сразу показать работодателю, насколько быстро готовы выйти.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void changeReadyToStart("today")}
            disabled={saving}
            className={readyButtonClass(candidate.ready_to_start === "today")}
          >
            Сегодня
          </button>

          <button
            type="button"
            onClick={() => void changeReadyToStart("tomorrow")}
            disabled={saving}
            className={readyButtonClass(candidate.ready_to_start === "tomorrow")}
          >
            Завтра
          </button>

          <button
            type="button"
            onClick={() => void changeReadyToStart("3days")}
            disabled={saving}
            className={readyButtonClass(candidate.ready_to_start === "3days")}
          >
            В течение 3 дней
          </button>

          <button
            type="button"
            onClick={() => void changeReadyToStart("week")}
            disabled={saving}
            className={readyButtonClass(candidate.ready_to_start === "week")}
          >
            В течение недели
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Куда перейти дальше</h2>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/candidate/vacancies"
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Смотреть вакансии
          </Link>

          <Link
            href="/candidate/matches"
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Мои отклики
          </Link>

          <Link
            href="/candidate/start"
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            На стартовую
          </Link>
        </div>
      </section>
    </main>
  );
}