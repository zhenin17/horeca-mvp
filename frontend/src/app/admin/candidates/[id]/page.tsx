"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { formatReadyToStart, formatSalary } from "@/lib/format";
import { statusLabel } from "@/lib/status";

type CandidateDashboardItem = {
  match_id: number;
  vacancy_id: number;
  employer_id: number;
  role: string;
  venue_name: string;
  city: string;
  district?: string | null;
  match_score?: number | null;
  status: string;
  comment?: string | null;
};

type CandidateDashboard = {
  candidate_id: number;
  full_name: string;
  primary_role: string;
  city: string;
  district?: string | null;
  ready_to_start: string;
  total_matches: number;
  active_matches: number;
  hired_matches: number;
  rejected_matches: number;
  items: CandidateDashboardItem[];
};

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

export default function AdminCandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [dashboard, setDashboard] = useState<CandidateDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [candidateResponse, dashboardResponse] = await Promise.all([
        fetch(`/api/candidates/${id}`, { cache: "no-store" }),
        fetch(`/api/candidates/${id}/dashboard`, { cache: "no-store" }),
      ]);

      if (!candidateResponse.ok) {
        throw new Error("Не удалось загрузить профиль кандидата");
      }

      if (!dashboardResponse.ok) {
        throw new Error("Не удалось загрузить дашборд кандидата");
      }

      const candidateData = (await candidateResponse.json()) as CandidateProfile;
      const dashboardData = (await dashboardResponse.json()) as CandidateDashboard;

      setCandidate(candidateData);
      setDashboard(dashboardData);
    } catch (error) {
      console.error(error);
      setMessage("Не удалось загрузить карточку кандидата");
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

  if (!candidate || !dashboard) {
    return <main className="px-4 py-6">Кандидат не найден</main>;
  }

  return (
    <main className="px-4 py-6 space-y-6">
      <div>
        <Link href="/admin/candidates" className="text-sm text-slate-600 underline">
          ← Назад к кандидатам
        </Link>
      </div>

      {message ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          {message}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <p className="text-sm text-slate-500">Карточка кандидата</p>
        <h1 className="mt-1 text-2xl font-semibold">{candidate.full_name}</h1>

        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <div>Роль: {candidate.primary_role}</div>
          <div>Телефон: {candidate.phone}</div>
          <div>Telegram: {candidate.telegram_username || "-"}</div>
          <div>
            Локация: {candidate.city}
            {candidate.district ? `, ${candidate.district}` : ""}
          </div>
          <div>Опыт: {candidate.horeca_experience_months} мес.</div>
          <div>Готовность выйти: {formatReadyToStart(candidate.ready_to_start)}</div>
          <div>Желаемый доход: {formatSalary(candidate.expected_income)}</div>
          <div>Статус профиля: {candidate.is_active ? "Активен" : "Неактивен"}</div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Сводка по кандидату</h2>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Всего откликов</div>
            <div className="mt-1 text-xl font-semibold">
              {dashboard.total_matches}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Активные</div>
            <div className="mt-1 text-xl font-semibold">
              {dashboard.active_matches}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Нанят</div>
            <div className="mt-1 text-xl font-semibold">
              {dashboard.hired_matches}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Отклонен</div>
            <div className="mt-1 text-xl font-semibold">
              {dashboard.rejected_matches}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Отклики и статусы</h2>

        {dashboard.items.length === 0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            У кандидата пока нет откликов.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {dashboard.items.map((item) => (
              <div
                key={item.match_id}
                className="rounded-xl border border-slate-200 p-4 space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium">
                      {item.role} · {item.venue_name}
                    </div>
                    <div className="text-sm text-slate-600">
                      {item.city}
                      {item.district ? `, ${item.district}` : ""}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      Статус отклика: {statusLabel(item.status)}
                    </div>
                    {item.comment ? (
                      <div className="mt-1 text-sm text-slate-500">
                        Комментарий: {item.comment}
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">
                    score {item.match_score ?? "-"}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => runMatchAction(item.match_id, "send", "Кандидат отправлен работодателю")}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    Отправить
                  </button>
                  <button
                    onClick={() => runMatchAction(item.match_id, "view", "Работодатель просмотрел кандидата")}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    Просмотрен
                  </button>
                  <button
                    onClick={() => runMatchAction(item.match_id, "invite", "Кандидат приглашен")}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    Пригласить
                  </button>
                  <button
                    onClick={() => runMatchAction(item.match_id, "interview", "Собеседование отмечено")}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    Собеседование
                  </button>
                  <button
                    onClick={() => runMatchAction(item.match_id, "hire", "Кандидат отмечен как нанятый")}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    Нанять
                  </button>
                  <button
                    onClick={() => runMatchAction(item.match_id, "reject", "Кандидат отклонен")}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    Отклонить
                  </button>
                  <button
                    onClick={() => runMatchAction(item.match_id, "no-show", "Отмечен невыход")}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    Не дошел
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}