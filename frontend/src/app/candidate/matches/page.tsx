"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getCurrentCandidateId } from "@/lib/current-user";

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
};

type VacancyItem = {
  id: number;
  employer_id: number;
  role: string;
  venue_name: string;
  city: string;
  district?: string | null;
  salary_text?: string | null;
  schedule_text?: string | null;
  needed_start?: string | null;
  listing_type?: "job" | "part_time" | "shift";
  shift_date?: string | null;
  shift_start_time?: string | null;
  shift_end_time?: string | null;
  urgent_flag?: boolean;
  slots_count?: number | null;
  status: string;
};

type EmployerItem = {
  id: number;
  company_name: string;
  contact_name: string;
  phone: string;
  telegram_username?: string | null;
  city: string;
  website?: string | null;
};

type MatchItem = {
  id: number;
  candidate_id: number;
  employer_id: number;
  vacancy_id: number;
  match_score?: number | null;
  status: string;
  comment?: string | null;
};

type EnrichedMatchItem = MatchItem & {
  vacancy?: VacancyItem | null;
  employer?: EmployerItem | null;
};

type MatchFilter = "all" | "unseen" | "viewed" | "in_work" | "finished";
type ListingTypeFilter = "all" | "job" | "part_time" | "shift";

async function readJsonSafe<T>(response: Response): Promise<T | null> {
  const text = await response.text();

  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function isTelegramMiniApp() {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(window.Telegram?.WebApp);
}

function statusLabel(status: string) {
  switch (status) {
    case "shortlist":
      return "Отклик принят";
    case "sent":
      return "Отправлен работодателю";
    case "viewed":
      return "Работодатель посмотрел";
    case "invited":
      return "Приглашают связаться";
    case "interviewed":
      return "Идет общение";
    case "offered":
      return "Есть предложение";
    case "hired":
      return "Вас приняли";
    case "rejected":
      return "Не подошло";
    case "no_show":
      return "Процесс остановлен";
    default:
      return status || "—";
  }
}

function statusHint(status: string) {
  switch (status) {
    case "shortlist":
      return "Отклик уже принят системой и ждет следующего шага.";
    case "sent":
      return "Ваш отклик уже ушел работодателю, но решения пока нет.";
    case "viewed":
      return "Работодатель уже посмотрел вашу кандидатуру.";
    case "invited":
      return "Контакт уже открыт. Можно написать или позвонить работодателю.";
    case "interviewed":
      return "По вакансии уже идет следующий этап общения.";
    case "offered":
      return "По вам есть позитивное решение.";
    case "hired":
      return "Найм подтвержден.";
    case "rejected":
      return "По этой вакансии процесс завершился не в вашу пользу.";
    case "no_show":
      return "Движение по этой вакансии остановилось.";
    default:
      return "Статус обновляется.";
  }
}

function nextStepHint(status: string) {
  switch (status) {
    case "shortlist":
    case "sent":
      return "Можно спокойно ждать и параллельно смотреть другие вакансии.";
    case "viewed":
      return "Вас уже увидели. Сейчас лучше просто быть на связи.";
    case "invited":
      return "Лучший следующий шаг — написать или позвонить работодателю.";
    case "interviewed":
      return "Лучше продолжить контакт и не терять темп общения.";
    case "offered":
      return "Сейчас лучше быстро связаться и уточнить детали выхода.";
    case "hired":
      return "Этот отклик завершен успешно.";
    case "rejected":
    case "no_show":
      return "Лучше сфокусироваться на других активных откликах.";
    default:
      return "Следите за обновлениями.";
  }
}

function belongsToFilter(status: string, filter: MatchFilter) {
  if (filter === "all") {
    return true;
  }

  if (filter === "unseen") {
    return ["shortlist", "sent"].includes(status);
  }

  if (filter === "viewed") {
    return ["viewed"].includes(status);
  }

  if (filter === "in_work") {
    return ["invited", "interviewed", "offered"].includes(status);
  }

  if (filter === "finished") {
    return ["hired", "rejected", "no_show"].includes(status);
  }

  return true;
}

function filterLabel(filter: MatchFilter) {
  switch (filter) {
    case "all":
      return "Все";
    case "unseen":
      return "Новые";
    case "viewed":
      return "Просмотрены";
    case "in_work":
      return "В работе";
    case "finished":
      return "Завершены";
    default:
      return "Все";
  }
}

function filterHint(filter: MatchFilter) {
  switch (filter) {
    case "all":
      return "Полная картина по всем откликам.";
    case "unseen":
      return "Здесь отклики, по которым работодатель еще не дошел до просмотра.";
    case "viewed":
      return "Здесь вакансии, где вас уже увидели.";
    case "in_work":
      return "Здесь уже есть движение: контакт, общение или предложение.";
    case "finished":
      return "Завершенные процессы: успех, отказ или остановка.";
    default:
      return "";
  }
}

function listingTypeFilterLabel(filter: ListingTypeFilter) {
  switch (filter) {
    case "job":
      return "Работа";
    case "part_time":
      return "Подработка";
    case "shift":
      return "Смены";
    case "all":
    default:
      return "Все типы";
  }
}

function listingTypeFilterHint(filter: ListingTypeFilter) {
  switch (filter) {
    case "job":
      return "Только обычные вакансии постоянной работы.";
    case "part_time":
      return "Только подработка и частичная занятость.";
    case "shift":
      return "Только смены с конкретной датой и временем.";
    case "all":
    default:
      return "Все отклики по всем типам вакансий.";
  }
}

function cardAccentClasses(status: string) {
  if (status === "invited") {
    return "border-emerald-200 bg-emerald-50/70";
  }

  if (status === "viewed") {
    return "border-violet-200 bg-violet-50/70";
  }

  if (status === "offered") {
    return "border-emerald-200 bg-emerald-50/70";
  }

  if (["hired", "rejected", "no_show"].includes(status)) {
    return "border-slate-200 bg-slate-50";
  }

  return "border-slate-200 bg-white";
}

function statusPillClasses(status: string) {
  if (status === "invited" || status === "offered" || status === "hired") {
    return "border border-emerald-200 bg-emerald-100 text-emerald-900";
  }

  if (status === "viewed") {
    return "border border-violet-200 bg-violet-100 text-violet-900";
  }

  if (status === "rejected" || status === "no_show") {
    return "border border-slate-200 bg-slate-100 text-slate-700";
  }

  return "border border-slate-200 bg-slate-100 text-slate-800";
}

function scoreLabel(score: number) {
  if (score >= 80) {
    return "Хорошее совпадение";
  }
  if (score >= 65) {
    return "Подходит";
  }
  return "Есть шанс";
}

function compactSalary(value?: string | null) {
  return value?.trim() ? value : "Не указано";
}

function compactLocation(vacancy?: VacancyItem | null) {
  if (!vacancy) {
    return "Локация не указана";
  }

  if (vacancy.city && vacancy.district) {
    return `${vacancy.city}, ${vacancy.district}`;
  }

  return vacancy.city || vacancy.district || "Локация не указана";
}

function formatReadyToStart(value?: string | null) {
  if (!value?.trim()) {
    return "Не указано";
  }

  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case "today":
    case "сегодня":
      return "Сегодня";
    case "tomorrow":
    case "завтра":
      return "Завтра";
    case "3days":
    case "3_days":
    case "3 дня":
      return "В течение 3 дней";
    case "week":
    case "неделя":
      return "В течение недели";
    default:
      return value;
  }
}

