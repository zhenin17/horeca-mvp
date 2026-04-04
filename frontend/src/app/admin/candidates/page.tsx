"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

export default function AdminCandidatesPage() {
  const [candidates, setCandidates] = useState<CandidateItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCandidates() {
      try {
        const response = await fetch("/api/candidates", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Не удалось загрузить кандидатов");
        }

        const data = (await response.json()) as CandidateItem[];
        setCandidates(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadCandidates();
  }, []);

  if (loading) {
    return <main className="px-4 py-6">Загрузка кандидатов...</main>;
  }

  return (
    <main className="px-4 py-6 space-y-6">
      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h1 className="text-2xl font-semibold">Админка · Кандидаты</h1>

        <div className="mt-4 space-y-3">
          {candidates.map((candidate) => (
            <div
              key={candidate.id}
              className="rounded-xl border border-slate-200 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium">{candidate.full_name}</div>
                  <div className="text-sm text-slate-600">
                    {candidate.primary_role} · {candidate.city}
                    {candidate.district ? `, ${candidate.district}` : ""}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Опыт: {candidate.horeca_experience_months} мес.
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Готовность: {candidate.ready_to_start}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Телефон: {candidate.phone}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Статус: {candidate.is_active ? "активен" : "неактивен"}
                  </div>
                </div>

                <Link
                  href={`/admin/candidates/${candidate.id}`}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  Открыть
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}