import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hubsty",
  description: "MVP найма для HoReCa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="bg-white text-slate-900">
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />

        <div className="mx-auto min-h-screen max-w-5xl">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
            <div>Режим браузера</div>
          </div>

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

          <main className="px-4 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}