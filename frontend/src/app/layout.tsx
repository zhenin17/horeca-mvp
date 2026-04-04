import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";
import TelegramShell from "@/components/telegram-shell";

export const metadata = {
  title: "Hubsty",
  description: "MVP найма для HoReCa",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="bg-white text-slate-900">
        <div className="mx-auto min-h-screen max-w-4xl">
          <TelegramShell />

          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="px-4 py-3 space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Кандидат
              </div>
              <nav className="flex flex-wrap items-center gap-4 text-sm">
                <Link href="/" className="font-medium hover:text-slate-600">
                  Вакансии
                </Link>
                <Link href="/matches" className="font-medium hover:text-slate-600">
                  Мои отклики
                </Link>
                <Link href="/profile" className="font-medium hover:text-slate-600">
                  Профиль
                </Link>
              </nav>

              <div className="pt-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                Админка
              </div>
              <nav className="flex flex-wrap items-center gap-4 text-sm">
                <Link
                  href="/admin/vacancies"
                  className="font-medium hover:text-slate-600"
                >
                  Вакансии
                </Link>
                <Link
                  href="/admin/candidates"
                  className="font-medium hover:text-slate-600"
                >
                  Кандидаты
                </Link>
              </nav>
            </div>
          </header>

          {children}
        </div>
      </body>
    </html>
  );
}