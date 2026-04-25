"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const ADMIN_AUTH_STORAGE_KEY = "hubsty_admin_auth_v1";

export function isAdminAuthenticated() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(ADMIN_AUTH_STORAGE_KEY) === "accepted";
}

export function setAdminAuthenticated() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, "accepted");
}

export function clearAdminAuthenticated() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
}

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (pathname === "/admin/login") {
      setChecked(true);
      return;
    }

    if (!isAdminAuthenticated()) {
      router.replace("/admin/login");
      return;
    }

    setChecked(true);
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

  return <>{children}</>;
}