"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getCurrentEmployerId } from "@/lib/current-user";

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
  const [currentEmployerId, setCurrentEmployerId] = useState<number | null>(null);

  useEffect(() => {
    setCurrentEmployerId(getCurrentEmployerId());

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

    void loadEmployers();
  }, []);

  const currentEmployer = useMemo(() => {
    if (!currentEmployerId) {
      return null;
    }

    return employers.find((item) => item.id === currentEmployerId) || null;
  }, [employers, currentEmployerId]);

  function rememberEmployerId(id: number) {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem("hubsty_employer_id", String(id));
  }

  if (loading) {
    return (
      <main className="px-4 py-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          Загрузка работодателей...
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6 px-4 py-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-violet-50 via-white to-white p-5 md:p-6">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-slate-500">Работодатели</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              Работать с кабинетами работодателя
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Здесь можно быстро вернуться в свой кабинет или открыть другого работодателя,
              если вы тестируете разные сценарии.
            </p>
          </div>
        </div>
      </section>

      {errorText ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorText}
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Ваш кабинет</h2>

        {!currentEmployer ? (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            Текущий работодатель пока не выбран. Можно открыть нужный кабинет из списка ниже
            или сначала заполнить профиль работодателя.
            <div className="mt-4">
              <Link
                href="/employer/onboarding"
                className="inline-flex rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Заполнить профиль работодателя
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="font-medium text-slate-900">{currentEmployer.company_name}</div>
            <div className="mt-1 text-sm text-slate-600">
              Контакт: {currentEmployer.contact_name}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Телефон: {currentEmployer.phone}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Город: {currentEmployer.city}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={`/employer/${currentEmployer.id}`}
                onClick={() => rememberEmployerId(currentEmployer.id)}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Открыть кабинет
              </Link>

              <Link
                href={`/employer/${currentEmployer.id}/create-vacancies`}
                onClick={() => rememberEmployerId(currentEmployer.id)}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Создать вакансию
              </Link>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Все работодатели</h2>

        {employers.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            Пока нет работодателей.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {employers.map((employer) => {
              const isCurrent = employer.id === currentEmployerId;

              return (
                <div
                  key={employer.id}
                  className={`rounded-2xl border p-4 ${
                    isCurrent
                      ? "border-violet-200 bg-violet-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="font-medium text-slate-900">
                        {employer.company_name}
                      </div>

                      <div className="mt-1 text-sm text-slate-600">
                        Контакт: {employer.contact_name}
                      </div>

                      <div className="mt-1 text-sm text-slate-500">
                        Телефон: {employer.phone}
                      </div>

                      <div className="mt-1 text-sm text-slate-500">
                        Город: {employer.city}
                      </div>

                      {isCurrent ? (
                        <div className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-violet-700 ring-1 ring-violet-200">
                          Текущий работодатель
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/employer/${employer.id}`}
                        onClick={() => rememberEmployerId(employer.id)}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Открыть кабинет
                      </Link>

                      <Link
                        href={`/employer/${employer.id}/create-vacancies`}
                        onClick={() => rememberEmployerId(employer.id)}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Создать вакансию
                      </Link>
                    </div>
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