import Link from "next/link";
import type { ReactNode } from "react";

export default function EmployerLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div>
      <div className="border-b border-slate-200 bg-slate-50">
        <div className="space-y-2 px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Работодатель
          </div>
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <Link href="/employer/start" className="font-medium hover:text-slate-600">
              Старт
            </Link>
            <Link href="/employer/onboarding" className="font-medium hover:text-slate-600">
              Анкета
            </Link>
            <Link href="/employer/list" className="font-medium hover:text-slate-600">
              Работодатели
            </Link>
          </nav>
        </div>
      </div>

      {children}
    </div>
  );
}