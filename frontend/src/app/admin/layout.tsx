import Link from "next/link";
import type { ReactNode } from "react";
import AdminGuard from "@/components/AdminGuard";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AdminGuard>
      <div>
        <div className="border-b border-slate-200 bg-slate-50">
          <div className="space-y-2 px-4 py-3">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Админка
            </div>

            <nav className="flex flex-wrap items-center gap-4 text-sm">
              <Link href="/admin/vacancies" className="font-medium hover:text-slate-600">
                Вакансии
              </Link>

              <Link href="/admin/candidates" className="font-medium hover:text-slate-600">
                Кандидаты
              </Link>

              <Link href="/admin/events" className="font-medium hover:text-slate-600">
                События
              </Link>

              <Link href="/about?from=/admin/vacancies" className="font-medium hover:text-slate-600">
                О приложении
              </Link>
            </nav>
          </div>
        </div>

        {children}
      </div>
    </AdminGuard>
  );
}