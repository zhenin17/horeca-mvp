"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatReadyToStart } from "@/lib/format";
import type { CandidateDashboard, CandidateSuggestions } from "@/lib/types";

type ApplyResponse = {
  status: string;
  match_id: number;
  candidate_id: number;
  vacancy_id: number;
  match_score: number;
  match_status: string;
};

export default function CandidateVacanciesPage() {
  const [dashboard, setDashboard] = useState<CandidateDashboard | null>(null);
  const [suggestions, setSuggestions] = useState<CandidateSuggestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

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
    setApplyingId(vacancyId);
    setMessage("");

    try {
      const response = await fetch(`/api/vacancies/${vacancyId}/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          candidate_id: 1,
          vacancy_id: vacancyId,
          comment: "Отклик из интерфейса кандидата",
        }),
      });

      const data = (await response.json()) as ApplyResponse | { detail: string };

      if (!response.ok) {
        const errorMessage =
          "detail" in data ? data.detail : "Ошибка при отклике на вакансию";
        throw new Error(errorMessage);
      }

      const successData = data as ApplyResponse;
      setMessage(
        `Отклик отправлен. №${successData.match_id}, оценка ${successData.match_score}`
      );
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

  const roleOptions = useMemo(() => {
    if (!suggestions) return [];
    return Array.from(
      new Set(suggestions.suggested_vacancies.map((vacancy) => vacancy.role))
    );
  }, [suggestions]);

  const filteredVacancies = useMemo(() => {
    if (!suggestions) return [];
    if (roleFilter === "all") return suggestions.suggested_vacancies;
    return suggestions.suggested_vacancies.filter((vacancy) => vacancy.role === roleFilter);
  }, [suggestions, roleFilter]);

  if (loading || !dashboard || !suggestions) {
    return (
      <main className="px-4 py-6">
        <div>Загрузка...</div>
      </main>
    );
  }

  return (
    <main className="px-4 py-6 space-y-6">
      {message ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          {message}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <p className="text-sm text-slate-500">Кандидат</p>
        <h1 className="mt-1 text-2xl font-semibold">{dashboard.full_name}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {dashboard.primary_role} · {dashboard.city}
          {dashboard.district ? `, ${dashboard.district}` : ""}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Готовность выйти: {formatReadyToStart(dashboard.ready_to_start)}
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/candidate/onboarding"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Обновить анкету
          </Link>
          <Link
            href="/candidate/profile"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Профиль
          </Link>
          <Link
            href="/candidate/matches"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Мои отклики
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Подходящие вакансии</h2>
            <p className="mt-1 text-sm text-slate-500">
              Можно отфильтровать вакансии по роли.
            </p>
          </div>

          <div className="w-full sm:w-64">
            <label className="mb-1 block text-sm text-slate-600">Роль</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="all">Все роли</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredVacancies.length === 0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            По выбранному фильтру вакансий не найдено.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {filteredVacancies.map((vacancy) => (
              <div
                key={vacancy.vacancy_id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{vacancy.role}</div>
                    <div className="text-sm text-slate-600">{vacancy.venue_name}</div>
                    <div className="text-sm text-slate-500">
                      {vacancy.city}
                      {vacancy.district ? `, ${vacancy.district}` : ""}
                    </div>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">
                    оценка {vacancy.score}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-4">
                  <Link
                    href={`/candidate/vacancies/${vacancy.vacancy_id}`}
                    className="text-sm font-medium text-slate-700 underline"
                  >
                    Подробнее
                  </Link>

                  <button
                    onClick={() => handleApply(vacancy.vacancy_id)}
                    disabled={applyingId === vacancy.vacancy_id}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                  >
                    {applyingId === vacancy.vacancy_id ? "Отправка..." : "Откликнуться"}
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