"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setAdminAuthenticated } from "@/components/AdminGuard";

const ADMIN_PASSWORD = "hubsty-admin";

export default function AdminLoginPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [errorText, setErrorText] = useState("");

  function handleLogin() {
    setErrorText("");

    if (password.trim() !== ADMIN_PASSWORD) {
      setErrorText("Неверный пароль");
      return;
    }

    setAdminAuthenticated();
    router.replace("/admin/vacancies");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Hubsty admin</p>

        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Вход в админку
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Это временная защита MVP, чтобы админские экраны не открывались случайно
          по прямой ссылке.
        </p>

        {errorText ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorText}
          </div>
        ) : null}

        <div className="mt-5">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Пароль
          </label>

          <input
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setErrorText("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleLogin();
              }
            }}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
            placeholder="Введите пароль"
          />
        </div>

        <button
          type="button"
          onClick={handleLogin}
          className="mt-5 w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Войти
        </button>

        <div className="mt-4 text-xs leading-5 text-slate-500">
          Временный пароль MVP:{" "}
          <span className="font-mono text-slate-700">hubsty-admin</span>
        </div>
      </section>
    </main>
  );
}