function canContactEmployer(status: string) {
  return ["invited", "interviewed", "offered", "hired"].includes(status);
}

function normalizePhoneHref(phone?: string | null) {
  if (!phone?.trim()) {
    return null;
  }

  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : null;
}

function normalizeTelegramHref(username?: string | null) {
  if (!username?.trim()) {
    return null;
  }

  const cleaned = username.trim().replace(/^@/, "");
  return cleaned ? `https://t.me/${cleaned}` : null;
}

function getListingTypeLabel(type?: VacancyItem["listing_type"]) {
  switch (type) {
    case "part_time":
      return "Подработка";
    case "shift":
      return "Смена";
    case "job":
    default:
      return "Работа";
  }
}

function getListingTypeTone(type?: VacancyItem["listing_type"]) {
  switch (type) {
    case "part_time":
      return "bg-violet-50 text-violet-700 ring-1 ring-violet-100";
    case "shift":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
    case "job":
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  }
}

function formatShiftTimeLine(vacancy?: VacancyItem | null) {
  if (!vacancy) {
    return null;
  }

  if (!vacancy.shift_date && !vacancy.shift_start_time && !vacancy.shift_end_time) {
    return null;
  }

  const date = vacancy.shift_date || "Дата не указана";

  if (vacancy.shift_start_time && vacancy.shift_end_time) {
    return `${date} · ${vacancy.shift_start_time}–${vacancy.shift_end_time}`;
  }

  if (vacancy.shift_start_time) {
    return `${date} · с ${vacancy.shift_start_time}`;
  }

  return date;
}

