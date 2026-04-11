"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { formatReadyToStart } from "@/lib/format";
import { reliabilityBadgeClass, reliabilityLabel } from "@/lib/events";
import { statusLabel } from "@/lib/status";

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

type MatchAction = {
  action: string;
  label: string;
  successText: string;
};

function getAllowedActions(status: string): MatchAction[] {
  const transitions: Record<string, MatchAction[]> = {
    shortlist: [
      { action: "send", label: "Отправить", successText: "Кандидат отправлен работодателю" },
      { action: "view", label: "Просмотрен", successText: "Работодатель просмотрел кандидата" },
      { action: "invite", label: "Пригласить", successText: "Кандидат приглашен" },
      { action: "reject", label: "Отклонить", successText: "Кандидат отклонен" },
    ],
    sent: [
      { action: "view", label: "Просмотрен", successText: "Работодатель просмотрел кандидата" },
      { action: "invite", label: "Пригласить", successText: "Кандидат приглашен" },
      { action: "reject", label: "Отклонить", successText: "Кандидат отклонен" },
    ],
    viewed: [
      { action: "invite", label: "Пригласить", successText: "Кандидат приглашен" },
      { action: "reject", label: "Отклонить", successText: "Кандидат отклонен" },
    ],
    invited: [
      { action: "interview", label: "Собеседование", successText: "Собеседование отмечено" },
      { action: "hire", label: "Нанять", successText: "Кандидат отмечен как нанятый" },
      { action: "reject", label: "Отклонить", successText: "Кандидат отклонен" },
      { action: "no-show", label: "Не дошел", successText: "Отмечен невыход" },
    ],
    interviewed: [
      { action: "hire", label: "Нанять", successText: "Кандидат отмечен как нанятый" },
      { action: "reject", label: "Отклонить", successText: "Кандидат отклонен" },
      { action: "no-show", label: "Не дошел", successText: "Отмечен невыход" },
    ],
    offered: [
      { action: "hire", label: "Нанять", successText: "Кандидат отмечен как нанятый" },
      { action: "reject", label: "Отклонить", successText: "Кандидат отклонен" },
    ],
    rejected: [
      { action: "reopen", label: "Вернуть в работу", successText: "Отклик возвращен в работу" },
    ],
    no_show: [
      { action: "reopen", label: "Вернуть в работу", successText: "Отклик возвращен в работу" },
    ],
    hired: [
      { action: "reopen", label: "Вернуть в работу", successText: "Отклик возвращен в работу" },
    ],
  };

  return transitions[status] || [];
}

export default function AdminVacancyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [shortlist, setShortlist] = useState<VacancyShortlist | null>(null);
  const [funnel, setFunnel] = useState<VacancyFunnel | null>(null);
  const [reliabilityMap, setReliabilityMap] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [shortlistResponse, funnelResponse] = await Promise.all([
        fetch(`/api/shortlists/vacancy/${id}`, { cache: "no-store" }),
        fetch(`/api/shortlists/vacancy/${id}/funnel`, { cache: "no-store" }),
      ]);

      if (!shortlistResponse.ok) {
        throw new Error("Не удалось загрузить shortlist");
      }

      if (!funnelResponse.ok) {
        throw new Error("Не удалось загрузить воронку");
      }

      const shortlistData = (await shortlistResponse.json()) as VacancyShortlist;
      const funnelData = (await funnelResponse.json()) as VacancyFunnel;

      setShortlist(shortlistData);
      setFunnel(funnelData);

      const reliabilityEntries = await Promise.all(
        shortlistData.matches.map(async (match) => {
          try {
            const response = await fetch(`/api/candidates/${match.candidate_id}/reliability`, {
              cache: "no-store",
            });
            if (!response.ok) {
              return [match.candidate_id, 0] as const;
            }
            const data = (await response.json()) as CandidateReliability;
            return [match.candidate_id, data.reliability_score] as const;
          } catch {
            return [match.candidate_id, 0] as const;
          }
        })
      );

      setReliabilityMap(Object.fromEntries(reliabilityEntries));
    } catch (error) {
      console.error(error);
      setMessage("Не удалось загрузить страницу вакансии");
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
      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Не удалось изменить статус");
      }
    }
  }

  if (loading) {
    return <main className="px-4 py-6">Загрузка...</main>;
  }

  if (!shortlist || !funnel) {
    return <main className="px-4 py-6">Вакансия не найдена</main>;
  }

  return (
    <main className="px-4 py-6 space-y-6">
      <div>
        <Link href="/admin/vacancies" className="text-sm text-slate-600 underline">
          ← Назад к вакансиям
        </Link>
      </div>

      {message ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          {message}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h1 className="text-2xl font-semibold">
          {shortlist.role} · {shortlist.venue_name}
        </h1>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <div>
            Локация: {shortlist.city}
            {shortlist.district ? `, ${shortlist.district}` : ""}
          </div>
          <div>Статус вакансии: {statusLabel(shortlist.status)}</div>
          <div>Всего откликов: {funnel.total_matches}</div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Воронка по вакансии</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Object.entries(funnel.by_status).map(([status, count]) => (
            <div key={status} className="rounded-xl bg-slate-50 p-3">
              <div className="text-xs text-slate-500">{statusLabel(status)}</div>
              <div className="mt-1 text-xl font-semibold">{count}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Shortlist</h2>

        {shortlist.matches.length === 0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            Пока в shortlist нет кандидатов.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {shortlist.matches.map((match) => {
              const reliabilityScore = reliabilityMap[match.candidate_id] ?? 0;
              const allowedActions = getAllowedActions(match.status);

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
                        {match.candidate.district ? `, ${match.candidate.district}` : ""}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        Опыт: {match.candidate.horeca_experience_months} мес.
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        Готовность: {formatReadyToStart(match.candidate.ready_to_start)}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        Статус отклика: {statusLabel(match.status)}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        Индекс надежности: {reliabilityScore} / 100 · {reliabilityLabel(reliabilityScore)}
                      </div>
                      {match.comment ? (
                        <div className="mt-1 text-sm text-slate-500">
                          Комментарий: {match.comment}
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-2 text-right">
                      <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">
                        оценка {match.match_score ?? "-"}
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

                  {allowedActions.length === 0 ? (
                    <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                      Для текущего статуса больше нет доступных действий.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {allowedActions.map((item) => (
                        <button
                          key={item.action}
                          onClick={() => runMatchAction(match.id, item.action, item.successText)}
                          className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}