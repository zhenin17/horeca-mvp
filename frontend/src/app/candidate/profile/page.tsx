"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, uploadCandidatePhoto } from "@/lib/api";
import { formatReadyToStart } from "@/lib/format";
import type { CandidateDashboard, CandidateProfileDetail } from "@/lib/types";
import { getCurrentCandidateId } from "@/lib/current-user";

type CandidateProfile = CandidateProfileDetail;

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
        src={photo.photo_url}
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [message, setMessage] = useState("");
  const [photoErrorText, setPhotoErrorText] = useState("");
  const [isTelegram, setIsTelegram] = useState(false);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");

  async function loadData() {
    try {
      setMessage("");

      const candidateId = getCurrentCandidateId();

      const [dashboardData, candidateData] = await Promise.all([
        apiFetch<CandidateDashboard>(`/candidates/${candidateId}/dashboard`),
        apiFetch<CandidateProfile>(`/candidates/${candidateId}`),
      ]);

      setDashboard(dashboardData);
      setCandidate(candidateData);
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
      const response = await fetch(`/api/candidates/${candidate.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: candidate.full_name,
          phone: candidate.phone,
          telegram_username: candidate.telegram_username || null,
          city: candidate.city,
          district: candidate.district || null,
          primary_role: candidate.primary_role,
          horeca_experience_months: candidate.horeca_experience_months,
          ready_to_start: value,
          expected_income: candidate.expected_income || null,
        }),
      });

      const data = (await response.json()) as { detail?: string };

      if (!response.ok) {
        throw new Error(data.detail || "Не удалось обновить готовность");
      }

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

  const profileBadge = useMemo(() => getProfileBadge(candidate), [candidate]);
  const nextAction = useMemo(
    () => getNextAction(candidate, dashboard),
    [candidate, dashboard]
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
            ) : getCandidateProfilePhoto(candidate)?.photo_url ? (
              <img
                src={getCandidateProfilePhoto(candidate)?.photo_url}
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