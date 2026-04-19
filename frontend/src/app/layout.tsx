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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var webApp = window.Telegram && window.Telegram.WebApp;
                  var theme = (webApp && webApp.colorScheme) || "light";
                  document.documentElement.setAttribute("data-telegram-theme", theme);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-[var(--tg-bg)] text-[var(--tg-text)]">
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}