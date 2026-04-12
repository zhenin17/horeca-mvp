"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type EmployerForm = {
  company_name: string;
  contact_name: string;
  phone: string;
  telegram_username: string;
  city: string;
  website: string;
};

type FieldErrors = Partial<Record<keyof EmployerForm, string>>;

function normalizeTelegramUsername(value: string) {
  return value.trim().replace(/^@/, "");
}

function normalizeWebsite(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function validateForm(form: EmployerForm): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.company_name.trim()) {
    errors.company_name = "Укажи название компании";
  }

  if (!form.contact_name.trim()) {
    errors.contact_name = "Укажи контактное лицо";
  }

  if (!form.phone.trim()) {
    errors.phone = "Укажи телефон";
  }

  if (!form.city.trim()) {
    errors.city = "Укажи город";
  }

  return errors;
}

export default function EmployerOnboardingPage() {
  const router = useRouter();

  const [form, setForm] = useState<EmployerForm>({
    company_name: "",
    contact_name: "",
    phone: "",
    telegram_username: "",
    city: "Санкт-Петербург",
    website: "",
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");
  const [saving, setSaving] = useState(false);

  function updateField<K extends keyof EmployerForm>(key: K, value: EmployerForm[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

    setFieldErrors((prev) => ({
      ...prev,
      [key]: "",
    }));

    setErrorText("");
    setSuccessText("");
  }

  async function saveEmployer() {
    try {
      setErrorText("");
      setSuccessText("");

      const validationErrors = validateForm(form);
      setFieldErrors(validationErrors);

      if (Object.keys(validationErrors).length > 0) {
        setErrorText("Заполни обязательные поля, чтобы продолжить");
        return;
      }

      setSaving(true);

      const payload = {
        company_name: form.company_name.trim(),
        contact_name: form.contact_name.trim(),
        phone: form.phone.trim(),
        telegram_username: normalizeTelegramUsername(form.telegram_username) || null,
        city: form.city.trim(),
        website: normalizeWebsite(form.website) || null,
      };

      const response = await fetch("/api/employers", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      const data = text ? JSON.parse(text) : null;

      if (!response.ok) {
        throw new Error(data?.detail || "Не удалось создать работодателя");
      }

      setSuccessText("Работодатель сохранен");

      setTimeout(() => {
        router.push(`/employer/${data.id}/create-vacancies`);
      }, 700);
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        setErrorText(error.message);
      } else {
        setErrorText("Не удалось создать работодателя");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="space-y-6 px-4 py-6">
      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Работодатель</p>
            <h1 className="mt-2 text-2xl font-semibold">Заполнить данные компании</h1>
            <p className="mt-2 text-sm text-slate-600">
              Укажи базовую информацию о компании. Сайт можно добавить позже, он не обязателен.
            </p>
          </div>

          <Link
            href="/employer/start"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Назад
          </Link>
        </div>
      </section>

      {errorText ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorText}
        </div>
      ) : null}

      {successText ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {successText}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Компания *</label>
            <input
              value={form.company_name}
              onChange={(e) => updateField("company_name", e.target.value)}
              className={`w-full rounded-xl border px-3 py-2 outline-none ${
                fieldErrors.company_name ? "border-red-300 bg-red-50" : "border-slate-300"
              }`}
              placeholder="Например, Coffee Stories"
            />
            {fieldErrors.company_name ? (
              <div className="mt-1 text-sm text-red-600">{fieldErrors.company_name}</div>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Контактное лицо *</label>
            <input
              value={form.contact_name}
              onChange={(e) => updateField("contact_name", e.target.value)}
              className={`w-full rounded-xl border px-3 py-2 outline-none ${
                fieldErrors.contact_name ? "border-red-300 bg-red-50" : "border-slate-300"
              }`}
              placeholder="Например, Анна"
            />
            {fieldErrors.contact_name ? (
              <div className="mt-1 text-sm text-red-600">{fieldErrors.contact_name}</div>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Телефон *</label>
            <input
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              className={`w-full rounded-xl border px-3 py-2 outline-none ${
                fieldErrors.phone ? "border-red-300 bg-red-50" : "border-slate-300"
              }`}
              placeholder="+79990000000"
            />
            {fieldErrors.phone ? (
              <div className="mt-1 text-sm text-red-600">{fieldErrors.phone}</div>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Telegram username</label>
            <input
              value={form.telegram_username}
              onChange={(e) => updateField("telegram_username", e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none"
              placeholder="@anna_hr"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Город *</label>
            <input
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              className={`w-full rounded-xl border px-3 py-2 outline-none ${
                fieldErrors.city ? "border-red-300 bg-red-50" : "border-slate-300"
              }`}
              placeholder="Санкт-Петербург"
            />
            {fieldErrors.city ? (
              <div className="mt-1 text-sm text-red-600">{fieldErrors.city}</div>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Сайт компании</label>
            <input
              value={form.website}
              onChange={(e) => updateField("website", e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none"
              placeholder="Например, coffeestories.ru"
            />
            <div className="mt-1 text-xs text-slate-500">
              Необязательное поле
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void saveEmployer()}
            disabled={saving}
            className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Сохраняем..." : "Продолжить"}
          </button>

          <Link
            href="/employer/start"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Отмена
          </Link>
        </div>

        <div className="mt-4 text-xs text-slate-500">* Обязательные поля</div>
      </section>
    </main>
  );
}