"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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

function inputClass(hasError?: boolean) {
  return `w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
    hasError
      ? "border-red-300 bg-red-50 focus:border-red-400"
      : "border-slate-300 bg-white focus:border-slate-900"
  }`;
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

  useEffect(() => {
    if (typeof window !== "undefined" && Number.isFinite(employerId)) {
      window.localStorage.setItem("hubsty_employer_id", String(employerId));
    }
  }, [employerId]);

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

      const response = await fetch("/api/vacancies/", {
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
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Некорректный идентификатор работодателя
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6 px-4 py-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-violet-50 via-white to-white p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-slate-500">Работодатель</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                Создать вакансию
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Заполни основные поля, чтобы вакансия появилась в кабинете работодателя
                и сразу вошла в рабочую воронку кандидатов.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/employer/${employerId}`}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Назад в кабинет
              </Link>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Что важно
            </div>

            <div className="mt-2 text-lg font-semibold text-slate-900">
              Сначала базовые данные, потом можно дополнять
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Для старта достаточно роли, точки и города. Остальные поля помогут
              кандидатам быстрее понять, подходит ли им вакансия.
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
            <label className="mb-1 block text-sm font-medium text-slate-700">Роль *</label>
            <input
              value={form.role}
              onChange={(e) => updateField("role", e.target.value)}
              placeholder="Например, бариста"
              className={inputClass(Boolean(fieldErrors.role))}
            />
            {fieldErrors.role ? (
              <div className="mt-1 text-sm text-red-600">{fieldErrors.role}</div>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Название точки *
            </label>
            <input
              value={form.venue_name}
              onChange={(e) => updateField("venue_name", e.target.value)}
              placeholder="Например, Coffee Stories"
              className={inputClass(Boolean(fieldErrors.venue_name))}
            />
            {fieldErrors.venue_name ? (
              <div className="mt-1 text-sm text-red-600">{fieldErrors.venue_name}</div>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Город *</label>
            <input
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              placeholder="Например, Санкт-Петербург"
              className={inputClass(Boolean(fieldErrors.city))}
            />
            {fieldErrors.city ? (
              <div className="mt-1 text-sm text-red-600">{fieldErrors.city}</div>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Район</label>
            <input
              value={form.district}
              onChange={(e) => updateField("district", e.target.value)}
              placeholder="Например, Центральный"
              className={inputClass()}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Доход / ставка
            </label>
            <input
              value={form.salary_text}
              onChange={(e) => updateField("salary_text", e.target.value)}
              placeholder="Например, 4500 за смену"
              className={inputClass()}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">График</label>
            <input
              value={form.schedule_text}
              onChange={(e) => updateField("schedule_text", e.target.value)}
              placeholder="Например, 2/2"
              className={inputClass()}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Когда нужен человек
            </label>
            <input
              value={form.needed_start}
              onChange={(e) => updateField("needed_start", e.target.value)}
              placeholder="Например, завтра"
              className={inputClass()}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Статус вакансии
            </label>
            <select
              value={form.status}
              onChange={(e) => updateField("status", e.target.value)}
              className={inputClass()}
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
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Сохраняем..." : "Создать вакансию"}
          </button>

          <Link
            href={`/employer/${employerId}`}
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Отмена
          </Link>
        </div>

        <div className="mt-4 text-xs text-slate-500">* Обязательные поля</div>
      </section>
    </main>
  );
}