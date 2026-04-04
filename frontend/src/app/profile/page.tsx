"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { CandidateDashboard } from "@/lib/types";

export default function ProfilePage() {
  const [dashboard, setDashboard] = useState<CandidateDashboard | null>(null);

  useEffect(() => {
    apiFetch<CandidateDashboard>("/candidates/1/dashboard")
      .then(setDashboard)
      .catch(console.error);
  }, []);

  if (!dashboard) {
    return <main className="px-4 py-6">Загрузка...</main>;
  }

  return (
    <main className="px-4 py-6 space-y-6">
      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <p className="text-sm text-slate-500">Профиль кандидата</p>
        <h1 className="mt-1 text-2xl font-semibold">{dashboard.full_name}</h1>
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <div>Роль: {dashboard.primary_role}</div>
          <div>Город: {dashboard.city}</div>
          <div>Район: {dashboard.district || "-"}</div>
          <div>Готовность выйти: {dashboard.ready_to_start}</div>
          <div>Всего откликов: {dashboard.total_matches}</div>
          <div>Активные: {dashboard.active_matches}</div>
          <div>Нанят: {dashboard.hired_matches}</div>
          <div>Отклонен: {dashboard.rejected_matches}</div>
        </div>
      </section>
    </main>
  );
}