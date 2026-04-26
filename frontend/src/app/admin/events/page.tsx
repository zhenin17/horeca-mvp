"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  eventSourceLabel,
  eventTypeLabel,
  formatEventComment,
} from "@/lib/events";

type FunnelEventItem = {
  id: number;
  candidate_id?: number | null;
  employer_id?: number | null;
  vacancy_id?: number | null;
  event_type: string;
  event_source?: string | null;
  comment?: string | null;
  created_at?: string | null;
};

function formatEventDateTime(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<FunnelEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [candidateFilter, setCandidateFilter] = useState("");
  const [vacancyFilter, setVacancyFilter] = useState("");
  const [employerFilter, setEmployerFilter] = useState("");

  useEffect(() => {
    async function loadEvents() {
      try {
        setErrorText("");

        const data = await apiFetch<FunnelEventItem[]>("/me/staff/events");
        setEvents(data);
      } catch (error) {
        console.error(error);

        if (error instanceof Error) {
          setErrorText(error.message);
        } else {
          setErrorText("Не удалось загрузить события");
        }
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, []);

  const eventTypeOptions = useMemo(() => {
    return Array.from(new Set(events.map((event) => event.event_type))).sort();
  }, [events]);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;

      if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
        return b.id - a.id;
      }

      return bTime - aTime;
    });
  }, [events]);

  const filteredEvents = useMemo(() => {
    const candidateValue = candidateFilter.trim();
    const vacancyValue = vacancyFilter.trim();
    const employerValue = employerFilter.trim();

    return sortedEvents.filter((event) => {
      const matchesType =
        eventTypeFilter === "all" || event.event_type === eventTypeFilter;

      const matchesCandidate =
        !candidateValue ||
        String(event.candidate_id ?? "").includes(candidateValue);

      const matchesVacancy =
        !vacancyValue ||
        String(event.vacancy_id ?? "").includes(vacancyValue);

      const matchesEmployer =
        !employerValue ||
        String(event.employer_id ?? "").includes(employerValue);

      return matchesType && matchesCandidate && matchesVacancy && matchesEmployer;
    });
  }, [
    sortedEvents,
    eventTypeFilter,
    candidateFilter,
    vacancyFilter,
    employerFilter,
  ]);

  function resetFilters() {
    setEventTypeFilter("all");
    setCandidateFilter("");
    setVacancyFilter("");
    setEmployerFilter("");
  }

  if (loading) {
    return <main className="px-4 py-6">Загрузка событий...</main>;
  }

  return (
    <main className="space-y-6 px-4 py-6">
      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Админка · Журнал событий</h1>
            <p className="mt-1 text-sm text-slate-500">
              События отсортированы от новых к старым.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Всего событий: <span className="font-semibold">{events.length}</span>
          </div>
        </div>

        {errorText ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorText}
          </div>
        ) : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm text-slate-600">
                  Тип события
                </label>
                <select
                  value={eventTypeFilter}
                  onChange={(e) => setEventTypeFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="all">Все</option>
                  {eventTypeOptions.map((eventType) => (
                    <option key={eventType} value={eventType}>
                      {eventTypeLabel(eventType)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-600">
                  Candidate ID
                </label>
                <input
                  value={candidateFilter}
                  onChange={(e) => setCandidateFilter(e.target.value)}
                  placeholder="Например, 1"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-600">
                  Vacancy ID
                </label>
                <input
                  value={vacancyFilter}
                  onChange={(e) => setVacancyFilter(e.target.value)}
                  placeholder="Например, 1"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-600">
                  Employer ID
                </label>
                <input
                  value={employerFilter}
                  onChange={(e) => setEmployerFilter(e.target.value)}
                  placeholder="Например, 1"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-500">
                Найдено событий: {filteredEvents.length}
              </div>

              <button
                type="button"
                onClick={resetFilters}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 sm:w-auto"
              >
                Сбросить фильтры
              </button>
            </div>

            {filteredEvents.length === 0 ? (
              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                По выбранным фильтрам событий не найдено.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {filteredEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-medium">
                            #{event.id} · {eventTypeLabel(event.event_type)}
                          </div>

                          <div className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                            {formatEventDateTime(event.created_at)}
                          </div>
                        </div>

                        <div className="text-sm text-slate-600">
                          Источник: {eventSourceLabel(event.event_source)}
                        </div>

                        <div className="text-sm text-slate-500">
                          Кандидат: {event.candidate_id ?? "-"} · Вакансия:{" "}
                          {event.vacancy_id ?? "-"} · Работодатель:{" "}
                          {event.employer_id ?? "-"}
                        </div>

                        <div className="text-sm text-slate-500">
                          Комментарий:{" "}
                          {formatEventComment(event.event_type, event.comment)}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 text-sm">
                        {event.candidate_id ? (
                          <Link
                            href={`/admin/candidates/${event.candidate_id}`}
                            className="rounded-xl border border-slate-300 px-3 py-2 text-center hover:bg-slate-50"
                          >
                            Кандидат
                          </Link>
                        ) : null}

                        {event.vacancy_id ? (
                          <Link
                            href={`/admin/vacancies/${event.vacancy_id}`}
                            className="rounded-xl border border-slate-300 px-3 py-2 text-center hover:bg-slate-50"
                          >
                            Вакансия
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}