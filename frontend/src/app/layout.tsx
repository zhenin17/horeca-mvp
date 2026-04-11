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
        <div className="mx-auto min-h-screen max-w-5xl">
          <TelegramShell />

          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-3">
              <Link href="/" className="text-lg font-semibold">
                Hubsty
              </Link>

              <nav className="flex items-center gap-4 text-sm">
                <Link href="/" className="font-medium hover:text-slate-600">
                  Выбор роли
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