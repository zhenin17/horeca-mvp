"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
};

export default function AdminEventsPage() {
  const [events, setEvents] = useState<FunnelEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [candidateFilter, setCandidateFilter] = useState("");
  const [vacancyFilter, setVacancyFilter] = useState("");

  useEffect(() => {
    async function loadEvents() {
      try {
        setErrorText("");

        const response = await fetch("/api/funnel-events/", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Не удалось загрузить события (${response.status})`);
        }

        const data = (await response.json()) as FunnelEventItem[];
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
    return Array.from(new Set(events.map((event) => event.event_type)));
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesType =
        eventTypeFilter === "all" || event.event_type === eventTypeFilter;

      const matchesCandidate =
        !candidateFilter ||
        String(event.candidate_id ?? "").includes(candidateFilter.trim());

      const matchesVacancy =
        !vacancyFilter ||
        String(event.vacancy_id ?? "").includes(vacancyFilter.trim());

      return matchesType && matchesCandidate && matchesVacancy;
    });
  }, [events, eventTypeFilter, candidateFilter, vacancyFilter]);

  if (loading) {
    return <main className="px-4 py-6">Загрузка событий...</main>;
  }

  return (
    <main className="space-y-6 px-4 py-6">
      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h1 className="text-2xl font-semibold">Админка · Журнал событий</h1>

        {errorText ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorText}
          </div>
        ) : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
            </div>

            <div className="mt-3 text-sm text-slate-500">
              Найдено событий: {filteredEvents.length}
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
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="font-medium">
                          #{event.id} · {eventTypeLabel(event.event_type)}
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
                          Комментарий: {formatEventComment(event.event_type, event.comment)}
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