function getOpenActionText(vacancy?: VacancyItem | null) {
  if (!vacancy) {
    return "Открыть вакансию";
  }

  if (vacancy.listing_type === "shift") {
    return "Открыть смену";
  }

  if (vacancy.listing_type === "part_time") {
    return "Открыть подработку";
  }

  return "Открыть вакансию";
}

function belongsToListingTypeFilter(
  item: EnrichedMatchItem,
  filter: ListingTypeFilter
) {
  if (filter === "all") {
    return true;
  }

  return (item.vacancy?.listing_type || "job") === filter;
}

export default function CandidateMatchesPage() {
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [candidate, setCandidate] = useState<CandidateItem | null>(null);
  const [matches, setMatches] = useState<EnrichedMatchItem[]>([]);
  const [filter, setFilter] = useState<MatchFilter>("all");
  const [listingTypeFilter, setListingTypeFilter] =
    useState<ListingTypeFilter>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [isTelegram, setIsTelegram] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      setErrorText("");

      const candidateId = getCurrentCandidateId();

      const [candidateResponse, matchesResponse, vacanciesResponse, employersResponse] =
        await Promise.all([
          fetch(`/api/candidates/${candidateId}`, { cache: "no-store" }),
          fetch(`/api/matches/?candidate_id=${candidateId}`, { cache: "no-store" }),
          fetch("/api/vacancies/", { cache: "no-store" }),
          fetch("/api/employers/", { cache: "no-store" }),
        ]);

      if (!candidateResponse.ok) {
        throw new Error("Не удалось загрузить данные кандидата");
      }

      if (!matchesResponse.ok) {
        throw new Error("Не удалось загрузить отклики");
      }

      if (!vacanciesResponse.ok) {
        throw new Error("Не удалось загрузить вакансии");
      }

      if (!employersResponse.ok) {
        throw new Error("Не удалось загрузить работодателей");
      }

      const candidateData = await readJsonSafe<CandidateItem>(candidateResponse);
      const matchesData = await readJsonSafe<MatchItem[]>(matchesResponse);
      const vacanciesData = await readJsonSafe<VacancyItem[]>(vacanciesResponse);
      const employersData = await readJsonSafe<EmployerItem[]>(employersResponse);

      if (!candidateData) {
        throw new Error("Кандидат не найден");
      }

      const vacanciesMap = new Map<number, VacancyItem>();
      for (const vacancy of vacanciesData || []) {
        vacanciesMap.set(vacancy.id, vacancy);
      }

      const employersMap = new Map<number, EmployerItem>();
      for (const employer of employersData || []) {
        employersMap.set(employer.id, employer);
      }

      const enrichedMatches: EnrichedMatchItem[] = (matchesData || [])
        .map((match) => ({
          ...match,
          vacancy: vacanciesMap.get(match.vacancy_id) || null,
          employer: employersMap.get(match.employer_id) || null,
        }))
        .sort((a, b) => b.id - a.id);

      setCandidate(candidateData);
      setMatches(enrichedMatches);
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        setErrorText(error.message);
      } else {
        setErrorText("Не удалось загрузить отклики");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setIsTelegram(isTelegramMiniApp());
    void loadData();
  }, []);

  const stats = useMemo(() => {
    return {
      total: matches.length,
      unseen: matches.filter((item) => ["shortlist", "sent"].includes(item.status))
        .length,
      viewed: matches.filter((item) => item.status === "viewed").length,
      inWork: matches.filter((item) =>
        ["invited", "interviewed", "offered"].includes(item.status)
      ).length,
      finished: matches.filter((item) =>
        ["hired", "rejected", "no_show"].includes(item.status)
      ).length,
    };
  }, [matches]);

  const nextStepText = useMemo(() => {
    if (stats.inWork > 0) {
      return "Сейчас главное — не просто ждать, а быстро выходить на связь там, где контакт уже открыт.";
    }

    if (stats.viewed > 0) {
      return "Работодатели уже посмотрели часть откликов. Лучше периодически проверять обновления.";
    }

    if (stats.unseen > 0) {
      return "Новые отклики уже отправлены. Пока можно спокойно ждать и смотреть другие вакансии.";
    }

    if (stats.total > 0) {
      return "По текущим откликам движение спокойное. Можно открыть новые вакансии и расширить выбор.";
    }

    return "Пока откликов нет. Начните с подходящих вакансий.";
  }, [stats]);

  const filteredMatches = useMemo(() => {
    return matches
      .filter((item) => belongsToFilter(item.status, filter))
      .filter((item) => belongsToListingTypeFilter(item, listingTypeFilter));
  }, [matches, filter, listingTypeFilter]);

  if (loading) {
    return (
      <main className="px-4 py-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          Загрузка откликов...
        </div>
      </main>
    );
  }

  if (errorText && !candidate) {
    return (
      <main className="px-4 py-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorText}
        </div>
      </main>
    );
  }

  return (
    <main className={`space-y-5 px-4 py-5 ${isTelegram ? "" : "md:space-y-6 md:py-6"}`}>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-violet-50 via-white to-white p-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-600">
                  Отклики
                </p>

                <h1 className="mt-2 text-2xl font-semibold text-slate-900">
                  Что сейчас по вашим вакансиям
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Здесь видно, где работодатель еще не дошел до отклика, где уже
                  посмотрел вас и где уже можно переходить к живому контакту.
                </p>

                {candidate ? (
                  <div className="mt-3 inline-flex rounded-full bg-violet-50 px-3 py-1 text-sm text-violet-700 ring-1 ring-violet-100">
                    {candidate.primary_role}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Что делать сейчас
              </div>

              <div className="mt-2 text-sm leading-6 text-slate-700">
                {nextStepText}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  void loadData();
                }}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                Обновить статусы
              </button>

              <Link
                href="/candidate/vacancies"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
              >
                Смотреть вакансии
              </Link>

              <button
                type="button"
                onClick={() => setShowFilters((prev) => !prev)}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50 sm:ml-auto"
              >
                {showFilters ? "Скрыть фильтры" : "Фильтры"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {errorText ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorText}
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Всего</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">
            {stats.total}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Новых</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">
            {stats.unseen}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Есть движение</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">
            {stats.inWork}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Завершены</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">
            {stats.finished}
          </div>
        </div>
      </section>

      {showFilters ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            По статусу
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {(["all", "unseen", "viewed", "in_work", "finished"] as MatchFilter[]).map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    filter === item
                      ? "bg-slate-900 text-white"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {filterLabel(item)}
                </button>
              )
            )}
          </div>

          <div className="mt-3 text-sm text-slate-500">{filterHint(filter)}</div>

          <div className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            По типу
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {(["all", "job", "part_time", "shift"] as ListingTypeFilter[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setListingTypeFilter(item)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  listingTypeFilter === item
                    ? "bg-violet-600 text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {listingTypeFilterLabel(item)}
              </button>
            ))}
          </div>

          <div className="mt-3 text-sm text-slate-500">
            {listingTypeFilterHint(listingTypeFilter)}
          </div>
        </section>
      ) : null}

      {filteredMatches.length === 0 ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="max-w-md">
            <h2 className="text-lg font-semibold text-slate-900">
              Пока здесь пусто
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              По выбранным фильтрам откликов сейчас нет. Можно посмотреть новые
              вакансии и откликнуться на подходящие.
            </p>
            <div className="mt-4">
              <Link
                href="/candidate/vacancies"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                Перейти к вакансиям
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="space-y-4">
          {filteredMatches.map((match) => {
            const vacancy = match.vacancy;
            const employer = match.employer;
            const score = match.match_score ?? 0;
            const contactOpened = canContactEmployer(match.status);
            const phoneHref = normalizePhoneHref(employer?.phone);
            const telegramHref = normalizeTelegramHref(employer?.telegram_username);

            return (
              <article
                key={match.id}
                className={`rounded-3xl border p-4 shadow-sm md:p-5 ${cardAccentClasses(
                  match.status
                )}`}
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${statusPillClasses(
                            match.status
                          )}`}
                        >
                          {statusLabel(match.status)}
                        </span>

                        <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs text-slate-700">
                          Совпадение: {scoreLabel(score)} · {score}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${getListingTypeTone(
                            vacancy?.listing_type
                          )}`}
                        >
                          {getListingTypeLabel(vacancy?.listing_type)}
                        </span>

                        {vacancy?.urgent_flag ? (
                          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-100">
                            Срочно
                          </span>
                        ) : null}
                      </div>

                      <h2 className="mt-3 text-xl font-semibold text-slate-900">
                        {vacancy?.role || "Вакансия"}
                      </h2>

                      <div className="mt-1 text-sm text-slate-700">
                        {vacancy?.venue_name || "Без названия"}
                      </div>

                      {vacancy?.listing_type === "shift" && formatShiftTimeLine(vacancy) ? (
                        <div className="mt-2 text-sm font-medium text-slate-700">
                          {formatShiftTimeLine(vacancy)}
                        </div>
                      ) : null}

                      {employer ? (
                        <div className="mt-1 text-sm text-slate-500">
                          Работодатель: {employer.company_name}
                        </div>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-white/80 px-3 py-1 text-xs text-slate-700">
                          {compactLocation(vacancy)}
                        </span>
                        <span className="rounded-full bg-white/80 px-3 py-1 text-xs text-slate-700">
                          Доход: {compactSalary(vacancy?.salary_text)}
                        </span>
                        <span className="rounded-full bg-white/80 px-3 py-1 text-xs text-slate-700">
                          {vacancy?.listing_type === "shift"
                            ? `Дата и время: ${formatShiftTimeLine(vacancy) || "Не указаны"}`
                            : `График: ${vacancy?.schedule_text || "Не указан"}`}
                        </span>
                        <span className="rounded-full bg-white/80 px-3 py-1 text-xs text-slate-700">
                          Выход: {formatReadyToStart(vacancy?.needed_start)}
                        </span>
                      </div>
                    </div>

                    <div className="w-full md:w-[340px]">
                      <div className="rounded-2xl bg-white/80 p-4">
                        <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                          Что это значит
                        </div>

                        <div className="mt-2 text-sm font-medium text-slate-900">
                          {statusHint(match.status)}
                        </div>

                        <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-700">
                          {nextStepHint(match.status)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {match.comment ? (
                    <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-700">
                      <span className="font-medium text-slate-900">
                        Комментарий:
                      </span>{" "}
                      {match.comment}
                    </div>
                  ) : null}

                  {contactOpened ? (
                    <div className="rounded-2xl border border-emerald-200 bg-white/90 p-4">
                      <div className="text-sm font-semibold text-emerald-900">
                        Можно связаться с работодателем
                      </div>

                      <div className="mt-2 space-y-1 text-sm text-emerald-900">
                        <div>
                          Компания: {employer?.company_name || "Не указано"}
                        </div>
                        <div>
                          Контакт: {employer?.contact_name || "Не указано"}
                        </div>
                        <div>
                          Телефон: {employer?.phone || "Не указан"}
                        </div>
                        <div>
                          Telegram:{" "}
                          {employer?.telegram_username
                            ? `@${employer.telegram_username}`
                            : "Не указан"}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        {phoneHref ? (
                          <a
                            href={phoneHref}
                            className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
                          >
                            Позвонить
                          </a>
                        ) : null}

                        {telegramHref ? (
                          <a
                            href={telegramHref}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center rounded-2xl border border-emerald-300 bg-white px-4 py-3 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50"
                          >
                            Написать в Telegram
                          </a>
                        ) : null}

                        {!phoneHref && !telegramHref ? (
                          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                            Контакт открыт, но у работодателя не заполнены телефон и Telegram.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Link
                      href={`/candidate/vacancies/${match.vacancy_id}`}
                      className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
                    >
                      {getOpenActionText(vacancy)}
                    </Link>

                    <Link
                      href="/candidate/vacancies"
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                    >
                      Смотреть другие вакансии
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}