"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCurrentEmployerId } from "@/lib/current-user";
import { isTelegramWebApp } from "@/lib/telegram";

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
  const [isReady, setIsReady] = useState(false);
  const [currentEmployerId, setCurrentEmployerId] = useState<number | null>(null);
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    setCurrentEmployerId(getCurrentEmployerId());
    setIsTelegram(isTelegramWebApp());
    setIsReady(true);

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

    void loadEmployers();
  }, []);

  return (
    <main className={`px-4 ${isTelegram ? "space-y-5 py-5" : "space-y-6 py-6"}`}>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-violet-50 via-white to-white p-5 md:p-6">
          <div className={isTelegram ? "" : "max-w-2xl"}>
            <p
              className={`font-medium ${
                isTelegram
                  ? "text-xs uppercase tracking-[0.16em] text-violet-600"
                  : "text-sm text-slate-500"
              }`}
            >
              Контур работодателя
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              {isTelegram
                ? "Добро пожаловать в Hubsty для работодателя"
                : "Добро пожаловать в Hubsty для работодателя"}
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Здесь можно заполнить данные компании, создать вакансию, посмотреть
              кандидатов и двигать их по воронке без лишнего шума.
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-4 md:p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Следующий шаг
            </div>

            <div className="mt-2 text-lg font-semibold text-slate-900 md:text-xl">
              {currentEmployerId ? "Можно переходить в кабинет" : "Начните с анкеты работодателя"}
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {currentEmployerId
                ? "Профиль работодателя уже есть. Теперь можно смотреть вакансии и работать с кандидатами."
                : "Сначала заполните данные компании и контактного лица, чтобы система знала, кто ищет сотрудника."}
            </p>

            <div className={`mt-5 flex ${isTelegram ? "flex-col" : "flex-wrap"} gap-3`}>
              {currentEmployerId ? (
                <Link
                  href={`/employer/${currentEmployerId}`}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-center text-sm font-semibold text-white transition hover:opacity-90"
                >
                  Открыть кабинет
                </Link>
              ) : (
                <Link
                  href="/employer/onboarding"
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-center text-sm font-semibold text-white transition hover:opacity-90"
                >
                  Заполнить анкету
                </Link>
              )}

              <Link
                href={currentEmployerId ? `/employer/${currentEmployerId}/create-vacancies` : "/employer/onboarding"}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Создать вакансию
              </Link>

              {isTelegram ? (
                <Link
                  href="/telegram"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Сменить роль
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">
          {currentEmployerId ? "Ваш кабинет" : "Как это работает"}
        </h2>

        {currentEmployerId && isReady ? (
          <div className="mt-4">
            {(() => {
              const currentEmployer =
                employers.find((item) => item.id === currentEmployerId) || null;

              if (!currentEmployer) {
                return (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                    Не удалось найти текущий кабинет работодателя.
                  </div>
                );
              }

              return (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-lg font-semibold text-slate-900">
                    {currentEmployer.company_name}
                  </div>

                  <div className="mt-2 space-y-1 text-sm text-slate-600">
                    <div>Контакт: {currentEmployer.contact_name}</div>
                    <div>Телефон: {currentEmployer.phone}</div>
                    <div>Город: {currentEmployer.city}</div>
                  </div>

                  <div className={`mt-4 flex ${isTelegram ? "flex-col" : "flex-wrap"} gap-3`}>
                    <Link
                      href={`/employer/${currentEmployer.id}`}
                      className="rounded-2xl bg-slate-900 px-5 py-3 text-center text-sm font-semibold text-white transition hover:opacity-90"
                    >
                      Открыть кабинет
                    </Link>

                    <Link
                      href={`/employer/${currentEmployer.id}/create-vacancies`}
                      className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Создать вакансию
                    </Link>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">1. Профиль</div>
              <div className="mt-2 text-sm leading-6 text-slate-600">
                Заполняете данные компании и контактного лица, чтобы система знала,
                кто ищет сотрудника.
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">2. Вакансии</div>
              <div className="mt-2 text-sm leading-6 text-slate-600">
                Создаете вакансию и сразу видите кандидатов, которые подходят под
                роль и локацию.
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">3. Кандидаты</div>
              <div className="mt-2 text-sm leading-6 text-slate-600">
                Работаете со статусами: просмотр, приглашение, интервью, выход и итог.
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Текущие работодатели</h2>

        {loading ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
            Загрузка...
          </div>
        ) : errorText ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorText}
          </div>
        ) : employers.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            Пока нет работодателей. Можно создать первого.
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
                      ? "border-violet-200 bg-violet-50/60"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="font-medium text-slate-900">{employer.company_name}</div>
                      <div className="text-sm text-slate-600">
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
                          Текущий кабинет
                        </div>
                      ) : null}
                    </div>

                    <div className={`flex ${isTelegram ? "flex-col" : "flex-wrap"} gap-3`}>
                      <Link
                        href={`/employer/${employer.id}`}
                        className="rounded-2xl bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white hover:opacity-90"
                      >
                        Открыть
                      </Link>

                      <Link
                        href={`/employer/${employer.id}/create-vacancies`}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
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