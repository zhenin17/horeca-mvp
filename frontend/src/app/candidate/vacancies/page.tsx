"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
  status: string;
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

type FitExplanation = {
  title: string;
  reasons: string[];
};

type VacancyCardItem = VacancyItem & {
  match?: MatchItem | null;
  fitScore: number;
  fitExplanation: FitExplanation;
};

type VacancyFilter = "all" | "fresh" | "applied";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        initDataUnsafe?: Record<string, unknown>;
      };
    };
  }
}

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

function isTelegramMiniApp() {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(window.Telegram?.WebApp);
}

function formatIncomeText(value?: string | null) {
  return value?.trim() ? value : "Не указано";
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

function formatMatchStatus(status: string) {
  switch (status) {
    case "shortlist":
      return "Отклик принят";
    case "sent":
      return "Отправлено работодателю";
    case "viewed":
      return "Просмотрено работодателем";
    case "invited":
      return "Работодатель хочет связаться";
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

function calculateFitScore(candidate: CandidateItem, vacancy: VacancyItem) {
  let score = 40;

  const candidateRole = candidate.primary_role.trim().toLowerCase();
  const vacancyRole = vacancy.role.trim().toLowerCase();

  if (candidateRole === vacancyRole) {
    score += 25;
  } else if (
    candidateRole.includes(vacancyRole) ||
    vacancyRole.includes(candidateRole)
  ) {
    score += 15;
  }

  if (candidate.city.trim().toLowerCase() === vacancy.city.trim().toLowerCase()) {
    score += 10;
  }

  if (
    candidate.district &&
    vacancy.district &&
    candidate.district.trim().toLowerCase() === vacancy.district.trim().toLowerCase()
  ) {
    score += 10;
  }

  if (candidate.horeca_experience_months >= 12) {
    score += 10;
  } else if (candidate.horeca_experience_months > 0) {
    score += 5;
  }

  if (candidate.ready_to_start?.trim()) {
    score += 5;
  }

  return Math.min(score, 100);
}

function fitScoreLabel(score: number) {
  if (score >= 80) {
    return "Хорошее совпадение";
  }
  if (score >= 65) {
    return "Подходит";
  }
  return "Есть шанс";
}

function vacancyFilterLabel(filter: VacancyFilter) {
  switch (filter) {
    case "all":
      return "Все";
    case "fresh":
      return "Новые";
    case "applied":
      return "С откликом";
    default:
      return "Все";
  }
}

function buildFitExplanation(
  candidate: CandidateItem,
  vacancy: VacancyItem
): FitExplanation {
  const candidateRole = candidate.primary_role.trim().toLowerCase();
  const vacancyRole = vacancy.role.trim().toLowerCase();

  const reasons: string[] = [];
  let title = "Подходит по базовым параметрам";

  if (candidateRole === vacancyRole) {
    title = "Роль полностью совпадает";
  } else if (
    candidateRole.includes(vacancyRole) ||
    vacancyRole.includes(candidateRole)
  ) {
    title = "Роль близка вашему профилю";
  }

  if (candidate.city.trim().toLowerCase() === vacancy.city.trim().toLowerCase()) {
    reasons.push("Ваш город");
  }

  if (
    candidate.district &&
    vacancy.district &&
    candidate.district.trim().toLowerCase() === vacancy.district.trim().toLowerCase()
  ) {
    reasons.push("Ваш район");
  }

  if (candidate.ready_to_start?.trim()) {
    reasons.push(`Можно выйти: ${formatReadyToStart(candidate.ready_to_start)}`);
  }

  if (candidate.expected_income && vacancy.salary_text) {
    reasons.push("Доход близок ожиданиям");
  }

  if (candidate.horeca_experience_months > 0) {
    reasons.push("Есть опыт в HoReCa");
  }

  if (reasons.length === 0) {
    reasons.push("Есть базовое совпадение");
  }

  return {
    title,
    reasons: reasons.slice(0, 3),
  };
}

function getVacancyStatusTone(match?: MatchItem | null) {
  if (!match) {
    return "bg-slate-100 text-slate-700";
  }

  if (["invited", "interviewed", "offered", "hired"].includes(match.status)) {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
  }

  if (["rejected", "no_show"].includes(match.status)) {
    return "bg-slate-100 text-slate-600";
  }

  return "bg-violet-50 text-violet-700 ring-1 ring-violet-100";
}

export default function CandidateVacanciesPage() {
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [candidate, setCandidate] = useState<CandidateItem | null>(null);
  const [vacancies, setVacancies] = useState<VacancyCardItem[]>([]);
  const [filter, setFilter] = useState<VacancyFilter>("all");
  const [isTelegram, setIsTelegram] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      setErrorText("");

      const candidateId = getCurrentCandidateId();

      const [candidateResponse, vacanciesResponse, matchesResponse] =
        await Promise.all([
          fetch(`/api/candidates/${candidateId}`, { cache: "no-store" }),
          fetch("/api/vacancies/", { cache: "no-store" }),
          fetch(`/api/matches/?candidate_id=${candidateId}`, {
            cache: "no-store",
          }),
        ]);

      if (!candidateResponse.ok) {
        throw new Error("Не удалось загрузить кандидата");
      }

      if (!vacanciesResponse.ok) {
        throw new Error("Не удалось загрузить вакансии");
      }

      if (!matchesResponse.ok) {
        throw new Error("Не удалось загрузить отклики");
      }

      const candidateData = await readJsonSafe<CandidateItem>(candidateResponse);
      const vacanciesData = await readJsonSafe<VacancyItem[]>(vacanciesResponse);
      const matchesData = await readJsonSafe<MatchItem[]>(matchesResponse);

      if (!candidateData) {
        throw new Error("Кандидат не найден");
      }

      const matchByVacancyId = new Map<number, MatchItem>();
      for (const match of matchesData || []) {
        matchByVacancyId.set(match.vacancy_id, match);
      }

      const preparedVacancies: VacancyCardItem[] = (vacanciesData || [])
        .map((vacancy) => {
          const fitScore = calculateFitScore(candidateData, vacancy);
          const fitExplanation = buildFitExplanation(candidateData, vacancy);
          const match = matchByVacancyId.get(vacancy.id) || null;

          return {
            ...vacancy,
            match,
            fitScore,
            fitExplanation,
          };
        })
        .sort((a, b) => {
          if (Boolean(a.match) !== Boolean(b.match)) {
            return a.match ? 1 : -1;
          }
          return b.fitScore - a.fitScore;
        });

      setCandidate(candidateData);
      setVacancies(preparedVacancies);
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        setErrorText(error.message);
      } else {
        setErrorText("Не удалось загрузить вакансии");
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
      total: vacancies.length,
      fresh: vacancies.filter((item) => !item.match).length,
      applied: vacancies.filter((item) => Boolean(item.match)).length,
    };
  }, [vacancies]);

  const filteredVacancies = useMemo(() => {
    if (filter === "all") {
      return vacancies;
    }

    if (filter === "fresh") {
      return vacancies.filter((item) => !item.match);
    }

    if (filter === "applied") {
      return vacancies.filter((item) => Boolean(item.match));
    }

    return vacancies;
  }, [vacancies, filter]);

  if (loading) {
    return (
      <main className="px-4 py-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          Загрузка вакансий...
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
    <main className={`px-4 py-6 ${isTelegram ? "space-y-4" : "space-y-6"}`}>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-violet-50 via-white to-white p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm text-slate-500">
                {isTelegram ? "Для вас" : "Кандидат"}
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900">
                Подходящие вакансии
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                {isTelegram
                  ? "Собрали вакансии по вашей роли, району и готовности выйти."
                  : "Здесь собраны вакансии, которые подходят вам по роли, локации и готовности выйти. Если вы уже откликались, это видно сразу."}
              </p>

              {candidate ? (
                <div className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-sm text-slate-600 ring-1 ring-slate-200">
                  {candidate.full_name} · {candidate.primary_role}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {isTelegram ? (
                <button
                  type="button"
                  onClick={() => setShowFilters((prev) => !prev)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Фильтр
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  void loadData();
                }}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Обновить
              </button>

              <Link
                href="/candidate/matches"
                className="rounded-2xl bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white hover:opacity-95"
              >
                Мои отклики
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

      {!isTelegram ? (
        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-500">Всего вакансий</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {stats.total}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-500">Новые для вас</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {stats.fresh}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-500">С откликом</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {stats.applied}
            </div>
          </div>
        </section>
      ) : (
        <section className="flex gap-2 overflow-x-auto pb-1">
          <div className="min-w-[150px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">Всего</div>
            <div className="mt-2 text-xl font-semibold text-slate-900">
              {stats.total}
            </div>
          </div>
          <div className="min-w-[150px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">Новые</div>
            <div className="mt-2 text-xl font-semibold text-slate-900">
              {stats.fresh}
            </div>
          </div>
          <div className="min-w-[150px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">С откликом</div>
            <div className="mt-2 text-xl font-semibold text-slate-900">
              {stats.applied}
            </div>
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        {(!isTelegram || showFilters) && (
          <div className="flex flex-wrap gap-2">
            {(["all", "fresh", "applied"] as VacancyFilter[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                  filter === item
                    ? "bg-violet-600 text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {vacancyFilterLabel(item)}
              </button>
            ))}
          </div>
        )}

        {filteredVacancies.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            По выбранному фильтру вакансий пока нет.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {filteredVacancies.map((vacancy) => (
              <div
                key={vacancy.id}
                className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="text-lg font-semibold text-slate-900">
                        {vacancy.role}
                      </div>
                      <div className="text-sm text-slate-600">
                        {vacancy.venue_name}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        {formatIncomeText(vacancy.salary_text)}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        {vacancy.city}
                        {vacancy.district ? `, ${vacancy.district}` : ""}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        {formatReadyToStart(vacancy.needed_start)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 ring-1 ring-violet-100">
                        {fitScoreLabel(vacancy.fitScore)} · {vacancy.fitScore}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${getVacancyStatusTone(
                          vacancy.match
                        )}`}
                      >
                        {vacancy.match
                          ? formatMatchStatus(vacancy.match.status)
                          : "Еще без отклика"}
                      </span>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-sm font-medium text-slate-900">
                        {vacancy.fitExplanation.title}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {vacancy.fitExplanation.reasons.map((reason) => (
                          <span
                            key={reason}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>

                    {!isTelegram ? (
                      <div className="text-sm text-slate-500">
                        График: {vacancy.schedule_text || "Не указан"}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex min-w-[220px] flex-col gap-2">
                    <Link
                      href={`/candidate/vacancies/${vacancy.id}`}
                      className="rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white hover:opacity-95"
                    >
                      Открыть вакансию
                    </Link>

                    {vacancy.match ? (
                      <Link
                        href="/candidate/matches"
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Смотреть статус
                      </Link>
                    ) : (
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm text-slate-500">
                        Отклик можно отправить внутри вакансии
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}