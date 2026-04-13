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
      WebApp?: {
        initData?: string;
      };
    };
  };

  return Boolean(w.Telegram?.WebApp?.initData?.trim());
}

function getCurrentCandidateId() {
  if (typeof window === "undefined") {
    return 1;
  }

  const possibleKeys = [
    "hubsty_candidate_id",
    "candidateId",
    "selectedCandidateId",
  ];

  for (const key of possibleKeys) {
    const value = window.localStorage.getItem(key);
    const id = Number(value);
    if (Number.isFinite(id) && id > 0) {
      return id;
    }
  }

  return 1;
}

export default function CandidateStartPage() {
  const [candidate, setCandidate] = useState<CandidateProfileStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    setIsTelegram(detectTelegramWebApp());

    const candidateId = getCurrentCandidateId();

    apiFetch<CandidateProfileStatus>(`/candidates/${candidateId}`)
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
    return (
      <main className="px-4 py-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          Загрузка...
        </div>
      </main>
    );
  }

  const heroLabel = isTelegram ? "Hubsty" : "Кандидатский контур";
  const heroTitle = isTelegram ? "Найти работу стало проще" : "Добро пожаловать в Hubsty";
  const heroText = isTelegram
    ? "Без лишних экранов: анкета, подходящие вакансии и понятные статусы откликов."
    : "Здесь все просто: заполните анкету, посмотрите подходящие вакансии, отправьте отклик и следите за статусом без перегруза.";

  return (
    <main className={`px-4 ${isTelegram ? "space-y-5 py-5" : "space-y-6 py-6"}`}>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-violet-50 via-white to-white p-5 md:p-6">
          <div className={isTelegram ? "" : "max-w-2xl"}>
            <p
              className={`font-medium ${
                isTelegram
                  ? "text-sm text-slate-500"
                  : "text-xs uppercase tracking-[0.16em] text-violet-600"
              }`}
            >
              {heroLabel}
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              {heroTitle}
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600">{heroText}</p>

            {candidate ? (
              <div className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-sm text-slate-600 ring-1 ring-slate-200">
                {candidate.primary_role}
              </div>
            ) : null}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-4 md:p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Следующий шаг
            </div>

            <div className="mt-2 text-lg font-semibold text-slate-900 md:text-xl">
              {nextStep.title}
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-600">{nextStep.text}</p>

            <div className={`mt-5 flex ${isTelegram ? "flex-col" : "flex-wrap"} gap-3`}>
              <Link
                href={nextStep.primaryHref}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-center text-sm font-semibold text-white transition hover:opacity-90"
              >
                {nextStep.primaryLabel}
              </Link>

              <Link
                href={nextStep.secondaryHref}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {nextStep.secondaryLabel}
              </Link>
            </div>
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className={`${isTelegram ? "text-lg" : "text-xl"} font-semibold text-slate-900`}>
                {isTelegram ? "Ваш профиль" : "Ваш профиль сейчас"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {isTelegram
                  ? "Коротко о главном."
                  : "Коротко и по делу — чтобы понимать, все ли настроено нормально."}
              </p>
            </div>

            <div
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                candidate.is_active
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {getProfileStatusText(candidate)}
            </div>
          </div>

          {isTelegram ? (
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
          ) : (
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
          )}

          {!isTelegram ? (
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
          ) : null}
        </section>
      ) : null}

      {!isTelegram ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Как это работает</h2>

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
      ) : null}
    </main>
  );
}