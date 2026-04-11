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

export default function EmployerStartPage() {
  const [employers, setEmployers] = useState<EmployerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    async function loadEmployers() {
      try {
        setErrorText("");

        const response = await fetch("/api/employers", {
          cache: "no-store",
        });

        const contentType = response.headers.get("content-type") || "";
        const text = await response.text();

        if (!response.ok) {
          throw new Error(`Не удалось загрузить работодателей (${response.status})`);
        }

        if (!text.trim()) {
          setEmployers([]);
          return;
        }

        if (!contentType.includes("application/json")) {
          throw new Error("Сервер вернул не JSON, а другой формат ответа");
        }

        const data = JSON.parse(text) as EmployerItem[];

        setEmployers(Array.isArray(data) ? data : []);
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

  return (
    <main className="space-y-6 px-4 py-6">
      <section className="rounded-2xl border border-slate-200 p-6 shadow-sm">
        <p className="text-sm text-slate-500">Контур работодателя</p>
        <h1 className="mt-2 text-3xl font-semibold">Добро пожаловать в Hubsty для работодателя</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Здесь можно заполнить данные о работодателе, создать вакансию,
          посмотреть shortlist и управлять движением кандидатов по воронке.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/employer/onboarding"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Заполнить анкету работодателя
          </Link>
          <Link
            href="/employer/list"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Смотреть работодателей
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Текущие работодатели</h2>

        {loading ? (
          <div className="mt-4 text-sm text-slate-600">Загрузка...</div>
        ) : errorText ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorText}
          </div>
        ) : employers.length === 0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            Пока нет работодателей. Можно создать первого.
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