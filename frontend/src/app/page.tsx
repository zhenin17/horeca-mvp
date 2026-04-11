import Link from "next/link";

export default function RoleSelectPage() {
  return (
    <main className="space-y-6 px-4 py-6">
      <section className="rounded-2xl border border-slate-200 p-6 shadow-sm">
        <p className="text-sm text-slate-500">Старт</p>
        <h1 className="mt-2 text-3xl font-semibold">Выбери режим работы</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Здесь можно открыть отдельный контур кандидата, работодателя или админки.
          Каждый раздел теперь живет отдельно и не смешивается в одной навигации.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Link
            href="/candidate/start"
            className="rounded-2xl border border-slate-200 p-5 shadow-sm hover:bg-slate-50"
          >
            <div className="text-lg font-semibold">Кандидат</div>
            <div className="mt-2 text-sm text-slate-600">
              Анкета, вакансии, отклики, профиль.
            </div>
          </Link>

          <Link
            href="/employer/start"
            className="rounded-2xl border border-slate-200 p-5 shadow-sm hover:bg-slate-50"
          >
            <div className="text-lg font-semibold">Работодатель</div>
            <div className="mt-2 text-sm text-slate-600">
              Анкета работодателя, вакансии, shortlist, действия.
            </div>
          </Link>

          <Link
            href="/admin/vacancies"
            className="rounded-2xl border border-slate-200 p-5 shadow-sm hover:bg-slate-50"
          >
            <div className="text-lg font-semibold">Админка</div>
            <div className="mt-2 text-sm text-slate-600">
              Вакансии, кандидаты, события, управление воронкой.
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}