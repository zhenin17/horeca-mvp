"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  apiFetch,
  apiPostJson,
  clearAccessToken,
  setAccessToken,
} from "@/lib/api";
import {
  clearActiveRole,
  type CurrentUserRead,
  getActiveRole,
  getStaffRoleLabel,
  isStaffUser,
  setActiveRole,
  syncLegacyIdsFromCurrentUser,
} from "@/lib/current-user";
import {
  getTelegramBootstrapUser,
  getTelegramInitData,
  getTelegramTestUserId,
  isTelegramTestMode,
  prepareTelegramWebApp,
} from "@/lib/telegram";

type AccessTokenResponse = {
  access_token: string;
  current_user: CurrentUserRead;
};

type RoleChoice = "candidate" | "employer";

type CandidateForm = {
  full_name: string;
  phone: string;
  city: string;
  district: string;
  primary_role: string;
  horeca_experience_months: string;
  ready_to_start: string;
  expected_income: string;
};

type EmployerForm = {
  company_name: string;
  contact_name: string;
  phone: string;
  city: string;
  website: string;
};

const CONSENT_STORAGE_KEY = "hubsty_entry_consent_v1";

function getConsentAccepted(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(CONSENT_STORAGE_KEY) === "accepted";
}

function saveConsentAccepted() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CONSENT_STORAGE_KEY, "accepted");
}

function inputClass() {
  return "w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900";
}

function primaryRoleButtonClass(disabled?: boolean) {
  return `rounded-2xl px-4 py-3 text-sm font-semibold transition ${
    disabled
      ? "cursor-not-allowed bg-slate-300 text-white"
      : "bg-slate-900 text-white hover:opacity-90"
  }`;
}

function secondaryButtonClass(disabled?: boolean) {
  return `rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 ${
    disabled ? "pointer-events-none opacity-60" : ""
  }`;
}

function compactLinkButtonClass() {
  return "text-sm font-medium text-slate-600 underline underline-offset-4 hover:text-slate-900";
}

function currentRoleLabel(role: RoleChoice | null) {
  if (role === "candidate") {
    return "Кандидат";
  }

  if (role === "employer") {
    return "Работодатель";
  }

  return "Не выбрана";
}

function roleDescription(role: RoleChoice) {
  if (role === "candidate") {
    return "Вакансии, отклики, профиль и доступность.";
  }

  return "Кабинет работодателя, вакансии и кандидаты.";
}

function staffRoleHumanLabel(role: string | null) {
  switch (role) {
    case "admin":
      return "Администратор";
    case "moderator":
      return "Модератор";
    case "support":
      return "Поддержка";
    default:
      return "Staff";
  }
}

