"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { CandidateDashboard, CandidateSuggestions } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

type ApplyResponse = {
  status: string;
  match_id: number;
  candidate_id: number;
  vacancy_id: number;
  match_score: number;
  match_status: string;
};

export default function HomePage() {
  const [dashboard, setDashboard] = useState<CandidateDashboard | null>(null);
  const [suggestions, setSuggestions] = useState<CandidateSuggestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string>("");

  async function loadData() {
    setLoading(true);
    try {
      const [dashboardData, suggestionsData] = await Promise.all([
        apiFetch<CandidateDashboard>("/candidates/1/dashboard"),
        apiFetch<CandidateSuggestions>("/candidates/1/suggested-vacancies"),
      ]);
      setDashboard(dashboardData);
      setSuggestions(suggestionsData);
    } catch (error) {
      console.error(error);
      setMessage("Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleApply(vacancyId: number) {
    if (!API_BASE_URL) return;

    setApplyingId(vacancyId);
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/vacancies/${vacancyId}/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          candidate_id: 1,
          vacancy_id: vacancyId,
          comment: "apply from mini app ui",
        }),
      });

      const data = (await response.json()) as ApplyResponse | { detail: string };

      if (!response.ok) {
        const errorMessage =
          "detail" in data ? data.detail : "Ошибка при отклике на вакансию";
        throw new Error(errorMessage);
      }

      setMessage(`Отклик отправлен. Match #${data.match_id}, score ${data.match_score}`);
      await loadData();
    } catch (error) {
      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Не удалось откликнуться");
      }
    } finally {
      setApplyingId(null);
    }
  }

  if (loading || !dashboard || !suggestions) {
    return (
      <main className="min-h-screen bg-white text-slate-900">
        <div className="mx-auto max-w-3xl px-4 py-6">Загрузка...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        {message ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            {message}
          </div>
        ) : null}

        <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500">Профиль кандидата</p>
          <h1 className="mt-1 text-2xl font-semibold">{dashboard.full_name}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {dashboard.primary_role} · {dashboard.city}
            {dashboard.district ? `, ${dashboard.district}` : ""}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Готовность выйти: {dashboard.ready_to_start}
          </p>

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
          <h2 className="text-xl font-semibold">Подходящие вакансии</h2>
          <div className="mt-4 space-y-3">
            {suggestions.suggested_vacancies.map((vacancy) => (
              <div
                key={vacancy.vacancy_id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{vacancy.role}</div>
                    <div className="text-sm text-slate-600">
                      {vacancy.venue_name}
                    </div>
                    <div className="text-sm text-slate-500">
                      {vacancy.city}
                      {vacancy.district ? `, ${vacancy.district}` : ""}
                    </div>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">
                    score {vacancy.score}
                  </div>
                </div>

                <button
                  onClick={() => handleApply(vacancy.vacancy_id)}
                  disabled={applyingId === vacancy.vacancy_id}
                  className="mt-4 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                >
                  {applyingId === vacancy.vacancy_id ? "Отправка..." : "Откликнуться"}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Мои отклики</h2>
          <div className="mt-4 space-y-3">
            {dashboard.items.map((item) => (
              <div
                key={item.match_id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">
                      {item.role} · {item.venue_name}
                    </div>
                    <div className="text-sm text-slate-600">
                      {item.city}
                      {item.district ? `, ${item.district}` : ""}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      Статус: {item.status}
                    </div>
                    {item.comment ? (
                      <div className="mt-1 text-sm text-slate-500">
                        Комментарий: {item.comment}
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">
                    {item.match_score ?? "-"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}