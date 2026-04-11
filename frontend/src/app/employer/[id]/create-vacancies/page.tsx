"use client";

import Link from "next/link";
import { use, useState } from "react";

type VacancyForm = {
  role: string;
  venue_name: string;
  city: string;
  district: string;
  salary_text: string;
  schedule_text: string;
  needed_start: string;
};

const initialForm: VacancyForm = {
  role: "",
  venue_name: "",
  city: "",
  district: "",
  salary_text: "",
  schedule_text: "",
  needed_start: "tomorrow",
};

export default function EmployerCreateVacancyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [form, setForm] = useState<VacancyForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function updateField<K extends keyof VacancyForm>(key: K, value: VacancyForm[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function saveVacancy() {
    setSaving(true);
    setMessage("");

    try {
      if (!form.role.trim()) {
        throw new Error("Укажи роль");
      }
      if (!form.venue_name.trim()) {
        throw new Error("Укажи название точки");
      }
      if (!form.city.trim()) {
        throw new Error("Укажи город");
      }

      const response = await fetch("/api/vacancies/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employer_id: Number(id),
          role: form.role.trim(),
          venue_name: form.venue_name.trim(),
          city: form.city.trim(),
          district: form.district.trim() || null,
          salary_text: form.salary_text.trim() || null,
          schedule_text: form.schedule_text.trim() || null,
          needed_start: form.needed_start || null,
          status: "new",
        }),
      });

      const data = (await response.json()) as { id?: number; detail?: string };

      if (!response.ok) {
        throw new Error(data.detail || "Не удалось создать вакансию");
      }

      window.location.href = `/employer/${id}`;
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Не удалось создать вакансию");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="space-y-6 px-4 py-6">
      <div>
        <Link href={`/employer/${id}`} className="text-sm text-slate-600 underline">
          ← Назад к работодателю
        </Link>
      </div>

      {message ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          {message}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <p className="text-sm text-slate-500">Создание вакансии</p>
        <h1 className="mt-1 text-2xl font-semibold">Новая вакансия</h1>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-600">Роль</label>
            <input
              value={form.role}
              onChange={(e) => updateField("role", e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder="Бариста"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-600">Точка</label>
            <input
              value={form.venue_name}
              onChange={(e) => updateField("venue_name", e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder="Coffee Stories Liteyny"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-600">Город</label>
            <input
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder="Санкт-Петербург"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-600">Район</label>
            <input
              value={form.district}
              onChange={(e) => updateField("district", e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder="Центральный"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-600">Ставка / доход</label>
            <input
              value={form.salary_text}
              onChange={(e) => updateField("salary_text", e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder="4000 shift"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-600">График</label>
            <input
              value={form.schedule_text}
              onChange={(e) => updateField("schedule_text", e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder="2/2"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-slate-600">Когда нужен выход</label>
            <select
              value={form.needed_start}
              onChange={(e) => updateField("needed_start", e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="today">Сегодня</option>
              <option value="tomorrow">Завтра</option>
              <option value="3days">В течение 3 дней</option>
              <option value="week">В течение недели</option>
            </select>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={saveVacancy}
            disabled={saving}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            {saving ? "Сохранение..." : "Создать вакансию"}
          </button>
        </div>
      </section>
    </main>
  );
}