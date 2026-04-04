"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { CandidateDashboard } from "@/lib/types";

export default function MatchesPage() {
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
        <h1 className="text-2xl font-semibold">Мои отклики</h1>
        <div className="mt-4 space-y-3">
          {dashboard.items.map((item) => (
            <div
              key={item.match_id}
              className="rounded-xl border border-slate-200 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">
                    {item.role} · {item.venue_name}
                  </div>
                  <div className="text-sm text-slate-600">
                    {item.city}
                    {item.district ? `, ${item.district}` : ""}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Статус: {item.status}
                  </div>
                  {item.comment ? (
                    <div className="mt-1 text-sm text-slate-500">
                      Комментарий: {item.comment}
                    </div>
                  ) : null}
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">
                  {item.match_score ?? "-"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}