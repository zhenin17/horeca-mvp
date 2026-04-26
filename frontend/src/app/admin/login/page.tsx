"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.replace("/telegram");
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <main className="px-4 py-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Админка</p>

        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Вход в админку изменён
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Доступ к админке теперь проверяется через Telegram-авторизацию и staff-роли.
          Старый вход по паролю больше не используется.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/telegram"
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:opacity-90"
          >
            Перейти в Telegram-вход
          </Link>

          <Link
            href="/admin/candidates"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Открыть админку
          </Link>
        </div>
      </section>
    </main>
  );
}
