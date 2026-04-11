"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { formatReadyToStart, formatSalary } from "@/lib/format";
import {
  reliabilityBadgeClass,
  reliabilityLabel,
} from "@/lib/events";
import { statusLabel } from "@/lib/status";

type EmployerItem = {
  id: number;
  company_name: string;
  contact_name: string;
  phone: string;
  telegram_username?: string | null;
  city: string;
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

type MatchItem = {
  id: number;
  candidate_id: number;
  employer_id: number;
  vacancy_id: number;
  match_score?: number | null;
  status: string;
  comment?: string | null;
  candidate: CandidateItem;
};

type VacancyShortlist = {
  vacancy_id: number;
  role: string;
  venue_name: string;
  city: string;
  district?: string | null;
  status: string;
  matches: MatchItem[];
};

type VacancyFunnel = {
  vacancy_id: number;
  role: string;
  venue_name: string;
  total_matches: number;
  by_status: Record<string, number>;
};

type CandidateReliability = {
  candidate_id: number;
  total_matches: number;
  invited_count: number;
  interviewed_count: number;
  hired_count: number;
  rejected_count: number;
  no_show_count: number;
  reliability_score: number;
};

export default function EmployerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [employers, setEmployers] = useState<EmployerItem[]>([]);
  const [vacancies, setVacancies] = useState<VacancyItem[]>([]);
  const [shortlists, setShortlists] = useState<Record<number, VacancyShortlist>>({});
  const [funnels, setFunnels] = useState<Record<number, VacancyFunnel>>({});
  const [reliabilityMap, setReliabilityMap] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    try {
      setErrorText("");

      const [employersResponse, vacanciesResponse] = await Promise.all([
        fetch("/api/employers/", { cache: "no-store" }),
        fetch("/api/vacancies/", { cache: "no-store" }),
      ]);

      if (!employersResponse.ok) {
        throw new Error("Не удалось загрузить работодателей");
      }

      if (!vacanciesResponse.ok) {
        throw new Error("Не удалось загрузить вакансии");
      }

      const employersData = (await employersResponse.json()) as EmployerItem[];
      const vacanciesData = (await vacanciesResponse.json()) as VacancyItem[];

      setEmployers(employersData);

      const employerVacancies = vacanciesData.filter(
        (vacancy) => String(vacancy.employer_id) === id
      );
      setVacancies(employerVacancies);

      const shortlistPairs = await Promise.all(
        employerVacancies.map(async (vacancy) => {
          const response = await fetch(`/api/shortlists/vacancy/${vacancy.id}`, {
            cache: "no-store",
          });

          if (!response.ok) {
            return [vacancy.id, null] as const;
          }

          const data = (await response.json()) as VacancyShortlist;
          return [vacancy.id, data] as const;
        })
      );

      const funnelPairs = await Promise.all(
        employerVacancies.map(async (vacancy) => {
          const response = await fetch(`/api/shortlists/vacancy/${vacancy.id}/funnel`, {
            cache: "no-store",
          });

          if (!response.ok) {
            return [vacancy.id, null] as const;
          }

          const data = (await response.json()) as VacancyFunnel;
          return [vacancy.id, data] as const;
        })
      );

      const shortlistMap = Object.fromEntries(
        shortlistPairs.filter(([, value]) => value)
      ) as Record<number, VacancyShortlist>;

      const funnelMap = Object.fromEntries(
        funnelPairs.filter(([, value]) => value)
      ) as Record<number, VacancyFunnel>;

      setShortlists(shortlistMap);
      setFunnels(funnelMap);

      const candidateIds = Array.from(
        new Set(
          Object.values(shortlistMap).flatMap((shortlist) =>
            shortlist.matches.map((match) => match.candidate_id)
          )
        )
      );

      const reliabilityEntries = await Promise.all(
        candidateIds.map(async (candidateId) => {
          try {
            const response = await fetch(`/api/candidates/${candidateId}/reliability`, {
              cache: "no-store",
            });

            if (!response.ok) {
              return [candidateId, 0] as const;
            }

            const data = (await response.json()) as CandidateReliability;
            return [candidateId, data.reliability_score] as const;
          } catch {
            return [candidateId, 0] as const;
          }
        })
      );

      setReliabilityMap(Object.fromEntries(reliabilityEntries));
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        setErrorText(error.message);
      } else {
        setErrorText("Не удалось загрузить страницу работодателя");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [id]);

  async function runMatchAction(matchId: number, action: string, successText: string) {
    setMessage("");

    try {
      const response = await fetch(`/api/matches/${matchId}/${action}`, {
        method: "POST",
      });

      const data = (await response.json()) as { detail?: string };

      if (!response.ok) {
        throw new Error(data.detail || "Не удалось изменить статус");
      }

      setMessage(successText);
      await loadData();
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Не удалось изменить статус");
      }
    }
  }

  const employer = useMemo(
    () => employers.find((item) => String(item.id) === id) || null,
    [employers, id]
  );

  if (loading) {
    return <main className="px-4 py-6">Загрузка...</main>;
  }

  if (!employer) {
    return <main className="px-4 py-6">Работодатель не найден</main>;
  }

  return (
    <main className="space-y-6 px-4 py-6">
      <div>
        <Link href="/employers" className="text-sm text-slate-600 underline">
          ← Назад к работодателям
        </Link>
      </div>

      {errorText ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorText}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          {message}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Работодатель</p>
            <h1 className="mt-1 text-2xl font-semibold">{employer.company_name}</h1>
          </div>

          <Link
            href={`/employers/${employer.id}/create-vacancy`}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Создать вакансию
          </Link>
        </div>

        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <div>Контакт: {employer.contact_name}</div>
          <div>Телефон: {employer.phone}</div>
          <div>Telegram: {employer.telegram_username || "-"}</div>
          <div>Город: {employer.city}</div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Вакансии работодателя</h2>

        {vacancies.length === 0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            У работодателя пока нет вакансий.
          </div>
        ) : (
          <div className="mt-4 space-y-6">
            {vacancies.map((vacancy) => {
              const shortlist = shortlists[vacancy.id];
              const funnel = funnels[vacancy.id];

              return (
                <div
                  key={vacancy.id}
                  className="rounded-2xl border border-slate-200 p-4 space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold">
                        {vacancy.role} · {vacancy.venue_name}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {vacancy.city}
                        {vacancy.district ? `, ${vacancy.district}` : ""}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        Статус: {statusLabel(vacancy.status)}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        Ставка / доход: {formatSalary(vacancy.salary_text)}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        График: {vacancy.schedule_text || "-"}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        Когда нужен выход: {formatReadyToStart(vacancy.needed_start)}
                      </div>
                    </div>

                    <Link
                      href={`/admin/vacancies/${vacancy.id}`}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                    >
                      Открыть в админке
                    </Link>
                  </div>

                  {funnel ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {Object.entries(funnel.by_status).map(([status, count]) => (
                        <div key={status} className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs text-slate-500">{statusLabel(status)}</div>
                          <div className="mt-1 text-xl font-semibold">{count}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div>
                    <h3 className="text-lg font-semibold">Shortlist</h3>

                    {!shortlist || shortlist.matches.length === 0 ? (
                      <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                        Пока нет кандидатов в shortlist.
                      </div>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {shortlist.matches.map((match) => {
                          const reliabilityScore = reliabilityMap[match.candidate_id] ?? 0;

                          return (
                            <div
                              key={match.id}
                              className="rounded-xl border border-slate-200 p-4 space-y-4"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <div className="font-medium">{match.candidate.full_name}</div>
                                  <div className="text-sm text-slate-600">
                                    {match.candidate.primary_role} · {match.candidate.city}
                                    {match.candidate.district
                                      ? `, ${match.candidate.district}`
                                      : ""}
                                  </div>
                                  <div className="mt-1 text-sm text-slate-500">
                                    Статус отклика: {statusLabel(match.status)}
                                  </div>
                                  <div className="mt-1 text-sm text-slate-500">
                                    Опыт: {match.candidate.horeca_experience_months} мес.
                                  </div>
                                  <div className="mt-1 text-sm text-slate-500">
                                    Индекс надежности: {reliabilityScore} / 100 ·{" "}
                                    {reliabilityLabel(reliabilityScore)}
                                  </div>
                                </div>

                                <div className="space-y-2 text-right">
                                  <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">
                                    score {match.match_score ?? "-"}
                                  </div>
                                  <div
                                    className={`rounded-full border px-3 py-1 text-sm font-medium ${reliabilityBadgeClass(
                                      reliabilityScore
                                    )}`}
                                  >
                                    надежность {reliabilityScore}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() =>
                                    runMatchAction(match.id, "view", "Кандидат отмечен как просмотренный")
                                  }
                                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                                >
                                  Просмотрен
                                </button>

                                <button
                                  onClick={() =>
                                    runMatchAction(match.id, "invite", "Кандидат приглашен")
                                  }
                                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                                >
                                  Пригласить
                                </button>

                                <button
                                  onClick={() =>
                                    runMatchAction(match.id, "interview", "Собеседование отмечено")
                                  }
                                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                                >
                                  Собеседование
                                </button>

                                <button
                                  onClick={() =>
                                    runMatchAction(match.id, "hire", "Кандидат отмечен как нанятый")
                                  }
                                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                                >
                                  Нанять
                                </button>

                                <button
                                  onClick={() =>
                                    runMatchAction(match.id, "reject", "Кандидат отклонен")
                                  }
                                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                                >
                                  Отклонить
                                </button>

                                <button
                                  onClick={() =>
                                    runMatchAction(match.id, "no-show", "Отмечен невыход")
                                  }
                                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                                >
                                  Не дошел
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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