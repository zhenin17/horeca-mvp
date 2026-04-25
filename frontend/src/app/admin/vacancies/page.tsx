"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, normalizeMediaUrl } from "@/lib/api";
import { formatSalary } from "@/lib/format";
import { statusLabel } from "@/lib/status";

type VacancyPhoto = {
  id: number;
  vacancy_id?: number;
  photo_url: string;
  is_main?: boolean | null;
  created_at?: string | null;
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

  // Optional: если backend уже отдает эти поля в list API — покажем.
  // Если не отдает — ничего дополнительно не запрашиваем.
  employment_type?: string | null;
  vacancy_type?: string | null;
  type?: string | null;
  shift_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  photos?: VacancyPhoto[] | null;
};

function getVacancyType(vacancy: VacancyItem): string {
  const rawType = vacancy.employment_type || vacancy.vacancy_type || vacancy.type || "";

  const labels: Record<string, string> = {
    job: "Работа",
    full_time: "Работа",
    part_time: "Подработка",
    side_job: "Подработка",
    shift: "Смена",
  };

  return labels[rawType] || rawType || "Тип не указан";
}

function getVacancyTypeClass(vacancy: VacancyItem): string {
  const rawType = vacancy.employment_type || vacancy.vacancy_type || vacancy.type || "";

  if (rawType === "shift") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  if (rawType === "part_time" || rawType === "side_job") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (rawType === "job" || rawType === "full_time") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function getStatusClass(status: string): string {
  const normalizedStatus = status.toLowerCase();

  if (["new", "draft", "pending", "moderation"].includes(normalizedStatus)) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (["active", "published", "open", "in_progress"].includes(normalizedStatus)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (["closed", "completed", "filled"].includes(normalizedStatus)) {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }

  if (["archived", "archive"].includes(normalizedStatus)) {
    return "border-zinc-200 bg-zinc-100 text-zinc-700";
  }

  if (["rejected", "blocked"].includes(normalizedStatus)) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function getScheduleText(vacancy: VacancyItem): string {
  if (vacancy.schedule_text) {
    return vacancy.schedule_text;
  }

  if (vacancy.shift_date && vacancy.start_time && vacancy.end_time) {
    return `${vacancy.shift_date}, ${vacancy.start_time}–${vacancy.end_time}`;
  }

  if (vacancy.shift_date) {
    return vacancy.shift_date;
  }

  if (vacancy.start_time && vacancy.end_time) {
    return `${vacancy.start_time}–${vacancy.end_time}`;
  }

  return "-";
}

function getMainPhoto(vacancy: VacancyItem): VacancyPhoto | null {
  if (!vacancy.photos || vacancy.photos.length === 0) {
    return null;
  }

  return vacancy.photos.find((photo) => photo.is_main) || vacancy.photos[0];
}

export default function AdminVacanciesPage() {
  const [vacancies, setVacancies] = useState<VacancyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    async function loadVacancies() {
      try {
        setErrorText("");
        const data = await apiFetch<VacancyItem[]>("/vacancies/");
        setVacancies(data);
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

    loadVacancies();
  }, []);

  const counters = useMemo(() => {
    return vacancies.reduce(
      (acc, vacancy) => {
        const status = vacancy.status.toLowerCase();

        acc.total += 1;

        if (["new", "draft", "pending", "moderation"].includes(status)) {
          acc.new += 1;
        } else if (["active", "published", "open", "in_progress"].includes(status)) {
          acc.active += 1;
        } else if (["closed", "completed", "filled"].includes(status)) {
          acc.closed += 1;
        } else if (["archived", "archive"].includes(status)) {
          acc.archived += 1;
        } else {
          acc.other += 1;
        }

        return acc;
      },
      {
        total: 0,
        new: 0,
        active: 0,
        closed: 0,
        archived: 0,
        other: 0,
      }
    );
  }, [vacancies]);

  if (loading) {
    return <main className="px-4 py-6">Загрузка вакансий...</main>;
  }

  return (
    <main className="px-4 py-6 space-y-6">
      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Админка · Вакансии</h1>
            <p className="mt-1 text-sm text-slate-500">
              MVP-список для просмотра и перехода к модерации вакансий.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Всего вакансий: <span className="font-semibold">{counters.total}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Новые</div>
            <div className="mt-1 text-xl font-semibold">{counters.new}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">В работе</div>
            <div className="mt-1 text-xl font-semibold">{counters.active}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Закрыты</div>
            <div className="mt-1 text-xl font-semibold">{counters.closed}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Архив</div>
            <div className="mt-1 text-xl font-semibold">{counters.archived}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Другие</div>
            <div className="mt-1 text-xl font-semibold">{counters.other}</div>
          </div>
        </div>

        {errorText ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorText}
          </div>
        ) : vacancies.length === 0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            Пока нет вакансий.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {vacancies.map((vacancy) => {
              const mainPhoto = getMainPhoto(vacancy);
              const photoUrl = mainPhoto ? normalizeMediaUrl(mainPhoto.photo_url) || "" : "";

              return (
                <div
                  key={vacancy.id}
                  className="rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50/60"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={`Фото вакансии ${vacancy.id}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-slate-400">
                            Нет фото
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-medium">
                            #{vacancy.id} · {vacancy.role}
                          </div>

                          <span
                            className={`rounded-full border px-2 py-1 text-xs font-medium ${getStatusClass(
                              vacancy.status
                            )}`}
                          >
                            {statusLabel(vacancy.status)}
                          </span>

                          <span
                            className={`rounded-full border px-2 py-1 text-xs font-medium ${getVacancyTypeClass(
                              vacancy
                            )}`}
                          >
                            {getVacancyType(vacancy)}
                          </span>
                        </div>

                        <div className="mt-1 text-sm text-slate-700">
                          {vacancy.venue_name}
                        </div>

                        <div className="mt-1 text-sm text-slate-600">
                          {vacancy.city}
                          {vacancy.district ? `, ${vacancy.district}` : ""}
                        </div>

                        <div className="mt-2 grid gap-1 text-sm text-slate-500 sm:grid-cols-2">
                          <div>Ставка / доход: {formatSalary(vacancy.salary_text)}</div>
                          <div>График: {getScheduleText(vacancy)}</div>
                          {vacancy.needed_start ? (
                            <div>Старт: {vacancy.needed_start}</div>
                          ) : null}
                          <div>Employer ID: {vacancy.employer_id}</div>
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/admin/vacancies/${vacancy.id}`}
                      className="shrink-0 rounded-xl border border-slate-300 px-4 py-2 text-center text-sm font-medium hover:bg-white sm:hover:bg-slate-50"
                    >
                      Открыть
                    </Link>
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