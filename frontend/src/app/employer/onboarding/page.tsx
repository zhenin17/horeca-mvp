"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, apiPostJson } from "@/lib/api";
import type { CurrentUserRead } from "@/lib/current-user";

type EmployerForm = {
  company_name: string;
  contact_name: string;
  phone: string;
  telegram_username: string;
  city: string;
  website: string;
};

type FieldErrors = Partial<Record<keyof EmployerForm, string>>;

type EmployerRead = {
  id: number;
  company_name: string;
  contact_name: string;
  phone: string;
  telegram_username?: string | null;
  city: string;
  website?: string | null;
};

function normalizeTelegramUsername(value: string) {
  return value.trim().replace(/^@/, "");
}

function normalizeWebsite(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
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

function inputClass(hasError?: boolean) {
  return `w-full rounded-2xl border px-4 py-3 text-base outline-none transition ${
    hasError
      ? "border-red-300 bg-red-50 focus:border-red-400"
      : "border-slate-300 bg-white focus:border-slate-900"
  }`;
}

export default function EmployerOnboardingPage() {
  const router = useRouter();

  const [, setCurrentUser] = useState<CurrentUserRead | null>(null);
  const [bootLoading, setBootLoading] = useState(true);

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

  useEffect(() => {
    async function bootstrap() {
      try {
        setBootLoading(true);
        setErrorText("");

        const me = await apiFetch<CurrentUserRead>("/auth/me");
        setCurrentUser(me);

        if (me.is_employer && me.employer_id) {
          router.replace(`/employer/${me.employer_id}`);
          return;
        }

        const presetName = [me.first_name, me.last_name]
          .filter(Boolean)
          .join(" ")
          .trim();

        setForm((prev) => ({
          ...prev,
          contact_name: prev.contact_name || presetName,
          telegram_username: prev.telegram_username || (me.telegram_username ?? ""),
        }));
      } catch (error) {
        console.error(error);
        if (error instanceof Error) {
          setErrorText(error.message);
        } else {
          setErrorText("Не удалось открыть анкету работодателя");
        }
      } finally {
        setBootLoading(false);
      }
    }

    void bootstrap();
  }, [router]);

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

      const employer = await apiPostJson<EmployerRead>("/me/employer", {
        company_name: form.company_name.trim(),
        contact_name: form.contact_name.trim(),
        phone: form.phone.trim(),
        telegram_username: normalizeTelegramUsername(form.telegram_username) || null,
        city: form.city.trim(),
        website: normalizeWebsite(form.website) || null,
      });

      setSuccessText("Профиль работодателя сохранен");

      setTimeout(() => {
        router.push(`/employer/${employer.id}/create-vacancies`);
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

  if (bootLoading) {
    return (
      <main className="px-4 py-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          Загрузка...
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6 px-4 py-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-violet-50 via-white to-white p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-slate-500">Работодатель</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                Заполнить данные компании
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Укажи базовую информацию о компании. Сайт можно добавить позже, он не обязателен.
              </p>
            </div>

            <Link
              href="/employer/start"
              className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Назад
            </Link>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Что дальше
            </div>

            <div className="mt-2 text-lg font-semibold text-slate-900">
              Сначала профиль работодателя, потом создание первой вакансии
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              После сохранения вы сразу перейдете к созданию вакансии.
            </p>
          </div>
        </div>
      </section>

      {errorText ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorText}
        </div>
      ) : null}

      {successText ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {successText}
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Компания *</label>
            <input
              value={form.company_name}
              onChange={(e) => updateField("company_name", e.target.value)}
              className={inputClass(Boolean(fieldErrors.company_name))}
              placeholder="Например, Coffee Stories"
            />
            {fieldErrors.company_name ? (
              <div className="mt-1 text-sm text-red-600">{fieldErrors.company_name}</div>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Контактное лицо *</label>
            <input
              value={form.contact_name}
              onChange={(e) => updateField("contact_name", e.target.value)}
              className={inputClass(Boolean(fieldErrors.contact_name))}
              placeholder="Например, Анна"
            />
            {fieldErrors.contact_name ? (
              <div className="mt-1 text-sm text-red-600">{fieldErrors.contact_name}</div>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Телефон *</label>
            <input
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              className={inputClass(Boolean(fieldErrors.phone))}
              placeholder="+79990000000"
            />
            {fieldErrors.phone ? (
              <div className="mt-1 text-sm text-red-600">{fieldErrors.phone}</div>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Telegram username</label>
            <input
              value={form.telegram_username}
              onChange={(e) => updateField("telegram_username", e.target.value)}
              className={inputClass()}
              placeholder="@anna_hr"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Город *</label>
            <input
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              className={inputClass(Boolean(fieldErrors.city))}
              placeholder="Санкт-Петербург"
            />
            {fieldErrors.city ? (
              <div className="mt-1 text-sm text-red-600">{fieldErrors.city}</div>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Сайт компании</label>
            <input
              value={form.website}
              onChange={(e) => updateField("website", e.target.value)}
              className={inputClass()}
              placeholder="Например, coffeestories.ru"
            />
            <div className="mt-1 text-xs text-slate-500">Необязательное поле</div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void saveEmployer()}
            disabled={saving}
            className="rounded-2xl border border-slate-900 bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Сохраняем..." : "Продолжить"}
          </button>

          <Link
            href="/employer/start"
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Отмена
          </Link>
        </div>

        <div className="mt-4 text-xs text-slate-500">* Обязательные поля</div>
      </section>
    </main>
  );
}