export default function TelegramEntryPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUserRead | null>(null);
  const [createRole, setCreateRole] = useState<RoleChoice | null>(null);
  const [savedRole, setSavedRole] = useState<RoleChoice | null>(null);

  const [consentAccepted, setConsentAccepted] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  const [candidateForm, setCandidateForm] = useState<CandidateForm>({
    full_name: "",
    phone: "",
    city: "Санкт-Петербург",
    district: "",
    primary_role: "",
    horeca_experience_months: "0",
    ready_to_start: "",
    expected_income: "",
  });

  const [employerForm, setEmployerForm] = useState<EmployerForm>({
    company_name: "",
    contact_name: "",
    phone: "",
    city: "Санкт-Петербург",
    website: "",
  });

  useEffect(() => {
    async function bootstrap() {
      try {
        setLoading(true);
        setErrorText("");

        prepareTelegramWebApp();
        setSavedRole(getActiveRole());
        setConsentAccepted(getConsentAccepted());

        let authData: AccessTokenResponse;

        const initData = getTelegramInitData();

        if (initData) {
          authData = await apiPostJson<AccessTokenResponse>("/auth/telegram", {
            init_data: initData,
          });
        } else if (isTelegramTestMode()) {
          authData = await apiPostJson<AccessTokenResponse>("/auth/dev", {
            telegram_user_id: getTelegramTestUserId(),
          });
        } else {
          const bootstrapUser = getTelegramBootstrapUser();

          if (!bootstrapUser) {
            throw new Error(
              "Telegram user не найден. Для теста открой /telegram?tg_test=1"
            );
          }

          throw new Error(
            "Нет Telegram initData. Для реального входа открой через Telegram Mini App, для локального теста используй /telegram?tg_test=1"
          );
        }

        setAccessToken(authData.access_token);
        syncLegacyIdsFromCurrentUser(authData.current_user);
        setCurrentUser(authData.current_user);

        const presetName = [
          authData.current_user.first_name,
          authData.current_user.last_name,
        ]
          .filter(Boolean)
          .join(" ")
          .trim();

        setCandidateForm((prev) => ({
          ...prev,
          full_name: prev.full_name || presetName,
        }));

        setEmployerForm((prev) => ({
          ...prev,
          contact_name: prev.contact_name || presetName,
        }));
      } catch (error) {
        console.error(error);
        clearAccessToken();

        if (error instanceof Error) {
          setErrorText(error.message);
        } else {
          setErrorText("Не удалось открыть Telegram-режим");
        }
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, []);

  function ensureConsentBeforeContinue() {
    if (consentAccepted) {
      return true;
    }

    if (consentChecked) {
      saveConsentAccepted();
      setConsentAccepted(true);
      return true;
    }

    setErrorText("Чтобы продолжить, подтвердите согласие с документами.");
    return false;
  }

  function saveRole(role: RoleChoice, authUser?: CurrentUserRead) {
    if (typeof window === "undefined") {
      return;
    }

    const user = authUser || currentUser;
    if (!user) {
      return;
    }

    if (!ensureConsentBeforeContinue()) {
      return;
    }

    setActiveRole(role);
    setSavedRole(role);
    syncLegacyIdsFromCurrentUser(user);

    if (role === "candidate" && user.candidate_id) {
      window.location.href = "/candidate/vacancies";
      return;
    }

    if (role === "employer" && user.employer_id) {
      window.location.href = `/employer/${user.employer_id}`;
      return;
    }
  }

  async function refreshCurrentUser() {
    const me = await apiFetch<CurrentUserRead>("/auth/me");
    setCurrentUser(me);
    syncLegacyIdsFromCurrentUser(me);
    return me;
  }

  async function createCandidateProfile() {
    if (!currentUser) {
      return;
    }

    if (!ensureConsentBeforeContinue()) {
      return;
    }

    if (!candidateForm.full_name.trim()) {
      setErrorText("Укажи имя кандидата");
      return;
    }

    if (!candidateForm.phone.trim()) {
      setErrorText("Укажи телефон");
      return;
    }

    if (!candidateForm.city.trim()) {
      setErrorText("Укажи город");
      return;
    }

    if (!candidateForm.primary_role.trim()) {
      setErrorText("Укажи роль");
      return;
    }

    if (!candidateForm.ready_to_start.trim()) {
      setErrorText("Укажи готовность к выходу");
      return;
    }

    try {
      setSaving(true);
      setErrorText("");

      await apiPostJson("/telegram/create-candidate-profile", {
        telegram_user_id: currentUser.telegram_user_id,
        full_name: candidateForm.full_name.trim(),
        phone: candidateForm.phone.trim(),
        telegram_username: currentUser.telegram_username || null,
        city: candidateForm.city.trim(),
        district: candidateForm.district.trim() || null,
        primary_role: candidateForm.primary_role.trim(),
        horeca_experience_months:
          Number(candidateForm.horeca_experience_months) || 0,
        ready_to_start: candidateForm.ready_to_start.trim(),
        expected_income: candidateForm.expected_income.trim() || null,
      });

      const refreshed = await refreshCurrentUser();
      setCreateRole(null);
      saveRole("candidate", refreshed);
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        setErrorText(error.message);
      } else {
        setErrorText("Не удалось создать профиль кандидата");
      }
    } finally {
      setSaving(false);
    }
  }

  async function createEmployerProfile() {
    if (!currentUser) {
      return;
    }

    if (!ensureConsentBeforeContinue()) {
      return;
    }

    if (!employerForm.company_name.trim()) {
      setErrorText("Укажи компанию");
      return;
    }

    if (!employerForm.contact_name.trim()) {
      setErrorText("Укажи контактное лицо");
      return;
    }

    if (!employerForm.phone.trim()) {
      setErrorText("Укажи телефон");
      return;
    }

    if (!employerForm.city.trim()) {
      setErrorText("Укажи город");
      return;
    }

    try {
      setSaving(true);
      setErrorText("");

      await apiPostJson("/telegram/create-employer-profile", {
        telegram_user_id: currentUser.telegram_user_id,
        company_name: employerForm.company_name.trim(),
        contact_name: employerForm.contact_name.trim(),
        phone: employerForm.phone.trim(),
        telegram_username: currentUser.telegram_username || null,
        city: employerForm.city.trim(),
        website: employerForm.website.trim() || null,
      });

      const refreshed = await refreshCurrentUser();
      setCreateRole(null);
      saveRole("employer", refreshed);
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        setErrorText(error.message);
      } else {
        setErrorText("Не удалось создать профиль работодателя");
      }
    } finally {
      setSaving(false);
    }
  }

  const userDisplayName = useMemo(() => {
    if (!currentUser) {
      return "Telegram пользователь";
    }

    const fullName = [currentUser.first_name, currentUser.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();

    return fullName || currentUser.telegram_username || "Telegram пользователь";
  }, [currentUser]);

  const isStaff = isStaffUser(currentUser);
  const staffRoleLabel = staffRoleHumanLabel(getStaffRoleLabel(currentUser));

  if (loading) {
    return <main className="px-4 py-6">Подключаем Telegram...</main>;
  }

  if (errorText && !currentUser) {
    return (
      <main className="space-y-6 px-4 py-6">
        <section className="rounded-3xl border border-red-200 bg-red-50 p-5">
          <h1 className="text-xl font-semibold text-red-800">
            Не удалось открыть Telegram-режим
          </h1>
          <div className="mt-3 text-sm text-red-700">{errorText}</div>
        </section>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="px-4 py-6">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Не удалось загрузить Telegram-пользователя.
        </div>
      </main>
    );
  }

  const hasCandidate = Boolean(currentUser.candidate_id);
  const hasEmployer = Boolean(currentUser.employer_id);
  const canContinue = consentAccepted || consentChecked;

  return (
    <main className="space-y-6 px-4 py-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-violet-50 via-white to-white p-5 md:p-6">
          <p className="text-sm font-medium text-slate-500">Hubsty mini app</p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            Продолжить в Hubsty
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Здесь вы можете войти как кандидат или работодатель. Если у вас есть
            обе роли, их можно переключать с этого экрана.
          </p>

          <div className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-sm text-slate-600 ring-1 ring-slate-200">
            {userDisplayName}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Текущее состояние
            </div>

            <div className="mt-2 text-sm text-slate-700">
              Активная роль:{" "}
              <span className="font-semibold">{currentRoleLabel(savedRole)}</span>
            </div>

            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
                <div className="font-medium text-slate-900">Кандидат</div>
                <div className="mt-1">
                  {hasCandidate ? "Профиль уже создан" : "Профиля пока нет"}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
                <div className="font-medium text-slate-900">Работодатель</div>
                <div className="mt-1">
                  {hasEmployer ? "Профиль уже создан" : "Профиля пока нет"}
                </div>
              </div>
            </div>

            {savedRole ? (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    clearActiveRole();
                    setSavedRole(null);
                    setCreateRole(null);
                    setErrorText("");
                  }}
                  className={compactLinkButtonClass()}
                >
                  Сбросить текущую роль
                </button>
              </div>
            ) : null}
          </div>

          {isStaff ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                Staff access
              </div>

              <div className="mt-2 text-lg font-semibold text-slate-900">
                Вам доступен staff-раздел
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-700">
                Роль: <span className="font-medium">{staffRoleLabel}</span>. Этот блок
                виден только staff-пользователям, которых backend определил через
                <span className="font-medium"> /auth/me</span>.
              </p>

              <div className="mt-4">
                <Link
                  href="/admin/vacancies"
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
                >
                  Открыть админку
                </Link>
              </div>
            </div>
          ) : null}

          {!consentAccepted ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-4">
              <div className="text-sm font-semibold text-slate-900">
                Подтвердите согласие перед продолжением
              </div>

              <label className="mt-3 flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => {
                    setConsentChecked(e.target.checked);
                    if (
                      errorText ===
                      "Чтобы продолжить, подтвердите согласие с документами."
                    ) {
                      setErrorText("");
                    }
                  }}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm leading-6 text-slate-600">
                  Мне исполнилось 18 лет. Я принимаю{" "}
                  <Link
                    href="/about?from=/telegram&doc=terms_of_use"
                    className="underline underline-offset-4"
                  >
                    Пользовательское соглашение
                  </Link>{" "}
                  и{" "}
                  <Link
                    href="/about?from=/telegram&doc=privacy_policy"
                    className="underline underline-offset-4"
                  >
                    Политику конфиденциальности
                  </Link>
                  , а также даю{" "}
                  <Link
                    href="/about?from=/telegram&doc=pd_agreement"
                    className="underline underline-offset-4"
                  >
                    согласие на обработку персональных данных
                  </Link>
                  . Понимаю, что Хабсти помогает кандидатам и работодателям
                  находить друг друга, но не является работодателем и не
                  гарантирует трудоустройство.
                </span>
              </label>

              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/about?from=/telegram&doc=about_service"
                  className={compactLinkButtonClass()}
                >
                  О приложении
                </Link>
                <Link
                  href="/about?from=/telegram"
                  className={compactLinkButtonClass()}
                >
                  Все документы
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="text-sm font-semibold text-emerald-900">
                Согласие уже подтверждено
              </div>
              <div className="mt-1 text-sm text-emerald-800">
                Документы можно открыть в любой момент.
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link
                  href="/about?from=/telegram&doc=about_service"
                  className={compactLinkButtonClass()}
                >
                  О приложении
                </Link>
                <Link
                  href="/about?from=/telegram"
                  className={compactLinkButtonClass()}
                >
                  Все документы
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {errorText ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorText}
        </div>
      ) : null}

      {!createRole ? (
        <>
          {(hasCandidate || hasEmployer) && (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Войти в существующий профиль
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Выберите роль, в которой хотите открыть приложение сейчас.
                </p>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {hasCandidate ? (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-lg font-semibold text-slate-900">
                      Кандидат
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-600">
                      {roleDescription("candidate")}
                    </div>

                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => saveRole("candidate")}
                        disabled={!canContinue}
                        className={primaryRoleButtonClass(!canContinue)}
                      >
                        Войти как кандидат
                      </button>
                    </div>
                  </div>
                ) : null}

                {hasEmployer ? (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-lg font-semibold text-slate-900">
                      Работодатель
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-600">
                      {roleDescription("employer")}
                    </div>

                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => saveRole("employer")}
                        disabled={!canContinue}
                        className={primaryRoleButtonClass(!canContinue)}
                      >
                        Войти как работодатель
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          )}

          {(!hasCandidate || !hasEmployer) && (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Добавить роль
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Можно пользоваться приложением сразу в двух ролях.
                </p>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {!hasCandidate ? (
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="text-lg font-semibold text-slate-900">
                      Кандидат
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-600">
                      Смотреть вакансии, откликаться и следить за статусами.
                    </div>

                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          if (!ensureConsentBeforeContinue()) {
                            return;
                          }
                          setErrorText("");
                          setCreateRole("candidate");
                        }}
                        className={secondaryButtonClass()}
                      >
                        Создать роль кандидата
                      </button>
                    </div>
                  </div>
                ) : null}

                {!hasEmployer ? (
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="text-lg font-semibold text-slate-900">
                      Работодатель
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-600">
                      Смотреть кандидатов, работать со статусами и вакансиями.
                    </div>

                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          if (!ensureConsentBeforeContinue()) {
                            return;
                          }
                          setErrorText("");
                          setCreateRole("employer");
                        }}
                        className={secondaryButtonClass()}
                      >
                        Создать роль работодателя
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          )}
        </>
      ) : null}

      {createRole === "candidate" ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-slate-900">
              Создать профиль кандидата
            </h2>
            <button
              type="button"
              onClick={() => setCreateRole(null)}
              className="rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Назад
            </button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Имя и фамилия *
              </label>
              <input
                value={candidateForm.full_name}
                onChange={(e) =>
                  setCandidateForm((prev) => ({ ...prev, full_name: e.target.value }))
                }
                className={inputClass()}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Телефон *
              </label>
              <input
                value={candidateForm.phone}
                onChange={(e) =>
                  setCandidateForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                className={inputClass()}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Город *
              </label>
              <input
                value={candidateForm.city}
                onChange={(e) =>
                  setCandidateForm((prev) => ({ ...prev, city: e.target.value }))
                }
                className={inputClass()}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Район
              </label>
              <input
                value={candidateForm.district}
                onChange={(e) =>
                  setCandidateForm((prev) => ({ ...prev, district: e.target.value }))
                }
                className={inputClass()}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Основная роль *
              </label>
              <input
                value={candidateForm.primary_role}
                onChange={(e) =>
                  setCandidateForm((prev) => ({ ...prev, primary_role: e.target.value }))
                }
                placeholder="Например, Бариста"
                className={inputClass()}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Опыт в HoReCa, месяцев
              </label>
              <input
                type="number"
                min="0"
                value={candidateForm.horeca_experience_months}
                onChange={(e) =>
                  setCandidateForm((prev) => ({
                    ...prev,
                    horeca_experience_months: e.target.value,
                  }))
                }
                className={inputClass()}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Когда готовы выйти *
              </label>
              <input
                value={candidateForm.ready_to_start}
                onChange={(e) =>
                  setCandidateForm((prev) => ({ ...prev, ready_to_start: e.target.value }))
                }
                placeholder="Например, завтра"
                className={inputClass()}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Ожидаемый доход
              </label>
              <input
                value={candidateForm.expected_income}
                onChange={(e) =>
                  setCandidateForm((prev) => ({
                    ...prev,
                    expected_income: e.target.value,
                  }))
                }
                className={inputClass()}
              />
            </div>
          </div>

          <div className="mt-5">
            <button
              type="button"
              onClick={() => void createCandidateProfile()}
              disabled={saving}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Создаем..." : "Создать профиль кандидата"}
            </button>
          </div>
        </section>
      ) : null}

      {createRole === "employer" ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-slate-900">
              Создать профиль работодателя
            </h2>
            <button
              type="button"
              onClick={() => setCreateRole(null)}
              className="rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Назад
            </button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Компания *
              </label>
              <input
                value={employerForm.company_name}
                onChange={(e) =>
                  setEmployerForm((prev) => ({ ...prev, company_name: e.target.value }))
                }
                className={inputClass()}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Контактное лицо *
              </label>
              <input
                value={employerForm.contact_name}
                onChange={(e) =>
                  setEmployerForm((prev) => ({ ...prev, contact_name: e.target.value }))
                }
                className={inputClass()}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Телефон *
              </label>
              <input
                value={employerForm.phone}
                onChange={(e) =>
                  setEmployerForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                className={inputClass()}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Город *
              </label>
              <input
                value={employerForm.city}
                onChange={(e) =>
                  setEmployerForm((prev) => ({ ...prev, city: e.target.value }))
                }
                className={inputClass()}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Сайт компании
              </label>
              <input
                value={employerForm.website}
                onChange={(e) =>
                  setEmployerForm((prev) => ({ ...prev, website: e.target.value }))
                }
                placeholder="Необязательно"
                className={inputClass()}
              />
            </div>
          </div>

          <div className="mt-5">
            <button
              type="button"
              onClick={() => void createEmployerProfile()}
              disabled={saving}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Создаем..." : "Создать профиль работодателя"}
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}