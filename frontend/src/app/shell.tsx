"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { isTelegramWebApp } from "@/lib/telegram";

type Props = {
  children: ReactNode;
};

type ActiveRole = "candidate" | "employer" | null;

function roleLabel(role: ActiveRole) {
  if (role === "candidate") {
    return "Кандидат";
  }

  if (role === "employer") {
    return "Работодатель";
  }

  return "Не выбрана";
}

export default function ClientShell({ children }: Props) {
  const [isTelegram, setIsTelegram] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeRole, setActiveRole] = useState<ActiveRole>(null);

  useEffect(() => {
    const telegramMode = isTelegramWebApp();
    setIsTelegram(telegramMode);

    if (telegramMode && typeof window !== "undefined") {
      const savedRole = window.localStorage.getItem("hubsty_active_role");
      if (savedRole === "candidate" || savedRole === "employer") {
        setActiveRole(savedRole);
      }
    }

    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="mx-auto min-h-screen max-w-5xl">
        <main className="px-4 py-6">{children}</main>
      </div>
    );
  }

  if (isTelegram) {
    return (
      <div className="mx-auto min-h-screen max-w-5xl">
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <div className="text-sm font-semibold">Hubsty</div>
              <div className="text-xs text-slate-500">
                Роль: {roleLabel(activeRole)}
              </div>
            </div>

            <Link
              href="/telegram"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Сменить роль
            </Link>
          </div>
        </div>

        <main className="px-4 py-4">{children}</main>
      </div>
    );
  }

  return (
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
  );
}