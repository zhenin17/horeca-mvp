import type { Metadata } from "next";
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
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" />
      </head>
      <body className="bg-white text-slate-900">
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}