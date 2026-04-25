"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CandidateForm = {
  full_name: string;
  phone: string;
  telegram_username: string;
  city: string;
  district: string;
  primary_role: string;
  horeca_experience_months: string;
  ready_to_start: string;
  expected_income: string;
};

const initialForm: CandidateForm = {
  full_name: "",
  phone: "",
  telegram_username: "",
  city: "",
  district: "",
  primary_role: "",
  horeca_experience_months: "0",
  ready_to_start: "tomorrow",
  expected_income: "",
};

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CandidateForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadCandidate() {
      try {
        setMessage("");

        const response = await fetch("/api/candidates/1", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Не удалось загрузить анкету кандидата");
        }

        const data = (await response.json()) as {
          full_name: string;
          phone: string;
          telegram_username?: string | null;
          city: string;
          district?: string | null;
          primary_role: string;
          horeca_experience_months: number;
          ready_to_start: string;
          expected_income?: string | null;
        };

        setForm({
          full_name: data.full_name || "",
          phone: data.phone || "",
          telegram_username: data.telegram_username || "",
          city: data.city || "",
          district: data.district || "",
          primary_role: data.primary_role || "",
          horeca_experience_months: String(data.horeca_experience_months ?? 0),
          ready_to_start: data.ready_to_start || "tomorrow",
          expected_income: data.expected_income || "",
        });
      } catch (error) {
        console.error(error);
        setMessage("Не удалось загрузить анкету");
      } finally {
        setLoading(false);
      }
    }

    loadCandidate();
  }, []);

  function updateField<K extends keyof CandidateForm>(key: K, value: CandidateForm[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  const stepTitle = useMemo(() => {
    const titles: Record<number, string> = {
      1: "Основные данные",
      2: "Роль и опыт",
      3: "Готовность и доход",
      4: "Проверка анкеты",
    };

    return titles[step] || "Анкета";
  }, [step]);

  function validateStep(currentStep: number): boolean {
    if (currentStep === 1) {
      if (!form.full_name.trim()) {
        setMessage("Укажи имя и фамилию");
        return false;
      }
      if (!form.phone.trim()) {
        setMessage("Укажи телефон");
        return false;
      }
      if (!form.city.trim()) {
        setMessage("Укажи город");
        return false;
      }
    }

    if (currentStep === 2) {
      if (!form.primary_role.trim()) {
        setMessage("Укажи основную роль");
        return false;
      }
      if (Number.isNaN(Number(form.horeca_experience_months))) {
        setMessage("Опыт должен быть числом");
        return false;
      }
    }

    if (currentStep === 3) {
      if (!form.ready_to_start.trim()) {
        setMessage("Укажи готовность выйти");
        return false;
      }
    }

    setMessage("");
    return true;
  }

  function nextStep() {
    if (!validateStep(step)) {
      return;
    }

    setStep((prev) => Math.min(prev + 1, 4));
  }

  function prevStep() {
    setMessage("");
    setStep((prev) => Math.max(prev - 1, 1));
  }

  async function saveCandidate() {
    if (!validateStep(3)) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/candidates/1", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          telegram_username: form.telegram_username.trim() || null,
          city: form.city.trim(),
          district: form.district.trim() || null,
          primary_role: form.primary_role.trim(),
          horeca_experience_months: Number(form.horeca_experience_months || "0"),
          ready_to_start: form.ready_to_start,
          expected_income: form.expected_income.trim() || null,
        }),
      });

      const data = (await response.json()) as { detail?: string };

      if (!response.ok) {
        throw new Error(data.detail || "Не удалось сохранить анкету");
      }

      setMessage("Анкета сохранена");
      window.location.href = "/";
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Не удалось сохранить анкету");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="px-4 py-6">Загрузка анкеты...</main>;
  }

  return (
    <main className="space-y-6 px-4 py-6">
      <div>
        <Link href="/profile" className="text-sm text-slate-600 underline">
          ← Назад к профилю
        </Link>
      </div>

      {message ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          {message}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Анкета кандидата</p>
            <h1 className="mt-1 text-2xl font-semibold">{stepTitle}</h1>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">
            Шаг {step} из 4
          </div>
        </div>

        {step === 1 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-slate-600">Имя и фамилия</label>
              <input
                value={form.full_name}
                onChange={(e) => updateField("full_name", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="Например, Иван Иванов"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-600">Телефон</label>
              <input
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="+79990000001"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-600">Telegram</label>
              <input
                value={form.telegram_username}
                onChange={(e) => updateField("telegram_username", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="ivan_test"
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
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-600">Основная роль</label>
              <input
                value={form.primary_role}
                onChange={(e) => updateField("primary_role", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="Бариста"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-600">Опыт в HoReCa, мес.</label>
              <input
                value={form.horeca_experience_months}
                onChange={(e) => updateField("horeca_experience_months", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="12"
                inputMode="numeric"
              />
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-600">Когда готов выйти</label>
              <select
                value={form.ready_to_start}
                onChange={(e) => updateField("ready_to_start", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="today">Сегодня</option>
                <option value="tomorrow">Завтра</option>
                <option value="3days">В течение 3 дней</option>
                <option value="week">В течение недели</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-600">Желаемый доход</label>
              <input
                value={form.expected_income}
                onChange={(e) => updateField("expected_income", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="4500 shift"
              />
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="mt-6 space-y-3 text-sm text-slate-700">
            <div>Имя: {form.full_name || "-"}</div>
            <div>Телефон: {form.phone || "-"}</div>
            <div>Telegram: {form.telegram_username || "-"}</div>
            <div>Город: {form.city || "-"}</div>
            <div>Район: {form.district || "-"}</div>
            <div>Роль: {form.primary_role || "-"}</div>
            <div>Опыт: {form.horeca_experience_months || "0"} мес.</div>
            <div>Готовность выйти: {form.ready_to_start || "-"}</div>
            <div>Желаемый доход: {form.expected_income || "-"}</div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          {step > 1 ? (
            <button
              onClick={prevStep}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Назад
            </button>
          ) : null}

          {step < 4 ? (
            <button
              onClick={nextStep}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Дальше
            </button>
          ) : (
            <button
              onClick={saveCandidate}
              disabled={saving}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              {saving ? "Сохранение..." : "Сохранить анкету"}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}