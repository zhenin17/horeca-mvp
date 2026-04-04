"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import type { VacancyDetail } from "@/lib/types";

type ApplyResponse = {
  status: string;
  match_id: number;
  candidate_id: number;
  vacancy_id: number;
  match_score: number;
  match_status: string;
};

export default function VacancyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [vacancy, setVacancy] = useState<VacancyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState("");

  async function loadVacancy() {
    setLoading(true);
    try {
      const response = await fetch(`/api/vacancies/${id}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Не удалось загрузить вакансию");
      }

      const data = (await response.json()) as VacancyDetail;
      setVacancy(data);
    } catch (error) {
      console.error(error);
      setMessage("Не удалось загрузить вакансию");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVacancy();
  }, [id]);

  async function handleApply() {
    if (!vacancy) return;

    setApplying(true);
    setMessage("");

    try {
      const response = await fetch(`/api/vacancies/${vacancy.id}/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          candidate_id: 1,
          vacancy_id: vacancy.id,
          comment: "apply from vacancy details page",
        }),
      });

      const data = (await response.json()) as ApplyResponse | { detail: string };

      if (!response.ok) {
        const errorMessage =
          "detail" in data ? data.detail : "Ошибка при отклике";
        throw new Error(errorMessage);
      }

      setMessage(`Отклик отправлен. Match #${data.match_id}, score ${data.match_score}`);
    } catch (error) {
      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Не удалось откликнуться");
      }
    } finally {
      setApplying(false);
    }
  }

  if (loading) {
    return <main className="px-4 py-6">Загрузка...</main>;
  }

  if (!vacancy) {
    return <main className="px-4 py-6">Вакансия не найдена</main>;
  }

  return (
    <main className="px-4 py-6 space-y-6">
      <div>
        <Link href="/" className="text-sm text-slate-600 underline">
          ← Назад к вакансиям
        </Link>
      </div>

      {message ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          {message}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h1 className="text-2xl font-semibold">{vacancy.role}</h1>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <div>Точка: {vacancy.venue_name}</div>
          <div>
            Локация: {vacancy.city}
            {vacancy.district ? `, ${vacancy.district}` : ""}
          </div>
          <div>Статус вакансии: {vacancy.status}</div>
          <div>Ставка / доход: {vacancy.salary_text || "-"}</div>
          <div>График: {vacancy.schedule_text || "-"}</div>
          <div>Когда нужен выход: {vacancy.needed_start || "-"}</div>
        </div>

        <button
          onClick={handleApply}
          disabled={applying}
          className="mt-6 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
        >
          {applying ? "Отправка..." : "Откликнуться"}
        </button>
      </section>
    </main>
  );
}