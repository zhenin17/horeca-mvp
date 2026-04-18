"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCurrentEmployerId } from "@/lib/current-user";

export default function EmployerStartPage() {
  const [isReady, setIsReady] = useState(false);
  const [currentEmployerId, setCurrentEmployerId] = useState<number | null>(null);

  useEffect(() => {
    const employerId = getCurrentEmployerId();
    setCurrentEmployerId(employerId > 0 ? employerId : null);
    setIsReady(true);
  }, []);

  if (!isReady) {
    return (
      <main className="px-4 py-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          Загрузка...
        </div>
      </main>
    );
  }

  const nextHref = currentEmployerId
    ? `/employer/${currentEmployerId}`
    : "/employer/onboarding";

  const nextLabel = currentEmployerId
    ? "Открыть кабинет"
    : "Заполнить анкету работодателя";

  const secondaryHref = currentEmployerId
    ? `/employer/${currentEmployerId}/create-vacancies`
    : "/employer/onboarding";

  const secondaryLabel = currentEmployerId
    ? "Создать вакансию"
    : "Создать профиль";

  return (
    <main className="space-y-6 px-4 py-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-violet-50 via-white to-white p-5 md:p-6">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-slate-500">Контур работодателя</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              Добро пожаловать в Hubsty для работодателя
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Здесь можно заполнить данные компании, создать вакансию,
              посмотреть кандидатов и двигать их по воронке без лишнего шума.
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Следующий шаг
            </div>

            <div className="mt-2 text-xl font-semibold text-slate-900">
              {currentEmployerId ? "Можно переходить в кабинет" : "Сначала заполните профиль"}
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {currentEmployerId
                ? "Профиль работодателя уже есть. Теперь можно смотреть вакансии и работать с кандидатами."
                : "Сначала создайте профиль работодателя, чтобы перейти к вакансиям и кандидатам."}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={nextHref}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                {nextLabel}
              </Link>

              <Link
                href={secondaryHref}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {secondaryLabel}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Как это работает</h2>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">1. Профиль</div>
            <div className="mt-2 text-sm leading-6 text-slate-600">
              Заполняете данные компании и контактного лица, чтобы система знала, кто ищет сотрудника.
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">2. Вакансии</div>
            <div className="mt-2 text-sm leading-6 text-slate-600">
              Создаете вакансию и сразу видите кандидатов, которые подходят под роль и локацию.
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">3. Кандидаты</div>
            <div className="mt-2 text-sm leading-6 text-slate-600">
              Двигаете кандидатов по статусам, открываете контакты только на нужном этапе и держите воронку под контролем.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}