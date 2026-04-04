"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatSalary } from "@/lib/format";
import { statusLabel } from "@/lib/status";

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

export default function AdminVacanciesPage() {
  const [vacancies, setVacancies] = useState<VacancyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    async function loadVacancies() {
      try {
        setErrorText("");

        const response = await fetch("/api/vacancies", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Не удалось загрузить вакансии (${response.status})`);
        }

        const data = (await response.json()) as VacancyItem[];
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

  if (loading) {
    return <main className="px-4 py-6">Загрузка вакансий...</main>;
  }

  return (
    <main className="px-4 py-6 space-y-6">
      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h1 className="text-2xl font-semibold">Админка · Вакансии</h1>

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
            {vacancies.map((vacancy) => (
              <div
                key={vacancy.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium">
                      {vacancy.role} · {vacancy.venue_name}
                    </div>
                    <div className="text-sm text-slate-600">
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
                  </div>

                  <Link
                    href={`/admin/vacancies/${vacancy.id}`}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                  >
                    Открыть
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}