"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  apiFetch,
  apiPatchJson,
  apiPostJson,
  normalizeMediaUrl,
  uploadCandidatePhoto,
} from "@/lib/api";
import { formatReadyToStart } from "@/lib/format";
import type { CandidateDashboard, CandidateProfileDetail } from "@/lib/types";
import type { CurrentUserRead } from "@/lib/current-user";

type CandidateProfile = CandidateProfileDetail;

type AvailabilitySlotType = "morning" | "day" | "evening" | "night" | "full_day";

type CandidateAvailabilityItem = {
  id: number;
  candidate_id?: number;
  available_date: string;
  slot_type: AvailabilitySlotType;
  start_time?: string | null;
  end_time?: string | null;
  is_active?: boolean;
};

type CandidateReliability = {
  candidate_id: number;
  score: number;
  worked_count: number;
  no_show_count: number;
  cancelled_count: number;
};

type AvailabilityFormState = {
  available_date: string;
  slot_type: AvailabilitySlotType;
  start_time: string;
  end_time: string;
};

function readyButtonClass(isActive: boolean) {
  return isActive
    ? "rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
    : "rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";
}

function photoButtonClass(disabled?: boolean) {
  return `inline-flex cursor-pointer items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 ${
    disabled ? "pointer-events-none opacity-60" : ""
  }`;
}

