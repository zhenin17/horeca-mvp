import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = {
  title: "Hubsty Candidate",
  description: "Candidate mini app MVP",
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
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
            <nav className="flex items-center gap-4 px-4 py-3 text-sm">
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
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}