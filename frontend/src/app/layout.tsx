import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import ClientShell from "./shell";

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
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}