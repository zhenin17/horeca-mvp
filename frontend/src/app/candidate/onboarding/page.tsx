"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getCurrentCandidateId } from "@/lib/current-user";
import { uploadCandidatePhoto } from "@/lib/api";
import {
  CITY_OPTIONS,
  ROLE_OPTIONS,
  READY_TO_START_OPTIONS,
  getDistrictOptions,
} from "@/lib/location-options";

type CandidatePhoto = {
  id: number;
  candidate_id: number;
  photo_url: string;
};

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

type LoadCandidateResponse = {
  full_name: string;
  phone: string;
  telegram_username?: string | null;
  city: string;
  district?: string | null;
  primary_role: string;
  horeca_experience_months: number;
  ready_to_start: string;
  expected_income?: string | null;
  photos?: CandidatePhoto[];
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

function detectTelegramWebApp() {
  if (typeof window === "undefined") {
    return false;
  }

  const w = window as typeof window & {
    Telegram?: {
      WebApp?: {
        initData?: string;
      };
    };
  };

  return Boolean(w.Telegram?.WebApp?.initData?.trim());
}

function formatReadyToStartPreview(value: string) {
  const found = READY_TO_START_OPTIONS.find((item) => item.value === value);
  if (found) {
    return found.label;
  }
  return value || "-";
}

function inputClass() {
  return "w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-slate-900";
}

function photoButtonClass(disabled?: boolean) {
  return `inline-flex cursor-pointer items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 ${
    disabled ? "pointer-events-none opacity-60" : ""
  }`;
}

function getCandidateProfilePhoto(candidate: LoadCandidateResponse | null) {
  if (!candidate?.photos || candidate.photos.length === 0) {
    return null;
  }

  return candidate.photos[0] || null;
}

export default function CandidateOnboardingPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CandidateForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success" | "">("");
  const [isTelegram, setIsTelegram] = useState(false);
  const [loadedCandidate, setLoadedCandidate] =
    useState<LoadCandidateResponse | null>(null);

  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [photoErrorText, setPhotoErrorText] = useState("");

  const districtOptions = useMemo(() => getDistrictOptions(form.city), [form.city]);

  useEffect(() => {
    setIsTelegram(detectTelegramWebApp());

    async function loadCandidate() {
      try {
        setMessage("");
        setMessageType("");

        const candidateId = getCurrentCandidateId();

        const response = await fetch(`/api/candidates/${candidateId}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Не удалось загрузить анкету кандидата");
        }

        const data = (await response.json()) as LoadCandidateResponse;
        setLoadedCandidate(data);

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
        setMessageType("error");
      } finally {
        setLoading(false);
      }
    }

    void loadCandidate();
  }, []);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  function updateField<K extends keyof CandidateForm>(
    key: K,
    value: CandidateForm[K]
  ) {
    setForm((prev) => {
      const next = {
        ...prev,
        [key]: value,
      };

      if (key === "city") {
        next.district = "";
      }

      return next;
    });
  }

  function handlePhotoChange(file: File | null) {
    setPhotoErrorText("");

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

  const currentPhotoUrl = useMemo(() => {
    return getCandidateProfilePhoto(loadedCandidate)?.photo_url || "";
  }, [loadedCandidate]);

  const stepTitle = useMemo(() => {
    const titles: Record<number, string> = {
      1: "Основные данные",
      2: "Роль и опыт",
      3: "Готовность и доход",
      4: "Проверка анкеты",
    };

    return titles[step] || "Анкета";
  }, [step]);

  const stepDescription = useMemo(() => {
    const descriptions: Record<number, string> = {
      1: "Начнем с базовой информации, чтобы профиль выглядел понятно и аккуратно.",
      2: "Теперь укажем, кем вы работаете и какой у вас опыт.",
      3: "Осталось понять, когда вы готовы выйти и на какой доход рассчитываете.",
      4: "Проверьте анкету перед сохранением. После этого можно идти смотреть вакансии.",
    };

    return descriptions[step] || "";
  }, [step]);

  const progressPercent = useMemo(() => {
    return (step / 4) * 100;
  }, [step]);

  function setError(text: string) {
    setMessage(text);
    setMessageType("error");
  }

  function clearMessage() {
    setMessage("");
    setMessageType("");
  }

  function validateStep(currentStep: number): boolean {
    if (currentStep === 1) {
      if (!form.full_name.trim()) {
        setError("Укажите имя и фамилию");
        return false;
      }
      if (!form.phone.trim()) {
        setError("Укажите телефон");
        return false;
      }
      if (!form.city.trim()) {
        setError("Укажите город");
        return false;
      }
    }

    if (currentStep === 2) {
      if (!form.primary_role.trim()) {
        setError("Укажите основную роль");
        return false;
      }

      const months = Number(form.horeca_experience_months);
      if (!Number.isFinite(months) || months < 0) {
        setError("Опыт должен быть числом от 0 и больше");
        return false;
      }
    }

    if (currentStep === 3) {
      if (!form.ready_to_start.trim()) {
        setError("Укажите, когда готовы выйти");
        return false;
      }
    }

    clearMessage();
    return true;
  }

  function nextStep() {
    if (!validateStep(step)) {
      return;
    }

    setStep((prev) => Math.min(prev + 1, 4));
  }

  function prevStep() {
    clearMessage();
    setStep((prev) => Math.max(prev - 1, 1));
  }

  async function saveCandidate() {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return;
    }

    setSaving(true);
    clearMessage();
    setPhotoErrorText("");

    try {
      const candidateId = getCurrentCandidateId();

      const response = await fetch(`/api/candidates/${candidateId}`, {
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

      if (selectedPhotoFile) {
        try {
          await uploadCandidatePhoto(candidateId, selectedPhotoFile);
        } catch (photoError) {
          console.error(photoError);

          if (photoError instanceof Error) {
            setMessage(`Анкета сохранена, но фото не загрузилось: ${photoError.message}`);
          } else {
            setMessage("Анкета сохранена, но фото не загрузилось");
          }

          setMessageType("error");
          setSaving(false);
          return;
        }
      }

      setMessage("Анкета сохранена. Переходим к вакансиям.");
      setMessageType("success");
      window.location.href = "/candidate/vacancies";
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Не удалось сохранить анкету");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="px-4 py-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          Загрузка анкеты...
        </div>
      </main>
    );
  }

  return (
    <main className={`px-4 ${isTelegram ? "space-y-5 py-5" : "space-y-6 py-6"}`}>
      <div>
        <Link href="/candidate/start" className="text-sm text-slate-600 underline">
          ← Назад
        </Link>
      </div>

      {message ? (
        <div
          className={`rounded-2xl border p-4 text-sm ${
            messageType === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-violet-50 via-white to-white p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <p
                className={`font-medium ${
                  isTelegram
                    ? "text-xs uppercase tracking-[0.16em] text-violet-600"
                    : "text-sm text-slate-500"
                }`}
              >
                Анкета кандидата
              </p>

              <h1 className="mt-1 text-2xl font-semibold text-slate-900">
                {stepTitle}
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {stepDescription}
              </p>
            </div>

            <div className="inline-flex rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-700 ring-1 ring-slate-200">
              Шаг {step} из 4
            </div>
          </div>

          <div className="mt-5">
            <div className="h-2 w-full rounded-full bg-white/80 ring-1 ring-slate-200">
              <div
                className="h-2 rounded-full bg-slate-900 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        {step === 1 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                  {photoPreviewUrl ? (
                    <img
                      src={photoPreviewUrl}
                      alt="Превью фото профиля"
                      className="h-56 w-full object-cover"
                    />
                  ) : currentPhotoUrl ? (
                    <img
                      src={currentPhotoUrl}
                      alt="Текущее фото профиля"
                      className="h-56 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-56 w-full flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-white px-4 text-center">
                      <div className="text-3xl">👤</div>
                      <div className="mt-3 text-sm font-medium text-slate-700">
                        Фото профиля пока не добавлено
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Добавьте одно фото для работодателей
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      Фото профиля
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-600">
                      Фото не обязательно для сохранения анкеты, но оно делает
                      профиль живее и понятнее для работодателя.
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <label className={photoButtonClass(saving)}>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          className="hidden"
                          disabled={saving}
                          onChange={(e) =>
                            handlePhotoChange(e.target.files?.[0] || null)
                          }
                        />
                        {selectedPhotoFile || currentPhotoUrl
                          ? "Изменить фото"
                          : "Выбрать фото"}
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
                        Выбрано:{" "}
                        <span className="font-medium text-slate-900">
                          {selectedPhotoFile.name}
                        </span>
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
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Имя и фамилия
              </label>
              <input
                value={form.full_name}
                onChange={(e) => updateField("full_name", e.target.value)}
                className={inputClass()}
                placeholder="Например, Иван Иванов"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Телефон
              </label>
              <input
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className={inputClass()}
                placeholder="+79990000001"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Telegram
              </label>
              <input
                value={form.telegram_username}
                onChange={(e) => updateField("telegram_username", e.target.value)}
                className={inputClass()}
                placeholder="ivan_test"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Город
              </label>
              <select
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
                className={inputClass()}
              >
                <option value="">Выберите город</option>
                {CITY_OPTIONS.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Район
              </label>
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
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Основная роль
              </label>
              <select
                value={form.primary_role}
                onChange={(e) => updateField("primary_role", e.target.value)}
                className={inputClass()}
              >
                <option value="">Выберите роль</option>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Опыт в HoReCa, месяцев
              </label>
              <input
                value={form.horeca_experience_months}
                onChange={(e) =>
                  updateField("horeca_experience_months", e.target.value)
                }
                className={inputClass()}
                placeholder="12"
                inputMode="numeric"
              />
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Когда готовы выйти
              </label>
              <select
                value={form.ready_to_start}
                onChange={(e) => updateField("ready_to_start", e.target.value)}
                className={inputClass()}
              >
                {READY_TO_START_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Желаемый доход
              </label>
              <input
                value={form.expected_income}
                onChange={(e) => updateField("expected_income", e.target.value)}
                className={inputClass()}
                placeholder="4500 за смену"
              />
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2 rounded-2xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Фото профиля</div>
              <div className="mt-3">
                {photoPreviewUrl ? (
                  <img
                    src={photoPreviewUrl}
                    alt="Превью фото профиля"
                    className="h-40 w-40 rounded-2xl object-cover"
                  />
                ) : currentPhotoUrl ? (
                  <img
                    src={currentPhotoUrl}
                    alt="Текущее фото профиля"
                    className="h-40 w-40 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-40 w-40 items-center justify-center rounded-2xl bg-white text-3xl ring-1 ring-slate-200">
                    👤
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Имя и фамилия</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {form.full_name || "-"}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Телефон</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {form.phone || "-"}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Telegram</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {form.telegram_username || "-"}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Город и район</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {form.city || "-"}
                {form.district ? `, ${form.district}` : ""}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Роль</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {form.primary_role || "-"}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Опыт</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {form.horeca_experience_months || "0"} мес.
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Готовность выйти</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {formatReadyToStartPreview(form.ready_to_start)}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Желаемый доход</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {form.expected_income || "-"}
              </div>
            </div>
          </div>
        ) : null}

        <div className={`mt-6 flex ${isTelegram ? "flex-col" : "flex-wrap"} gap-3`}>
          {step > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Назад
            </button>
          ) : null}

          {step < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Дальше
            </button>
          ) : (
            <button
              type="button"
              onClick={saveCandidate}
              disabled={saving}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Сохраняем..." : "Сохранить анкету"}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}