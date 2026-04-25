import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6">
      <section className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-violet-50 via-white to-white p-6 md:p-8">
          <p className="text-sm font-medium text-violet-600">Hubsty</p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Работа, подработка и смены — проще через мэтч
          </h1>

          <p className="mt-4 text-sm leading-6 text-slate-600 md:text-base">
            Hubsty помогает кандидатам и работодателям быстрее находить друг друга:
            без лишних резюме, долгих переписок и сложных анкет.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Как пользоваться
            </div>

            <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
              <div>Кандидат смотрит подходящие вакансии, подработки и смены.</div>
              <div>Работодатель получает отклики и быстро открывает контакты.</div>
              <div>Основной вход в приложение работает через Telegram Mini App.</div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/telegram"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Открыть приложение
            </Link>

            <Link
              href="/about?from=/"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              О приложении
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-5 grid max-w-3xl gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Для кандидатов</div>
          <div className="mt-2 text-sm leading-6 text-slate-600">
            Вакансии, подработка, смены, отклики и статусы.
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Для работодателей</div>
          <div className="mt-2 text-sm leading-6 text-slate-600">
            Публикация вакансий, кандидаты и работа по воронке.
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Через Telegram</div>
          <div className="mt-2 text-sm leading-6 text-slate-600">
            Удобный вход без отдельной установки приложения.
          </div>
        </div>
      </section>
    </main>
  );
}