import Link from "next/link";
import type { ReactNode } from "react";

export default function CandidateLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div>
      <div className="border-b border-slate-200 bg-slate-50">
        <div className="space-y-2 px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Кандидат
          </div>
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <Link href="/candidate/start" className="font-medium hover:text-slate-600">
              Старт
            </Link>
            <Link href="/candidate/onboarding" className="font-medium hover:text-slate-600">
              Анкета
            </Link>
            <Link href="/candidate/vacancies" className="font-medium hover:text-slate-600">
              Вакансии
            </Link>
            <Link href="/candidate/matches" className="font-medium hover:text-slate-600">
              Мои отклики
            </Link>
            <Link href="/candidate/profile" className="font-medium hover:text-slate-600">
              Профиль
            </Link>
          </nav>
        </div>
      </div>

      {children}
    </div>
  );
}