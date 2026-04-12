"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type VacancyForm = {
  role: string;
  venue_name: string;
  city: string;
  district: string;
  salary_text: string;
  schedule_text: string;
  needed_start: string;
  status: string;
};

type FieldErrors = Partial<Record<keyof VacancyForm, string>>;

function validateForm(form: VacancyForm): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.role.trim()) {
    errors.role = "Укажи роль";
  }

  if (!form.venue_name.trim()) {
    errors.venue_name = "Укажи название точки";
  }

  if (!form.city.trim()) {
    errors.city = "Укажи город";
  }

  return errors;
}

export default function EmployerCreateVacancyPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const employerId = Number(params?.id);

  const [form, setForm] = useState<VacancyForm>({
    role: "",
    venue_name: "",
    city: "Санкт-Петербург",
    district: "",
    salary_text: "",
    schedule_text: "",
    needed_start: "",
    status: "new",
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");
  const [saving, setSaving] = useState(false);

  const isEmployerIdValid = useMemo(() => Number.isFinite(employerId), [employerId]);

  function updateField<K extends keyof VacancyForm>(key: K, value: VacancyForm[K]) {
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

  async function saveVacancy() {
    try {
      setErrorText("");
      setSuccessText("");

      const validationErrors = validateForm(form);
      setFieldErrors(validationErrors);

      if (Object.keys(validationErrors).length > 0) {
        setErrorText("Заполни обязательные поля, чтобы создать вакансию");
        return;
      }

      if (!isEmployerIdValid) {
        throw new Error("Некорректный идентификатор работодателя");
      }

      setSaving(true);

      const payload = {
        employer_id: employerId,
        role: form.role.trim(),
        venue_name: form.venue_name.trim(),
        city: form.city.trim(),
        district: form.district.trim() || null,
        salary_text: form.salary_text.trim() || null,
        schedule_text: form.schedule_text.trim() || null,
        needed_start: form.needed_start.trim() || null,
        status: form.status,
      };

      const response = await fetch("/api/vacancies", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      let data: any = null;

      if (text.trim()) {
        try {
          data = JSON.parse(text);
        } catch {
          data = null;
        }
      }

      if (!response.ok) {
        const backendMessage =
          data?.detail ||
          data?.message ||
          text ||
          `Не удалось создать вакансию (${response.status})`;
      
        console.error("create vacancy failed", {
          status: response.status,
          contentType: response.headers.get("content-type"),
          text,
          data,
        });
      
        throw new Error(backendMessage);
      }

      setSuccessText("Вакансия успешно создана");

      setTimeout(() => {
        router.push(`/employer/${employerId}`);
      }, 700);
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        setErrorText(error.message);
      } else {
        setErrorText("Не удалось создать вакансию");
      }
    } finally {
      setSaving(false);
    }
  }

  if (!isEmployerIdValid) {
    return (
      <main className="px-4 py-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Некорректный идентификатор работодателя
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6 px-4 py-6">
      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Работодатель</p>
            <h1 className="mt-2 text-2xl font-semibold">Создать вакансию</h1>
            <p className="mt-2 text-sm text-slate-600">
              Заполни основные поля, чтобы вакансия появилась в кабинете работодателя и в админке.
            </p>
          </div>

          <Link
            href={`/employer/${employerId}`}
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
            <label className="mb-1 block text-sm font-medium">Роль *</label>
            <input
              value={form.role}
              onChange={(e) => updateField("role", e.target.value)}
              placeholder="Например, бариста"
              className={`w-full rounded-xl border px-3 py-2 outline-none ${
                fieldErrors.role ? "border-red-300 bg-red-50" : "border-slate-300"
              }`}
            />
            {fieldErrors.role ? (
              <div className="mt-1 text-sm text-red-600">{fieldErrors.role}</div>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Название точки *</label>
            <input
              value={form.venue_name}
              onChange={(e) => updateField("venue_name", e.target.value)}
              placeholder="Например, Coffee Stories"
              className={`w-full rounded-xl border px-3 py-2 outline-none ${
                fieldErrors.venue_name ? "border-red-300 bg-red-50" : "border-slate-300"
              }`}
            />
            {fieldErrors.venue_name ? (
              <div className="mt-1 text-sm text-red-600">{fieldErrors.venue_name}</div>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Город *</label>
            <input
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              placeholder="Например, Санкт-Петербург"
              className={`w-full rounded-xl border px-3 py-2 outline-none ${
                fieldErrors.city ? "border-red-300 bg-red-50" : "border-slate-300"
              }`}
            />
            {fieldErrors.city ? (
              <div className="mt-1 text-sm text-red-600">{fieldErrors.city}</div>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Район</label>
            <input
              value={form.district}
              onChange={(e) => updateField("district", e.target.value)}
              placeholder="Например, Центральный"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Доход / ставка</label>
            <input
              value={form.salary_text}
              onChange={(e) => updateField("salary_text", e.target.value)}
              placeholder="Например, 4500 за смену"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">График</label>
            <input
              value={form.schedule_text}
              onChange={(e) => updateField("schedule_text", e.target.value)}
              placeholder="Например, 2/2"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Когда нужен человек</label>
            <input
              value={form.needed_start}
              onChange={(e) => updateField("needed_start", e.target.value)}
              placeholder="Например, завтра"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Статус вакансии</label>
            <select
              value={form.status}
              onChange={(e) => updateField("status", e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none"
            >
              <option value="new">Новая</option>
              <option value="in_progress">В работе</option>
              <option value="closed">Закрыта</option>
              <option value="archived">Архив</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void saveVacancy()}
            disabled={saving}
            className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Сохраняем..." : "Создать вакансию"}
          </button>

          <Link
            href={`/employer/${employerId}`}
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