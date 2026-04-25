"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CurrentUserRead } from "@/lib/current-user";
import { apiFetch } from "@/lib/api";
import { isTelegramWebApp } from "@/lib/telegram";

type EmployerItem = {
  id: number;
  company_name: string;
  contact_name: string;
  phone: string;
  telegram_username?: string | null;
  city: string;
  website?: string | null;
};

export default function EmployerStartPage() {
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isTelegram, setIsTelegram] = useState(false);

  const [currentUser, setCurrentUser] = useState<CurrentUserRead | null>(null);
  const [employer, setEmployer] = useState<EmployerItem | null>(null);

  useEffect(() => {
    setIsTelegram(isTelegramWebApp());
    setIsReady(true);

    async function loadEmployer() {
      try {
        setErrorText("");

        const me = await apiFetch<CurrentUserRead>("/auth/me");
        setCurrentUser(me);

        if (!me.is_employer || !me.employer_id) {
          setEmployer(null);
          return;
        }

        const employerData = await apiFetch<EmployerItem>("/me/employer");
        setEmployer(employerData);
      } catch (error) {
        console.error(error);

        if (error instanceof Error) {
          setErrorText(error.message);
        } else {
          setErrorText("Не удалось загрузить кабинет работодателя");
        }
      } finally {
        setLoading(false);
      }
    }

    void loadEmployer();
  }, []);

  const currentEmployerId = currentUser?.employer_id ?? employer?.id ?? null;

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
              Добро пожаловать в Hubsty для работодателя
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
                href={
                  currentEmployerId
                    ? `/employer/${currentEmployerId}/create-vacancies`
                    : "/employer/onboarding"
                }
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

        {loading ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
            Загрузка...
          </div>
        ) : errorText ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorText}
          </div>
        ) : currentEmployerId && isReady ? (
          <div className="mt-4">
            {!employer ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                Не удалось найти текущий кабинет работодателя.
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-lg font-semibold text-slate-900">
                  {employer.company_name}
                </div>

                <div className="mt-2 space-y-1 text-sm text-slate-600">
                  <div>Контакт: {employer.contact_name}</div>
                  <div>Телефон: {employer.phone}</div>
                  <div>Город: {employer.city}</div>
                  {employer.website ? <div>Сайт: {employer.website}</div> : null}
                </div>

                <div className={`mt-4 flex ${isTelegram ? "flex-col" : "flex-wrap"} gap-3`}>
                  <Link
                    href={`/employer/${employer.id}`}
                    className="rounded-2xl bg-slate-900 px-5 py-3 text-center text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    Открыть кабинет
                  </Link>

                  <Link
                    href={`/employer/${employer.id}/create-vacancies`}
                    className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Создать вакансию
                  </Link>
                </div>
              </div>
            )}
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
    </main>
  );
}