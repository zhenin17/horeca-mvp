"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type EmployerForm = {
  company_name: string;
  contact_name: string;
  phone: string;
  telegram_username: string;
  city: string;
};

const initialForm: EmployerForm = {
  company_name: "",
  contact_name: "",
  phone: "",
  telegram_username: "",
  city: "",
};

export default function EmployerOnboardingPage() {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<EmployerForm>(initialForm);

  const stepTitle = useMemo(() => {
    const titles: Record<number, string> = {
      1: "Компания и контакт",
      2: "Связь и город",
      3: "Проверка анкеты",
    };

    return titles[step] || "Анкета работодателя";
  }, [step]);

  function updateField<K extends keyof EmployerForm>(key: K, value: EmployerForm[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function validateStep(currentStep: number): boolean {
    if (currentStep === 1) {
      if (!form.company_name.trim()) {
        setMessage("Укажи название компании");
        return false;
      }
      if (!form.contact_name.trim()) {
        setMessage("Укажи контактное лицо");
        return false;
      }
    }

    if (currentStep === 2) {
      if (!form.phone.trim()) {
        setMessage("Укажи телефон");
        return false;
      }
      if (!form.city.trim()) {
        setMessage("Укажи город");
        return false;
      }
    }

    setMessage("");
    return true;
  }

  function nextStep() {
    if (!validateStep(step)) return;
    setStep((prev) => Math.min(prev + 1, 3));
  }

  function prevStep() {
    setMessage("");
    setStep((prev) => Math.max(prev - 1, 1));
  }

  async function saveEmployer() {
    if (!validateStep(2)) return;

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/employers/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          company_name: form.company_name.trim(),
          contact_name: form.contact_name.trim(),
          phone: form.phone.trim(),
          telegram_username: form.telegram_username.trim() || null,
          city: form.city.trim(),
        }),
      });

      const data = (await response.json()) as { id?: number; detail?: string };

      if (!response.ok) {
        throw new Error(data.detail || "Не удалось сохранить работодателя");
      }

      if (!data.id) {
        throw new Error("Не удалось получить идентификатор работодателя");
      }

      window.location.href = `/employers/${data.id}/create-vacancy`;
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Не удалось сохранить работодателя");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="space-y-6 px-4 py-6">
      <div>
        <Link href="/employer-start" className="text-sm text-slate-600 underline">
          ← Назад к старту работодателя
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
            <p className="text-sm text-slate-500">Анкета работодателя</p>
            <h1 className="mt-1 text-2xl font-semibold">{stepTitle}</h1>
          </div>

          <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">
            Шаг {step} из 3
          </div>
        </div>

        {step === 1 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-slate-600">Компания</label>
              <input
                value={form.company_name}
                onChange={(e) => updateField("company_name", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="Coffee Stories"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-slate-600">Контактное лицо</label>
              <input
                value={form.contact_name}
                onChange={(e) => updateField("contact_name", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="Анна Петрова"
              />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-600">Телефон</label>
              <input
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="+79990000002"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-600">Telegram</label>
              <input
                value={form.telegram_username}
                onChange={(e) => updateField("telegram_username", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="coffee_owner"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-slate-600">Город</label>
              <input
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="Санкт-Петербург"
              />
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="mt-6 space-y-3 text-sm text-slate-700">
            <div>Компания: {form.company_name || "-"}</div>
            <div>Контактное лицо: {form.contact_name || "-"}</div>
            <div>Телефон: {form.phone || "-"}</div>
            <div>Telegram: {form.telegram_username || "-"}</div>
            <div>Город: {form.city || "-"}</div>
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

          {step < 3 ? (
            <button
              onClick={nextStep}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Дальше
            </button>
          ) : (
            <button
              onClick={saveEmployer}
              disabled={saving}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              {saving ? "Сохранение..." : "Сохранить и перейти к вакансии"}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}