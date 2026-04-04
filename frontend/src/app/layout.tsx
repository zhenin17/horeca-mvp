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
        <div className="mx-auto min-h-screen max-w-3xl">
          <TelegramShell />

          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
            <nav className="flex flex-wrap items-center gap-4 px-4 py-3 text-sm">
              <Link href="/" className="font-medium hover:text-slate-600">
                Вакансии
              </Link>
              <Link href="/matches" className="font-medium hover:text-slate-600">
                Мои отклики
              </Link>
              <Link href="/profile" className="font-medium hover:text-slate-600">
                Профиль
              </Link>
              <Link
                href="/admin/vacancies"
                className="font-medium hover:text-slate-600"
              >
                Админка · вакансии
              </Link>
              <Link
                href="/admin/candidates"
                className="font-medium hover:text-slate-600"
              >
                Админка · кандидаты
              </Link>
            </nav>
          </header>

          {children}
        </div>
      </body>
    </html>
  );
}