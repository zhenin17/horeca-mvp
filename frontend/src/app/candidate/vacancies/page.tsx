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

function formatIncomeText(value?: string | null) {
  return value?.trim() ? value : "Не указано";
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
      return "Новые для меня";
    case "applied":
      return "С откликом";
    default:
      return "Все";
  }
}

function buildFitExplanation(candidate: CandidateItem, vacancy: VacancyItem): FitExplanation {
  const candidateRole = candidate.primary_role.trim().toLowerCase();
  const vacancyRole = vacancy.role.trim().toLowerCase();

  const reasons: string[] = [];
  let title = "Подходит по базовым параметрам";

  if (candidateRole === vacancyRole) {
    title = "Главное: роль полностью совпадает";
  } else if (
    candidateRole.includes(vacancyRole) ||
    vacancyRole.includes(candidateRole)
  ) {
    title = "Главное: роль близка к вашему профилю";
  }

  if (candidate.city.trim().toLowerCase() === vacancy.city.trim().toLowerCase()) {
    reasons.push("Вакансия в вашем городе");
  }

  if (
    candidate.district &&
    vacancy.district &&
    candidate.district.trim().toLowerCase() === vacancy.district.trim().toLowerCase()
  ) {
    reasons.push("Район совпадает");
  }

  if (candidate.ready_to_start?.trim()) {
    reasons.push(`Вы готовы выйти: ${candidate.ready_to_start}`);
  }

  if (candidate.expected_income && vacancy.salary_text) {
    reasons.push("Доход выглядит близким к вашим ожиданиям");
  }

  if (candidate.horeca_experience_months > 0) {
    reasons.push("У вас уже есть опыт в HoReCa");
  }

  if (reasons.length === 0) {
    reasons.push("Есть базовое совпадение по вашему профилю");
  }

  return {
    title,
    reasons: reasons.slice(0, 2),
  };
}

export default function CandidateVacanciesPage() {
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [candidate, setCandidate] = useState<CandidateItem | null>(null);
  const [vacancies, setVacancies] = useState<VacancyCardItem[]>([]);
  const [filter, setFilter] = useState<VacancyFilter>("all");

  async function loadData() {
    try {
      setLoading(true);
      setErrorText("");

      const candidateId = getCurrentCandidateId();

      const [candidateResponse, vacanciesResponse, matchesResponse] = await Promise.all([
        fetch(`/api/candidates/${candidateId}`, { cache: "no-store" }),
        fetch("/api/vacancies", { cache: "no-store" }),
        fetch(`/api/matches?candidate_id=${candidateId}`, { cache: "no-store" }),
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
    return <main className="px-4 py-6">Загрузка вакансий...</main>;
  }

  if (errorText && !candidate) {
    return (
      <main className="px-4 py-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorText}
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6 px-4 py-6">
      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm text-slate-500">Кандидат</p>
            <h1 className="mt-2 text-2xl font-semibold">Подходящие вакансии</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Здесь собраны вакансии, которые подходят вам по роли, локации и
              готовности выйти. Если вы уже откликались, это видно сразу.
            </p>
            {candidate ? (
              <div className="mt-3 text-sm text-slate-500">
                {candidate.full_name} · {candidate.primary_role}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                void loadData();
              }}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Обновить
            </button>

            <Link
              href="/candidate/matches"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Мои отклики
            </Link>
          </div>
        </div>
      </section>

      {errorText ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorText}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="text-sm text-slate-500">Всего вакансий</div>
          <div className="mt-2 text-2xl font-semibold">{stats.total}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="text-sm text-slate-500">Новые для вас</div>
          <div className="mt-2 text-2xl font-semibold">{stats.fresh}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="text-sm text-slate-500">С откликом</div>
          <div className="mt-2 text-2xl font-semibold">{stats.applied}</div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {(["all", "fresh", "applied"] as VacancyFilter[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-xl border px-3 py-2 text-sm ${
                filter === item
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 hover:bg-slate-50"
              }`}
            >
              {vacancyFilterLabel(item)}
            </button>
          ))}
        </div>

        {filteredVacancies.length === 0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            По выбранному фильтру вакансий пока нет.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {filteredVacancies.map((vacancy) => (
              <div
                key={vacancy.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="font-medium">
                      {vacancy.role} · {vacancy.venue_name}
                    </div>

                    <div className="text-sm text-slate-600">
                      {vacancy.city}
                      {vacancy.district ? `, ${vacancy.district}` : ""}
                    </div>

                    <div className="text-sm text-slate-500">
                      Доход: {formatIncomeText(vacancy.salary_text)}
                    </div>

                    <div className="text-sm text-slate-500">
                      График: {vacancy.schedule_text || "Не указан"}
                    </div>

                    <div className="text-sm text-slate-500">
                      Нужен выход: {vacancy.needed_start || "Не указано"}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs">
                        {fitScoreLabel(vacancy.fitScore)} · {vacancy.fitScore}
                      </span>

                      {vacancy.match ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-800">
                          {formatMatchStatus(vacancy.match.status)}
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs">
                          Еще без отклика
                        </span>
                      )}
                    </div>

                    <div className="pt-2">
                      <div className="text-sm font-medium text-slate-900">
                        {vacancy.fitExplanation.title}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {vacancy.fitExplanation.reasons.map((reason) => (
                          <span
                            key={reason}
                            className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex min-w-[220px] flex-col gap-2">
                    <Link
                      href={`/candidate/vacancies/${vacancy.id}`}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-center text-sm font-medium hover:bg-slate-50"
                    >
                      Открыть вакансию
                    </Link>

                    {vacancy.match ? (
                      <Link
                        href="/candidate/matches"
                        className="rounded-xl border border-slate-300 px-4 py-2 text-center text-sm font-medium hover:bg-slate-50"
                      >
                        Смотреть мой статус
                      </Link>
                    ) : null}
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