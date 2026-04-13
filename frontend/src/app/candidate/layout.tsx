"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

function topNavClass(isActive: boolean) {
  return isActive
    ? "rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
    : "rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900";
}

function bottomNavClass(isActive: boolean) {
  return isActive
    ? "flex h-12 min-w-0 flex-1 items-center justify-center rounded-2xl bg-slate-900 px-3 text-sm font-semibold text-white shadow-sm"
    : "flex h-12 min-w-0 flex-1 items-center justify-center rounded-2xl bg-white px-3 text-sm font-medium text-slate-600";
}

function detectTelegramWebApp() {
  if (typeof window === "undefined") {
    return false;
  }

  const w = window as typeof window & {
    Telegram?: {
      WebApp?: {
        initData?: string;
      };
    };
  };

  return Boolean(w.Telegram?.WebApp?.initData?.trim());
}

export default function CandidateLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    setIsTelegram(detectTelegramWebApp());
    setMounted(true);
  }, []);

  const isStart = pathname === "/candidate/start";
  const isOnboarding = pathname.startsWith("/candidate/onboarding");
  const isVacancies = pathname.startsWith("/candidate/vacancies");
  const isMatches = pathname.startsWith("/candidate/matches");
  const isProfile = pathname.startsWith("/candidate/profile");

  if (!mounted) {
    return (
      <div className="overflow-x-hidden">
        <div className="overflow-x-hidden">{children}</div>
      </div>
    );
  }

  const showTelegramUi = isTelegram;

  return (
    <div className={showTelegramUi ? "overflow-x-hidden pb-28" : "overflow-x-hidden"}>
      {!showTelegramUi ? (
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="px-4 py-3">
            <div className="mb-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Кандидат
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Понятный путь: анкета → вакансии → отклики
              </div>
            </div>

            <nav className="flex flex-wrap gap-2">
              <Link href="/candidate/start" className={topNavClass(isStart)}>
                Старт
              </Link>
              <Link href="/candidate/onboarding" className={topNavClass(isOnboarding)}>
                Анкета
              </Link>
              <Link href="/candidate/vacancies" className={topNavClass(isVacancies)}>
                Вакансии
              </Link>
              <Link href="/candidate/matches" className={topNavClass(isMatches)}>
                Отклики
              </Link>
              <Link href="/candidate/profile" className={topNavClass(isProfile)}>
                Профиль
              </Link>
            </nav>
          </div>
        </div>
      ) : (
        <div className="border-b border-slate-200 bg-white">
          <div className="px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Hubsty · Кандидат
            </div>
            <div className="mt-1 text-sm text-slate-600">
              Анкета, вакансии и отклики — без перегруза
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-hidden">{children}</div>

      {showTelegramUi ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto w-full max-w-md px-3 pt-3 [padding-bottom:calc(env(safe-area-inset-bottom)+12px)]">
            <nav className="flex items-center gap-2">
              <Link href="/candidate/start" className={bottomNavClass(isStart)}>
                Старт
              </Link>
              <Link href="/candidate/vacancies" className={bottomNavClass(isVacancies)}>
                Вакансии
              </Link>
              <Link href="/candidate/matches" className={bottomNavClass(isMatches)}>
                Отклики
              </Link>
              <Link
                href="/candidate/profile"
                className={bottomNavClass(isProfile || isOnboarding)}
              >
                Профиль
              </Link>
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}