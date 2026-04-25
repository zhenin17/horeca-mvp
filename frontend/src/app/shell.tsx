"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { getActiveRole } from "@/lib/current-user";
import { isTelegramWebApp } from "@/lib/telegram";

type Props = {
  children: ReactNode;
};

export default function ClientShell({ children }: Props) {
  const [isTelegram, setIsTelegram] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [, setActiveRole] = useState(getActiveRole());

  useEffect(() => {
    const telegramMode = isTelegramWebApp();
    setIsTelegram(telegramMode);

    if (telegramMode) {
      setActiveRole(getActiveRole());
    }

    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="mx-auto min-h-screen max-w-5xl overflow-x-hidden bg-white">
        <main className="px-4 py-6">{children}</main>
      </div>
    );
  }

  if (isTelegram) {
    return (
      <div className="mx-auto min-h-screen max-w-5xl overflow-x-hidden bg-white">
        <main className="px-0 py-0">{children}</main>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl overflow-x-hidden bg-white">
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
  );
}