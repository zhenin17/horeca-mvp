"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

function getProfileStatusText(candidate: CandidateProfileStatus | null) {
  if (!candidate) {
    return "Профиль пока не загружен";
  }

  if (!candidate.is_active) {
    return "Профиль неактивен";
  }

  return "Профиль активен";
}

function detectTelegramWebApp() {
  if (typeof window === "undefined") {
    return false;
  }

  const w = window as typeof window & {
    Telegram?: {
      WebApp?: unknown;
    };
  };

  return Boolean(w.Telegram?.WebApp);
}

export default function CandidateStartPage() {
  const [candidate, setCandidate] = useState<CandidateProfileStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    setIsTelegram(detectTelegramWebApp());

    apiFetch<CandidateProfileStatus>("/candidates/1")
      .then((data) => {
        setCandidate(data);
        setErrorText("");
      })
      .catch((error) => {
        console.error(error);
        if (error instanceof Error) {
          setErrorText(error.message);
        } else {
          setErrorText("Не удалось загрузить профиль");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const nextStep = useMemo(() => {
    if (!candidate) {
      return {
        title: "Начните с анкеты",
        text: "Заполните или проверьте анкету, чтобы вакансии и отклики отображались корректно.",
        primaryHref: "/candidate/onboarding",
        primaryLabel: "Заполнить анкету",
        secondaryHref: "/candidate/profile",
        secondaryLabel: "Открыть профиль",
      };
    }

    if (!candidate.is_active) {
      return {
        title: "Сначала проверьте анкету",
        text: "Профиль нужно привести в порядок, чтобы можно было нормально искать работу.",
        primaryHref: "/candidate/onboarding",
        primaryLabel: "Открыть анкету",
        secondaryHref: "/candidate/profile",
        secondaryLabel: "Профиль",
      };
    }

    return {
      title: "Можно переходить к вакансиям",
      text: "Профиль уже заполнен. Теперь смотрите подходящие вакансии и откликайтесь.",
      primaryHref: "/candidate/vacancies",
      primaryLabel: "Смотреть вакансии",
      secondaryHref: "/candidate/matches",
      secondaryLabel: "Мои отклики",
    };
  }, [candidate]);

  if (loading) {
    return <main className="px-4 py-6">Загрузка...</main>;
  }

  if (isTelegram) {
    return (
      <main className="space-y-5 px-4 py-5">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Hubsty</p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Найти работу стало проще
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Без лишних экранов: анкета, подходящие вакансии и понятные статусы откликов.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Следующий шаг
            </div>

            <div className="mt-2 text-lg font-semibold text-slate-900">
              {nextStep.title}
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {nextStep.text}
            </p>

            <div className="mt-5 flex flex-col gap-3">
              <Link
                href={nextStep.primaryHref}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-center text-sm font-semibold text-white transition hover:opacity-90"
              >
                {nextStep.primaryLabel}
              </Link>

              <Link
                href={nextStep.secondaryHref}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {nextStep.secondaryLabel}
              </Link>
            </div>
          </div>
        </section>

        {errorText ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorText}
          </div>
        ) : null}

        {candidate ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Ваш профиль</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Коротко о главном.
                </p>
              </div>

              <div
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  candidate.is_active
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border border-amber-200 bg-amber-50 text-amber-700"
                }`}
              >
                {getProfileStatusText(candidate)}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs text-slate-500">Роль</div>
                <div className="mt-1 text-base font-medium text-slate-900">
                  {candidate.primary_role}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs text-slate-500">Локация</div>
                <div className="mt-1 text-base font-medium text-slate-900">
                  {candidate.city}
                  {candidate.district ? `, ${candidate.district}` : ""}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs text-slate-500">Готовность выйти</div>
                <div className="mt-1 text-base font-medium text-slate-900">
                  {formatReadyToStart(candidate.ready_to_start)}
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </main>
    );
  }

  return (
    <main className="space-y-6 px-4 py-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-slate-500">Кандидатский контур</p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Добро пожаловать в Hubsty
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Здесь все просто: заполните анкету, посмотрите подходящие вакансии,
            отправьте отклик и следите за статусом без перегруза.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Следующий шаг
          </div>

          <div className="mt-2 text-xl font-semibold text-slate-900">
            {nextStep.title}
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            {nextStep.text}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={nextStep.primaryHref}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              {nextStep.primaryLabel}
            </Link>

            <Link
              href="/candidate/matches"
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Мои отклики
            </Link>
          </div>
        </div>
      </section>

      {errorText ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorText}
        </div>
      ) : null}

      {candidate ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Ваш профиль сейчас</h2>
              <p className="mt-1 text-sm text-slate-500">
                Коротко и по делу — чтобы понимать, все ли настроено нормально.
              </p>
            </div>

            <div
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                candidate.is_active
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {getProfileStatusText(candidate)}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Кандидат</div>
              <div className="mt-1 text-base font-medium text-slate-900">
                {candidate.full_name}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Основная роль</div>
              <div className="mt-1 text-base font-medium text-slate-900">
                {candidate.primary_role}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Локация</div>
              <div className="mt-1 text-base font-medium text-slate-900">
                {candidate.city}
                {candidate.district ? `, ${candidate.district}` : ""}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Готовность выйти</div>
              <div className="mt-1 text-base font-medium text-slate-900">
                {formatReadyToStart(candidate.ready_to_start)}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/candidate/onboarding"
              className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Редактировать анкету
            </Link>

            <Link
              href="/candidate/vacancies"
              className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Перейти к вакансиям
            </Link>
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Как это работает</h2>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">1. Анкета</div>
            <div className="mt-2 text-sm leading-6 text-slate-600">
              Заполняете профиль один раз, чтобы система понимала ваш опыт, роль и локацию.
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">2. Вакансии</div>
            <div className="mt-2 text-sm leading-6 text-slate-600">
              Смотрите подходящие предложения и быстро понимаете, где есть смысл откликаться.
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">3. Отклики</div>
            <div className="mt-2 text-sm leading-6 text-slate-600">
              Следите за статусами без путаницы: просмотрели, пригласили, отказали или взяли.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}