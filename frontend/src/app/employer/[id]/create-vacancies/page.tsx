"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  CITY_OPTIONS,
  ROLE_OPTIONS,
  SCHEDULE_OPTIONS,
  READY_TO_START_OPTIONS,
  getDistrictOptions,
} from "@/lib/location-options";

type ListingType = "job" | "part_time" | "shift";

type VacancyForm = {
  listing_type: ListingType;
  role: string;
  venue_name: string;
  city: string;
  district: string;
  salary_text: string;
  schedule_text: string;
  needed_start: string;
  shift_date: string;
  shift_start_time: string;
  shift_end_time: string;
  urgent_flag: boolean;
  slots_count: string;
  status: string;
};

type FieldErrors = Partial<Record<keyof VacancyForm, string>>;

type CreatedVacancyResponse = {
  id: number;
};

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

  if (form.listing_type === "shift") {
    if (!form.shift_date.trim()) {
      errors.shift_date = "Укажи дату смены";
    }

    if (!form.shift_start_time.trim()) {
      errors.shift_start_time = "Укажи время начала";
    }

    if (!form.shift_end_time.trim()) {
      errors.shift_end_time = "Укажи время окончания";
    }

    if (
      form.shift_start_time.trim() &&
      form.shift_end_time.trim() &&
      form.shift_start_time >= form.shift_end_time
    ) {
      errors.shift_end_time = "Время окончания должно быть позже начала";
    }
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

function listingTypeCardClass(active: boolean) {
  return `rounded-3xl border p-4 text-left transition ${
    active
      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
      : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
  }`;
}

function listingTypeTitle(type: ListingType) {
  switch (type) {
    case "job":
      return "Работа";
    case "part_time":
      return "Подработка";
    case "shift":
      return "Смена";
    default:
      return "Работа";
  }
}

function listingTypeDescription(type: ListingType) {
  switch (type) {
    case "job":
      return "Постоянная или основная вакансия с обычной логикой найма.";
    case "part_time":
      return "Подходит для частичной занятости и гибкого выхода.";
    case "shift":
      return "Разовая или конкретная смена с датой и временем.";
    default:
      return "";
  }
}

function photoButtonClass(disabled?: boolean) {
  return `inline-flex cursor-pointer items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 ${
    disabled ? "pointer-events-none opacity-60" : ""
  }`;
}

export default function EmployerCreateVacancyPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const employerId = Number(params?.id);

  const [form, setForm] = useState<VacancyForm>({
    listing_type: "job",
    role: "",
    venue_name: "",
    city: "Санкт-Петербург",
    district: "",
    salary_text: "",
    schedule_text: "",
    needed_start: "tomorrow",
    shift_date: "",
    shift_start_time: "",
    shift_end_time: "",
    urgent_flag: false,
    slots_count: "1",
    status: "new",
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");
  const [saving, setSaving] = useState(false);

  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [photoErrorText, setPhotoErrorText] = useState("");

  const isEmployerIdValid = useMemo(() => Number.isFinite(employerId), [employerId]);
  const districtOptions = useMemo(() => getDistrictOptions(form.city), [form.city]);
  const isShift = form.listing_type === "shift";

  useEffect(() => {
    if (typeof window !== "undefined" && Number.isFinite(employerId)) {
      window.localStorage.setItem("hubsty_employer_id", String(employerId));
    }
  }, [employerId]);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  function updateField<K extends keyof VacancyForm>(key: K, value: VacancyForm[K]) {
    setForm((prev) => {
      const next = {
        ...prev,
        [key]: value,
      };

      if (key === "city") {
        next.district = "";
      }

      if (key === "listing_type") {
        if (value !== "shift") {
          next.urgent_flag = false;
          next.shift_date = "";
          next.shift_start_time = "";
          next.shift_end_time = "";
          next.slots_count = "1";
        }
      }

      return next;
    });

    setFieldErrors((prev) => ({
      ...prev,
      [key]: "",
    }));

    setErrorText("");
    setSuccessText("");
  }

  function handlePhotoChange(file: File | null) {
    setPhotoErrorText("");
    setErrorText("");
    setSuccessText("");

    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
      setPhotoPreviewUrl("");
    }

    if (!file) {
      setSelectedPhotoFile(null);
      return;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setSelectedPhotoFile(null);
      setPhotoErrorText("Поддерживаются JPG, PNG или WEBP");
      return;
    }

    const maxSizeMb = 10;
    if (file.size > maxSizeMb * 1024 * 1024) {
      setSelectedPhotoFile(null);
      setPhotoErrorText("Фото должно быть меньше 10 МБ");
      return;
    }

    setSelectedPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
  }

  async function uploadVacancyPhoto(vacancyId: number, file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`/api/vacancies/${vacancyId}/photo`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      let detail = `Фото не удалось загрузить (${response.status})`;

      if (text.trim()) {
        try {
          const data = JSON.parse(text) as { detail?: string; message?: string };
          detail = data.detail || data.message || text;
        } catch {
          detail = text;
        }
      }

      throw new Error(detail);
    }
  }

  async function saveVacancy() {
    try {
      setErrorText("");
      setSuccessText("");
      setPhotoErrorText("");

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

      const readyToStartMap: Record<string, string> = {
        today: "сегодня",
        tomorrow: "завтра",
        "3days": "в течение 3 дней",
        week: "в течение недели",
        next_week: "со следующей недели",
      };

      const payload = {
        employer_id: employerId,
        listing_type: form.listing_type,
        role: form.role.trim(),
        venue_name: form.venue_name.trim(),
        city: form.city.trim(),
        district: form.district.trim() || null,
        salary_text: form.salary_text.trim() || null,
        schedule_text:
          form.listing_type === "shift"
            ? null
            : form.schedule_text.trim() || null,
        needed_start: form.needed_start
          ? readyToStartMap[form.needed_start] || form.needed_start.trim()
          : null,
        shift_date: form.listing_type === "shift" ? form.shift_date || null : null,
        shift_start_time:
          form.listing_type === "shift" ? form.shift_start_time || null : null,
        shift_end_time:
          form.listing_type === "shift" ? form.shift_end_time || null : null,
        urgent_flag: form.listing_type === "shift" ? form.urgent_flag : false,
        slots_count:
          form.listing_type === "shift"
            ? Math.max(1, Number(form.slots_count) || 1)
            : null,
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
      let data: CreatedVacancyResponse | { detail?: string; message?: string } | null = null;

      if (text.trim()) {
        try {
          data = JSON.parse(text);
        } catch {
          data = null;
        }
      }

      if (!response.ok) {
        const backendMessage =
          (data as { detail?: string; message?: string } | null)?.detail ||
          (data as { detail?: string; message?: string } | null)?.message ||
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

      const createdVacancyId =
        typeof (data as CreatedVacancyResponse | null)?.id === "number"
          ? (data as CreatedVacancyResponse).id
          : null;

      if (selectedPhotoFile && createdVacancyId) {
        try {
          await uploadVacancyPhoto(createdVacancyId, selectedPhotoFile);
          setSuccessText("Вакансия и фото успешно сохранены");
        } catch (photoError) {
          console.error(photoError);
          if (photoError instanceof Error) {
            setErrorText(
              `Вакансия создана, но фото не загрузилось: ${photoError.message}`
            );
          } else {
            setErrorText("Вакансия создана, но фото не загрузилось");
          }
          setSuccessText("Вакансия создана");
        }
      } else {
        setSuccessText(
          selectedPhotoFile && !createdVacancyId
            ? "Вакансия создана. Фото пока не удалось привязать автоматически."
            : "Вакансия успешно создана"
        );
      }

      setTimeout(() => {
        router.push(`/employer/${employerId}`);
      }, 900);
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
                Сначала выбери тип объявления, потом заполни основные поля.
                Для смены отдельно указываются дата, время и срочность.
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
              Тип объявления влияет на то, как вакансия будет видна кандидату
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Если это смена, кандидат должен сразу видеть, что это именно смена,
              с датой, временем и срочностью.
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
        <div>
          <div className="text-sm font-medium text-slate-700">Фото вакансии</div>
          <div className="mt-1 text-sm text-slate-500">
            Одно фото. Оно будет показано кандидатам в карточке и на странице вакансии.
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[240px_1fr]">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
            {photoPreviewUrl ? (
              <img
                src={photoPreviewUrl}
                alt="Превью фото вакансии"
                className="h-56 w-full object-cover"
              />
            ) : (
              <div className="flex h-56 w-full flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-white px-4 text-center">
                <div className="text-3xl">🏢</div>
                <div className="mt-3 text-sm font-medium text-slate-700">
                  Фото пока не выбрано
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Добавьте фото заведения или вакансии
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <div className="text-sm font-medium text-slate-900">
                Что лучше загрузить
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-600">
                Лучше всего работает живое фото заведения, бара, кухни, зала или
                рабочей зоны. Так кандидат быстрее понимает формат места.
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <label className={photoButtonClass(saving)}>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    disabled={saving}
                    onChange={(e) => handlePhotoChange(e.target.files?.[0] || null)}
                  />
                  {selectedPhotoFile ? "Изменить фото" : "Добавить фото"}
                </label>

                {selectedPhotoFile ? (
                  <button
                    type="button"
                    onClick={() => handlePhotoChange(null)}
                    disabled={saving}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Убрать
                  </button>
                ) : null}
              </div>

              {selectedPhotoFile ? (
                <div className="mt-4 text-sm text-slate-600">
                  Выбрано: <span className="font-medium text-slate-900">{selectedPhotoFile.name}</span>
                </div>
              ) : null}

              {photoErrorText ? (
                <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {photoErrorText}
                </div>
              ) : null}
            </div>

            <div className="mt-4 text-xs text-slate-500">
              Поддерживаются JPG, PNG, WEBP. До 10 МБ.
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-sm font-medium text-slate-700">Тип объявления *</div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {(["job", "part_time", "shift"] as ListingType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => updateField("listing_type", type)}
              className={listingTypeCardClass(form.listing_type === type)}
            >
              <div className="text-base font-semibold">{listingTypeTitle(type)}</div>
              <div
                className={`mt-2 text-sm leading-6 ${
                  form.listing_type === type ? "text-white/85" : "text-slate-600"
                }`}
              >
                {listingTypeDescription(type)}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Роль *</label>
            <select
              value={form.role}
              onChange={(e) => updateField("role", e.target.value)}
              className={inputClass(Boolean(fieldErrors.role))}
            >
              <option value="">Выберите роль</option>
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
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
            <select
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              className={inputClass(Boolean(fieldErrors.city))}
            >
              <option value="">Выберите город</option>
              {CITY_OPTIONS.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
            {fieldErrors.city ? (
              <div className="mt-1 text-sm text-red-600">{fieldErrors.city}</div>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Район</label>
            <select
              value={form.district}
              onChange={(e) => updateField("district", e.target.value)}
              className={inputClass()}
              disabled={!form.city}
            >
              <option value="">
                {form.city ? "Выберите район" : "Сначала выберите город"}
              </option>
              {districtOptions.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Доход / ставка
            </label>
            <input
              value={form.salary_text}
              onChange={(e) => updateField("salary_text", e.target.value)}
              placeholder={isShift ? "Например, 5000 за смену" : "Например, от 90 000 ₽"}
              className={inputClass()}
            />
          </div>

          {!isShift ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">График</label>
              <select
                value={form.schedule_text}
                onChange={(e) => updateField("schedule_text", e.target.value)}
                className={inputClass()}
              >
                <option value="">Выберите график</option>
                {SCHEDULE_OPTIONS.map((schedule) => (
                  <option key={schedule} value={schedule}>
                    {schedule}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Когда нужен человек
            </label>
            <select
              value={form.needed_start}
              onChange={(e) => updateField("needed_start", e.target.value)}
              className={inputClass()}
            >
              <option value="">Выберите срок</option>
              {READY_TO_START_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {isShift ? (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Дата смены *
                </label>
                <input
                  type="date"
                  value={form.shift_date}
                  onChange={(e) => updateField("shift_date", e.target.value)}
                  className={inputClass(Boolean(fieldErrors.shift_date))}
                />
                {fieldErrors.shift_date ? (
                  <div className="mt-1 text-sm text-red-600">{fieldErrors.shift_date}</div>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Сколько человек нужно
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.slots_count}
                  onChange={(e) => updateField("slots_count", e.target.value)}
                  className={inputClass()}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Время начала *
                </label>
                <input
                  type="time"
                  value={form.shift_start_time}
                  onChange={(e) => updateField("shift_start_time", e.target.value)}
                  className={inputClass(Boolean(fieldErrors.shift_start_time))}
                />
                {fieldErrors.shift_start_time ? (
                  <div className="mt-1 text-sm text-red-600">{fieldErrors.shift_start_time}</div>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Время окончания *
                </label>
                <input
                  type="time"
                  value={form.shift_end_time}
                  onChange={(e) => updateField("shift_end_time", e.target.value)}
                  className={inputClass(Boolean(fieldErrors.shift_end_time))}
                />
                {fieldErrors.shift_end_time ? (
                  <div className="mt-1 text-sm text-red-600">{fieldErrors.shift_end_time}</div>
                ) : null}
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={form.urgent_flag}
                    onChange={(e) => updateField("urgent_flag", e.target.checked)}
                    className="h-5 w-5 rounded border-slate-300"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Срочная смена
                  </span>
                </label>
              </div>
            </>
          ) : null}

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