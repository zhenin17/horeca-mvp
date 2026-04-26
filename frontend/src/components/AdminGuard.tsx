"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { CurrentUserRead } from "@/lib/current-user";

export default function AdminGuard({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [checked, setChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      try {
        setChecked(false);
        setErrorText("");

        const me = await apiFetch<CurrentUserRead>("/auth/me");

        if (cancelled) {
          return;
        }

        const isStaff =
          Boolean(me.is_admin) ||
          Boolean(me.is_moderator) ||
          Boolean(me.is_support);

        if (!isStaff) {
          setHasAccess(false);
          setChecked(true);
          setErrorText("Нет доступа к админке");

          if (pathname !== "/telegram") {
            router.replace("/telegram");
          }
          return;
        }

        setHasAccess(true);
        setChecked(true);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(error);
        setHasAccess(false);
        setChecked(true);

        if (error instanceof Error) {
          setErrorText(error.message || "Нет доступа к админке");
        } else {
          setErrorText("Нет доступа к админке");
        }

        if (pathname !== "/telegram") {
          router.replace("/telegram");
        }
      }
    }

    void checkAccess();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!checked) {
    return (
      <main className="px-4 py-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          Проверяем доступ к админке...
        </div>
      </main>
    );
  }

  if (!hasAccess) {
    return (
      <main className="px-4 py-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 shadow-sm">
          {errorText || "Нет доступа к админке"}
        </div>
      </main>
    );
  }

  return <>{children}</>;
}