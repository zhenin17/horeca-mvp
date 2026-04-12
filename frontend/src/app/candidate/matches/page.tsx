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

type EnrichedMatchItem = MatchItem & {
  vacancy?: VacancyItem | null;
};

type MatchFilter = "all" | "unseen" | "viewed" | "in_work" | "finished";

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

function statusLabel(status: string) {
  switch (status) {
    case "shortlist":
      return "Отклик принят";
    case "sent":
      return "Отклик отправлен работодателю";
    case "viewed":
      return "Работодатель посмотрел отклик";
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

function statusHint(status: string) {
  switch (status) {
    case "shortlist":
      return "Ваш отклик принят системой и ждет следующего шага.";
    case "sent":
      return "Отклик уже отправлен работодателю, но решение пока не принято.";
    case "viewed":
      return "Работодатель уже увидел вашу кандидатуру и может вернуться с решением позже.";
    case "invited":
      return "Ваш контакт открыт работодателю. Ждите сообщения или звонка.";
    case "interviewed":
      return "По вашей кандидатуре уже идет следующий этап общения.";
    case "offered":
      return "По вам есть положительное решение. Скоро должен быть следующий шаг.";
    case "hired":
      return "Найм подтвержден работодателем.";
    case "rejected":
      return "По этой вакансии процесс завершен не в вашу пользу.";
    case "no_show":
      return "По этой вакансии движение остановилось.";
    default:
      return "Статус обновляется.";
  }
}

function nextStepHint(status: string) {
  switch (status) {
    case "shortlist":
    case "sent":
      return "Пока можно спокойно ждать ответа и смотреть другие вакансии.";
    case "viewed":
      return "Вас уже увидели. Сейчас лучше дождаться решения работодателя.";
    case "invited":
      return "Проверьте Telegram и телефон: с вами могут связаться в ближайшее время.";
    case "interviewed":
      return "Будьте на связи и держите удобное время для следующего контакта.";
    case "offered":
      return "Похоже, процесс идет в хорошую сторону. Будьте готовы быстро ответить.";
    case "hired":
      return "Этот отклик завершен успешно.";
    case "rejected":
    case "no_show":
      return "Лучше сосредоточиться на других активных откликах.";
    default:
      return "Следите за обновлением статуса.";
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
      return "Не просмотрены";
    case "viewed":
      return "Просмотрены";
    case "in_work":
      return "Есть движение";
    case "finished":
      return "Завершены";
    default:
      return "Все";
  }
}

function cardAccentClasses(status: string) {
  if (status === "invited") {
    return "border-emerald-300 bg-emerald-50";
  }

  if (status === "viewed") {
    return "border-sky-200 bg-sky-50";
  }

  if (["hired", "rejected", "no_show"].includes(status)) {
    return "border-slate-200 bg-slate-50";
  }

  return "border-slate-200 bg-white";
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

export default function CandidateMatchesPage() {
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [candidate, setCandidate] = useState<CandidateItem | null>(null);
  const [matches, setMatches] = useState<EnrichedMatchItem[]>([]);
  const [filter, setFilter] = useState<MatchFilter>("all");

  async function loadData() {
    try {
      setLoading(true);
      setErrorText("");

      const candidateId = getCurrentCandidateId();

      const [candidateResponse, matchesResponse, vacanciesResponse] = await Promise.all([
        fetch(`/api/candidates/${candidateId}`, { cache: "no-store" }),
        fetch(`/api/matches/?candidate_id=${candidateId}`, { cache: "no-store" }),
        fetch("/api/vacancies/", { cache: "no-store" }),
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

      const candidateData = await readJsonSafe<CandidateItem>(candidateResponse);
      const matchesData = await readJsonSafe<MatchItem[]>(matchesResponse);
      const vacanciesData = await readJsonSafe<VacancyItem[]>(vacanciesResponse);

      if (!candidateData) {
        throw new Error("Кандидат не найден");
      }

      const vacanciesMap = new Map<number, VacancyItem>();
      for (const vacancy of vacanciesData || []) {
        vacanciesMap.set(vacancy.id, vacancy);
      }

      const enrichedMatches: EnrichedMatchItem[] = (matchesData || [])
        .map((match) => ({
          ...match,
          vacancy: vacanciesMap.get(match.vacancy_id) || null,
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
    void loadData();
  }, []);

  const stats = useMemo(() => {
    return {
      total: matches.length,
      unseen: matches.filter((item) => ["shortlist", "sent"].includes(item.status)).length,
      viewed: matches.filter((item) => item.status === "viewed").length,
      inWork: matches.filter((item) =>
        ["invited", "interviewed", "offered"].includes(item.status)
      ).length,
      finished: matches.filter((item) =>
        ["hired", "rejected", "no_show"].includes(item.status)
      ).length,
    };
  }, [matches]);

  const filteredMatches = useMemo(() => {
    return matches.filter((item) => belongsToFilter(item.status, filter));
  }, [matches, filter]);

  if (loading) {
    return <main className="px-4 py-6">Загрузка откликов...</main>;
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
            <h1 className="mt-2 text-2xl font-semibold">Мои отклики</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Здесь видно, что сейчас происходит с каждой вашей кандидатурой:
              отклик еще ждет просмотра, работодатель уже увидел вас, хочет
              связаться или процесс уже завершен.
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
              href="/candidate/vacancies"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Смотреть вакансии
            </Link>
          </div>
        </div>
      </section>

      {errorText ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorText}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="text-sm text-slate-500">Всего</div>
          <div className="mt-2 text-2xl font-semibold">{stats.total}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="text-sm text-slate-500">Не просмотрены</div>
          <div className="mt-2 text-2xl font-semibold">{stats.unseen}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="text-sm text-slate-500">Просмотрены</div>
          <div className="mt-2 text-2xl font-semibold">{stats.viewed}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="text-sm text-slate-500">Есть движение</div>
          <div className="mt-2 text-2xl font-semibold">{stats.inWork}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="text-sm text-slate-500">Завершены</div>
          <div className="mt-2 text-2xl font-semibold">{stats.finished}</div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {(["all", "unseen", "viewed", "in_work", "finished"] as MatchFilter[]).map(
            (item) => (
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
                {filterLabel(item)}
              </button>
            )
          )}
        </div>

        {filteredMatches.length === 0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            По выбранному фильтру откликов пока нет.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {filteredMatches.map((match) => {
              const vacancy = match.vacancy;
              const score = match.match_score ?? 0;
              const highlightInvite = match.status === "invited";

              return (
                <div
                  key={match.id}
                  className={`rounded-xl border p-4 ${cardAccentClasses(match.status)}`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="font-medium">
                        {vacancy?.role || "Вакансия"} · {vacancy?.venue_name || "Без названия"}
                      </div>

                      <div className="text-sm text-slate-600">
                        {vacancy?.city || "—"}
                        {vacancy?.district ? `, ${vacancy.district}` : ""}
                      </div>

                      <div className="text-sm text-slate-500">
                        Доход: {vacancy?.salary_text || "—"}
                      </div>

                      <div className="text-sm text-slate-500">
                        График: {vacancy?.schedule_text || "—"}
                      </div>

                      <div className="text-sm text-slate-500">
                        Нужен выход: {vacancy?.needed_start || "—"}
                      </div>

                      {match.comment ? (
                        <div className="pt-1 text-sm text-slate-500">
                          Комментарий: {match.comment}
                        </div>
                      ) : null}
                    </div>

                    <div className="md:max-w-[360px]">
                      <div
                        className={`rounded-xl p-4 ${
                          highlightInvite ? "bg-white/80" : "bg-slate-50"
                        }`}
                      >
                        <div className="text-xs uppercase tracking-wide text-slate-500">
                          Статус
                        </div>

                        <div className="mt-2 text-base font-semibold">
                          {statusLabel(match.status)}
                        </div>

                        <div className="mt-2 text-sm text-slate-700">
                          {statusHint(match.status)}
                        </div>

                        <div className="mt-3 rounded-lg bg-white px-3 py-2 text-sm text-slate-700">
                          {nextStepHint(match.status)}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-slate-100 px-3 py-1">
                            Совпадение: {scoreLabel(score)} · {score}
                          </span>

                          {highlightInvite ? (
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">
                              Контакт открыт работодателю
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  {highlightInvite ? (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-4 text-sm text-emerald-800">
                      Работодатель уже получил доступ к вашему контакту. Сейчас важно быть на связи в Telegram и по телефону.
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}