function getProfileBadge(candidate: CandidateProfile | null) {
  if (!candidate) {
    return {
      text: "Профиль не загружен",
      className: "border border-slate-200 bg-slate-50 text-slate-600",
    };
  }

  if (!candidate.is_active) {
    return {
      text: "Профиль неактивен",
      className: "border border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    text: "Профиль активен",
    className: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    };
}

function getNextAction(
  candidate: CandidateProfile | null,
  dashboard: CandidateDashboard | null
) {
  if (!candidate || !dashboard) {
    return {
      title: "Проверьте профиль",
      text: "Сначала убедитесь, что анкета загружена и данные отображаются корректно.",
      href: "/candidate/onboarding",
      label: "Открыть анкету",
    };
  }

  if (!candidate.is_active) {
    return {
      title: "Нужно активировать профиль",
      text: "Пока профиль неактивен, лучше сначала проверить анкету и привести ее в порядок.",
      href: "/candidate/onboarding",
      label: "Проверить анкету",
    };
  }

  if (dashboard.active_matches > 0) {
    return {
      title: "У вас есть активные отклики",
      text: "Сейчас важнее всего быстро смотреть изменения по статусам и не пропускать движение.",
      href: "/candidate/matches",
      label: "Открыть отклики",
    };
  }

  return {
    title: "Можно искать новые вакансии",
    text: "Профиль уже настроен. Следующий логичный шаг — посмотреть подходящие вакансии и откликнуться.",
    href: "/candidate/vacancies",
    label: "Смотреть вакансии",
  };
}

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

function getCandidateProfilePhoto(candidate: CandidateProfile | null) {
  if (!candidate?.photos || candidate.photos.length === 0) {
    return null;
  }

  return candidate.photos[0] || null;
}

function getReliabilityLabel(score?: number | null) {
  if (typeof score !== "number") {
    return {
      text: "Без оценки",
      className: "border border-slate-200 bg-slate-50 text-slate-600",
    };
  }

  if (score >= 80) {
    return {
      text: "Высокая надежность",
      className: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (score >= 60) {
    return {
      text: "Хорошая надежность",
      className: "border border-sky-200 bg-sky-50 text-sky-700",
    };
  }

  if (score >= 40) {
    return {
      text: "История только формируется",
      className: "border border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    text: "Есть отмены или невыходы",
    className: "border border-rose-200 bg-rose-50 text-rose-700",
  };
}

function formatAvailabilityDate(value?: string | null) {
  if (!value?.trim()) {
    return "Дата не указана";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatAvailabilityTimeRange(
  startTime?: string | null,
  endTime?: string | null
) {
  if (startTime && endTime) {
    return `${startTime}–${endTime}`;
  }

  if (startTime) {
    return `с ${startTime}`;
  }

  if (endTime) {
    return `до ${endTime}`;
  }

  return "Время не указано";
}

function formatSlotTypeLabel(value?: AvailabilitySlotType | string | null) {
  if (!value?.trim()) {
    return "Слот не указан";
  }

  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case "full_day":
      return "Полный день";
    case "morning":
      return "Утро";
    case "day":
      return "День";
    case "evening":
      return "Вечер";
    case "night":
      return "Ночь";
    default:
      return value;
  }
}

function CandidateProfilePhoto({
  candidate,
  isTelegram,
  previewUrl,
}: {
  candidate: CandidateProfile;
  isTelegram: boolean;
  previewUrl?: string;
}) {
  const photo = getCandidateProfilePhoto(candidate);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [previewUrl, photo?.photo_url]);

  if (previewUrl) {
    return (
      <div
        className={`shrink-0 overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 ${
          isTelegram ? "h-24 w-24" : "h-28 w-28"
        }`}
      >
        <img
          src={previewUrl}
          alt={candidate.full_name}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  if (!photo || imageFailed) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-100 via-slate-50 to-white ${
          isTelegram ? "h-24 w-24" : "h-28 w-28"
        }`}
      >
        <div className="text-center">
          <div className={`${isTelegram ? "text-2xl" : "text-3xl"}`}>👤</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`shrink-0 overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 ${
        isTelegram ? "h-24 w-24" : "h-28 w-28"
      }`}
    >
      <img
        src={normalizeMediaUrl(photo.photo_url) || ""}
        alt={candidate.full_name}
        className="h-full w-full object-cover"
        onError={() => setImageFailed(true)}
      />
    </div>
  );
}

export default function CandidateProfilePage() {
  const [dashboard, setDashboard] = useState<CandidateDashboard | null>(null);
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [availability, setAvailability] = useState<CandidateAvailabilityItem[]>([]);
  const [reliability, setReliability] = useState<CandidateReliability | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [deletingAvailabilityId, setDeletingAvailabilityId] = useState<number | null>(null);

  const [message, setMessage] = useState("");
  const [photoErrorText, setPhotoErrorText] = useState("");
  const [availabilityErrorText, setAvailabilityErrorText] = useState("");
  const [isTelegram, setIsTelegram] = useState(false);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");

  const [availabilityForm, setAvailabilityForm] = useState<AvailabilityFormState>({
    available_date: "",
    slot_type: "full_day",
    start_time: "",
    end_time: "",
  });

  async function loadData() {
    try {
      setMessage("");
      setAvailabilityErrorText("");

      const me = await apiFetch<CurrentUserRead>("/auth/me");
      if (!me.is_candidate || !me.candidate_id) {
        throw new Error("Профиль кандидата не найден");
      }

      const [dashboardData, candidateData, availabilityData, reliabilityData] =
        await Promise.all([
          apiFetch<CandidateDashboard>("/me/candidate/dashboard"),
          apiFetch<CandidateProfile>("/me/candidate"),
          apiFetch<CandidateAvailabilityItem[]>("/me/candidate/availability"),
          apiFetch<CandidateReliability>("/me/candidate/reliability"),
        ]);

      setDashboard(dashboardData);
      setCandidate(candidateData);
      setAvailability(
        [...availabilityData].sort((a, b) =>
          a.available_date.localeCompare(b.available_date)
        )
      );
      setReliability(reliabilityData || null);
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Не удалось загрузить профиль");
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadAvailability() {
    try {
      setAvailabilityLoading(true);
      setAvailabilityErrorText("");

      const data = await apiFetch<CandidateAvailabilityItem[]>("/me/candidate/availability");
      setAvailability(
        [...data].sort((a, b) => a.available_date.localeCompare(b.available_date))
      );
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        setAvailabilityErrorText(error.message);
      } else {
        setAvailabilityErrorText("Не удалось загрузить доступность");
      }
    } finally {
      setAvailabilityLoading(false);
    }
  }

  async function loadReliability() {
    try {
      const data = await apiFetch<CandidateReliability>("/me/candidate/reliability");
      setReliability(data || null);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    setIsTelegram(detectTelegramWebApp());
    void loadData();
  }, []);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  async function changeReadyToStart(value: string) {
    if (!candidate) return;

    setSaving(true);
    setMessage("");

    try {
      await apiPatchJson("/candidates/" + candidate.id, {
        full_name: candidate.full_name,
        phone: candidate.phone,
        telegram_username: candidate.telegram_username || null,
        city: candidate.city,
        district: candidate.district || null,
        primary_role: candidate.primary_role,
        horeca_experience_months: candidate.horeca_experience_months,
        ready_to_start: value,
        expected_income: candidate.expected_income || null,
      });

      setMessage("Готовность обновлена");
      await loadData();
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Не удалось обновить готовность");
      }
    } finally {
      setSaving(false);
    }
  }

  function handlePhotoChange(file: File | null) {
    setPhotoErrorText("");
    setMessage("");

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

  async function saveCandidatePhoto() {
    if (!candidate || !selectedPhotoFile) {
      return;
    }

    try {
      setUploadingPhoto(true);
      setPhotoErrorText("");
      setMessage("");

      await uploadCandidatePhoto(candidate.id, selectedPhotoFile);

      setMessage("Фото профиля обновлено");
      setSelectedPhotoFile(null);

      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
        setPhotoPreviewUrl("");
      }

      await loadData();
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        setPhotoErrorText(error.message);
      } else {
        setPhotoErrorText("Не удалось загрузить фото");
      }
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function addAvailability() {
    if (!candidate) {
      return;
    }

    if (!availabilityForm.available_date.trim()) {
      setAvailabilityErrorText("Укажите дату");
      return;
    }

    if (!availabilityForm.slot_type.trim()) {
      setAvailabilityErrorText("Укажите тип слота");
      return;
    }

    try {
      setAvailabilitySaving(true);
      setAvailabilityErrorText("");
      setMessage("");

      await apiPostJson("/me/candidate/availability", {
        available_date: availabilityForm.available_date,
        slot_type: availabilityForm.slot_type,
        start_time: availabilityForm.start_time.trim() || null,
        end_time: availabilityForm.end_time.trim() || null,
      });

      setAvailabilityForm({
        available_date: "",
        slot_type: "full_day",
        start_time: "",
        end_time: "",
      });

      setMessage("Доступность добавлена");
      await Promise.all([loadAvailability(), loadReliability()]);
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        setAvailabilityErrorText(error.message);
      } else {
        setAvailabilityErrorText("Не удалось добавить доступность");
      }
    } finally {
      setAvailabilitySaving(false);
    }
  }

  async function deleteAvailability(availabilityId: number) {
    if (!candidate) {
      return;
    }
  
    try {
      setDeletingAvailabilityId(availabilityId);
      setAvailabilityErrorText("");
      setMessage("");
  
      const headers: HeadersInit = {};
      const token =
        typeof window !== "undefined"
          ? window.localStorage.getItem("hubsty_access_token")
          : null;
  
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
  
      const response = await fetch(
        `/api/candidates/${candidate.id}/availability/${availabilityId}`,
        {
          method: "DELETE",
          headers,
        }
      );

      if (!response.ok) {
        const text = await response.text();
        const data = text ? JSON.parse(text) : null;
        throw new Error(data?.detail || "Не удалось удалить запись");
      }

      setMessage("Запись доступности удалена");
      await Promise.all([loadAvailability(), loadReliability()]);
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        setAvailabilityErrorText(error.message);
      } else {
        setAvailabilityErrorText("Не удалось удалить запись");
      }
    } finally {
      setDeletingAvailabilityId(null);
    }
  }

  const profileBadge = useMemo(() => getProfileBadge(candidate), [candidate]);
  const nextAction = useMemo(
    () => getNextAction(candidate, dashboard),
    [candidate, dashboard]
  );
  const currentPhotoUrl = useMemo(
    () => normalizeMediaUrl(getCandidateProfilePhoto(candidate)?.photo_url),
    [candidate]
  );
  const reliabilityMeta = useMemo(
    () => getReliabilityLabel(reliability?.score),
    [reliability?.score]
  );

  if (loading) {
    return (
      <main className="px-4 py-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          Загрузка...
        </div>
      </main>
    );
  }

  if (!dashboard || !candidate) {
    return (
      <main className="px-4 py-6">
        {message ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {message}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Не удалось загрузить профиль.
          </div>
        )}
      </main>
    );
  }

  return (
    <main className={`px-4 ${isTelegram ? "space-y-5 py-5" : "space-y-6 py-6"}`}>
      {message ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {message}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-violet-50 via-white to-white p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <CandidateProfilePhoto
                candidate={candidate}
                isTelegram={isTelegram}
                previewUrl={photoPreviewUrl}
              />

              <div className="max-w-2xl min-w-0">
                <p
                  className={`font-medium ${
                    isTelegram
                      ? "text-xs uppercase tracking-[0.16em] text-violet-600"
                      : "text-sm text-slate-500"
                  }`}
                >
                  Профиль кандидата
                </p>

                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                  {isTelegram ? "Ваш профиль" : dashboard.full_name}
                </h1>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Здесь можно быстро проверить свой статус, обновить готовность к
                  выходу и перейти туда, где сейчас важнее всего действие.
                </p>

                <div className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-sm text-slate-600 ring-1 ring-slate-200">
                  {dashboard.primary_role}
                </div>
              </div>
            </div>

            <div
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${profileBadge.className}`}
            >
              {profileBadge.text}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Сейчас главное
            </div>

            <div className="mt-2 text-lg font-semibold text-slate-900 md:text-xl">
              {nextAction.title}
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {nextAction.text}
            </p>

            <div className={`mt-5 flex ${isTelegram ? "flex-col" : "flex-wrap"} gap-3`}>
              <Link
                href={nextAction.href}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-center text-sm font-semibold text-white transition hover:opacity-90"
              >
                {nextAction.label}
              </Link>

              <Link
                href="/candidate/onboarding"
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Редактировать анкету
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
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
                alt={candidate.full_name}
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
              <h2 className="text-xl font-semibold text-slate-900">Фото профиля</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Одно фото помогает работодателю быстрее понять ваш профиль и делает
                анкету живее.
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <label className={photoButtonClass(uploadingPhoto)}>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    disabled={uploadingPhoto}
                    onChange={(e) => handlePhotoChange(e.target.files?.[0] || null)}
                  />
                  {selectedPhotoFile ? "Изменить фото" : "Выбрать фото"}
                </label>

                {selectedPhotoFile ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void saveCandidatePhoto()}
                      disabled={uploadingPhoto}
                      className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {uploadingPhoto ? "Сохраняем..." : "Сохранить фото"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePhotoChange(null)}
                      disabled={uploadingPhoto}
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      Убрать
                    </button>
                  </>
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
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Коротко о профиле</h2>
          <p className="mt-1 text-sm text-slate-500">
            Только самое важное, без лишнего шума.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {!isTelegram ? (
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Кандидат</div>
              <div className="mt-1 text-base font-medium text-slate-900">
                {dashboard.full_name}
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Основная роль</div>
            <div className="mt-1 text-base font-medium text-slate-900">
              {dashboard.primary_role}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Локация</div>
            <div className="mt-1 text-base font-medium text-slate-900">
              {dashboard.city}
              {dashboard.district ? `, ${dashboard.district}` : ""}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Готовность выйти</div>
            <div className="mt-1 text-base font-medium text-slate-900">
              {formatReadyToStart(candidate.ready_to_start)}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Желаемый доход</div>
            <div className="mt-1 text-base font-medium text-slate-900">
              {candidate.expected_income?.trim()
                ? candidate.expected_income
                : "Не указан"}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Когда я могу выходить</h2>
            <p className="mt-1 text-sm text-slate-500">
              Добавьте ближайшие даты и удобные интервалы, чтобы работодателю было проще
              понять, когда вы готовы выходить на работу.
            </p>
          </div>

          {availabilityLoading ? (
            <div className="text-sm text-slate-500">Обновляем...</div>
          ) : null}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            {availability.length > 0 ? (
              availability.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {formatAvailabilityDate(item.available_date)}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-white px-3 py-1 text-slate-700 ring-1 ring-slate-200">
                          {formatSlotTypeLabel(item.slot_type)}
                        </span>

                        <span className="rounded-full bg-white px-3 py-1 text-slate-700 ring-1 ring-slate-200">
                          {formatAvailabilityTimeRange(item.start_time, item.end_time)}
                        </span>

                        {item.is_active === false ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600 ring-1 ring-slate-200">
                            Неактивно
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void deleteAvailability(item.id)}
                      disabled={deletingAvailabilityId === item.id}
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingAvailabilityId === item.id ? "Удаляем..." : "Удалить"}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                Пока нет добавленных записей. Укажите хотя бы несколько ближайших окон,
                когда вы готовы выходить.
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-lg font-semibold text-slate-900">Добавить доступность</h3>
            <p className="mt-2 text-sm text-slate-600">
              Выберите дату, тип слота и, если нужно, укажите время.
            </p>

            <div className="mt-4 grid gap-3">
              <div>
                <label className="text-xs text-slate-500">Дата</label>
                <input
                  type="date"
                  value={availabilityForm.available_date}
                  onChange={(e) =>
                    setAvailabilityForm((prev) => ({
                      ...prev,
                      available_date: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500">Тип слота</label>
                <select
                  value={availabilityForm.slot_type}
                  onChange={(e) =>
                    setAvailabilityForm((prev) => ({
                      ...prev,
                      slot_type: e.target.value as AvailabilitySlotType,
                    }))
                  }
                  className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 focus:border-slate-400"
                >
                  <option value="full_day">Полный день</option>
                  <option value="morning">Утро</option>
                  <option value="day">День</option>
                  <option value="evening">Вечер</option>
                  <option value="night">Ночь</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-slate-500">Время начала</label>
                  <input
                    type="time"
                    value={availabilityForm.start_time}
                    onChange={(e) =>
                      setAvailabilityForm((prev) => ({
                        ...prev,
                        start_time: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500">Время окончания</label>
                  <input
                    type="time"
                    value={availabilityForm.end_time}
                    onChange={(e) =>
                      setAvailabilityForm((prev) => ({
                        ...prev,
                        end_time: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 focus:border-slate-400"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => void addAvailability()}
                disabled={availabilitySaving}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-center text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {availabilitySaving ? "Добавляем..." : "Добавить"}
              </button>
            </div>

            {availabilityErrorText ? (
              <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {availabilityErrorText}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Надежность профиля</h2>
            <p className="mt-1 text-sm text-slate-500">
              Этот показатель помогает работодателю понять вашу стабильность. Чем больше
              успешных выходов без отмен и no-show, тем выше доверие к профилю.
            </p>
          </div>

          <div
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${reliabilityMeta.className}`}
          >
            {reliabilityMeta.text}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Score</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {typeof reliability?.score === "number" ? reliability.score : "—"}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Успешные выходы</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {reliability?.worked_count ?? 0}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs text-slate-500">No-show</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {reliability?.no_show_count ?? 0}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Отмены</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {reliability?.cancelled_count ?? 0}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          Это не штраф и не блокировка, а ориентир для работодателя при выборе кандидата.
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Статусы и результат</h2>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Всего откликов</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {dashboard.total_matches}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Активные</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {dashboard.active_matches}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Нанят</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {dashboard.hired_matches}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Отклонен</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {dashboard.rejected_matches}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">
          Быстро обновить готовность
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Это полезно, если хотите сразу показать работодателю, насколько быстро
          готовы выйти.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void changeReadyToStart("today")}
            disabled={saving}
            className={readyButtonClass(candidate.ready_to_start === "today")}
          >
            Сегодня
          </button>

          <button
            type="button"
            onClick={() => void changeReadyToStart("tomorrow")}
            disabled={saving}
            className={readyButtonClass(candidate.ready_to_start === "tomorrow")}
          >
            Завтра
          </button>

          <button
            type="button"
            onClick={() => void changeReadyToStart("3days")}
            disabled={saving}
            className={readyButtonClass(candidate.ready_to_start === "3days")}
          >
            В течение 3 дней
          </button>

          <button
            type="button"
            onClick={() => void changeReadyToStart("week")}
            disabled={saving}
            className={readyButtonClass(candidate.ready_to_start === "week")}
          >
            В течение недели
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Куда перейти дальше</h2>

        <div className={`mt-4 flex ${isTelegram ? "flex-col" : "flex-wrap"} gap-3`}>
          <Link
            href="/candidate/vacancies"
            className="rounded-2xl bg-slate-900 px-5 py-3 text-center text-sm font-semibold text-white transition hover:opacity-90"
          >
            Смотреть вакансии
          </Link>

          <Link
            href="/candidate/matches"
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Мои отклики
          </Link>

          <Link
            href="/about?from=/candidate/profile"
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            О приложении
          </Link>

          <Link
            href="/candidate/start"
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            На стартовую
          </Link>

          {isTelegram ? (
            <Link
              href="/telegram"
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Сменить роль
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}