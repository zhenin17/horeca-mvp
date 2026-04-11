"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type EmployerItem = {
  id: number;
  company_name: string;
  contact_name: string;
  phone: string;
  telegram_username?: string | null;
  city: string;
};

export default function EmployerListPage() {
  const [employers, setEmployers] = useState<EmployerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    async function loadEmployers() {
      try {
        setErrorText("");

        const response = await fetch("/api/employers/", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Не удалось загрузить работодателей (${response.status})`);
        }

        const data = (await response.json()) as EmployerItem[];
        setEmployers(data);
      } catch (error) {
        console.error(error);

        if (error instanceof Error) {
          setErrorText(error.message);
        } else {
          setErrorText("Не удалось загрузить работодателей");
        }
      } finally {
        setLoading(false);
      }
    }

    loadEmployers();
  }, []);

  if (loading) {
    return <main className="px-4 py-6">Загрузка работодателей...</main>;
  }

  return (
    <main className="space-y-6 px-4 py-6">
      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h1 className="text-2xl font-semibold">Работодатели</h1>

        {errorText ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorText}
          </div>
        ) : employers.length === 0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            Пока нет работодателей.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {employers.map((employer) => (
              <div
                key={employer.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium">{employer.company_name}</div>
                    <div className="text-sm text-slate-600">
                      Контакт: {employer.contact_name}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      Телефон: {employer.phone}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      Город: {employer.city}
                    </div>
                  </div>

                  <Link
                    href={`/employer/${employer.id}`}
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