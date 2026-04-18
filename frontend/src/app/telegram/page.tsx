"use client";

import { useEffect, useMemo, useState } from "react";
import { getTelegramBootstrapUser, prepareTelegramWebApp } from "@/lib/telegram";

type TelegramAuthResponse = {
  telegram_user_id: number;
  telegram_username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  candidate_id: number | null;
  employer_id: number | null;
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

function getSavedRole(): RoleChoice | null {
  if (typeof window === "undefined") {
    return null;
  }

  const savedRole = window.localStorage.getItem("hubsty_active_role");
  return savedRole === "candidate" || savedRole === "employer" ? savedRole : null;
}

function resetSavedRole() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem("hubsty_active_role");
}

function inputClass() {
  return "w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900";
}

export default function TelegramEntryPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [telegramUser, setTelegramUser] = useState<TelegramAuthResponse | null>(null);
  const [createRole, setCreateRole] = useState<RoleChoice | null>(null);
  const [savedRole, setSavedRole] = useState<RoleChoice | null>(null);

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
        setSavedRole(getSavedRole());

        const user = getTelegramBootstrapUser();

        if (!user) {
          throw new Error(
            "Telegram user не найден. Для теста открой /telegram?tg_test=1"
          );
        }

        const response = await fetch("/api/telegram/auth", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(user),
        });

        const text = await response.text();
        const data = text ? (JSON.parse(text) as TelegramAuthResponse) : null;

        if (!response.ok || !data) {
          throw new Error("Не удалось выполнить Telegram-вход");
        }

        setTelegramUser(data);

        const presetName = [data.first_name, data.last_name]
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

  function saveRole(role: RoleChoice, authData?: TelegramAuthResponse) {
    if (typeof window === "undefined") {
      return;
    }

    const data = authData || telegramUser;
    if (!data) {
      return;
    }

    window.localStorage.setItem("hubsty_active_role", role);
    setSavedRole(role);

    if (role === "candidate" && data.candidate_id) {
      window.localStorage.setItem("hubsty_candidate_id", String(data.candidate_id));
      window.location.href = "/candidate/vacancies";
      return;
    }

    if (role === "employer" && data.employer_id) {
      window.localStorage.setItem("hubsty_employer_id", String(data.employer_id));
      window.location.href = `/employer/${data.employer_id}`;
      return;
    }
  }

  async function refreshTelegramUser() {
    if (!telegramUser) {
      return null;
    }

    const response = await fetch(`/api/telegram/me/${telegramUser.telegram_user_id}`, {
      cache: "no-store",
    });

    const text = await response.text();
    const data = text ? (JSON.parse(text) as TelegramAuthResponse) : null;

    if (!response.ok || !data) {
      throw new Error("Не удалось обновить Telegram-профиль");
    }

    setTelegramUser(data);
    return data;
  }

  async function createCandidateProfile() {
    if (!telegramUser) {
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

      const response = await fetch("/api/telegram/create-candidate-profile", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          telegram_user_id: telegramUser.telegram_user_id,
          full_name: candidateForm.full_name.trim(),
          phone: candidateForm.phone.trim(),
          telegram_username: telegramUser.telegram_username || null,
          city: candidateForm.city.trim(),
          district: candidateForm.district.trim() || null,
          primary_role: candidateForm.primary_role.trim(),
          horeca_experience_months: Number(candidateForm.horeca_experience_months) || 0,
          ready_to_start: candidateForm.ready_to_start.trim(),
          expected_income: candidateForm.expected_income.trim() || null,
        }),
      });

      const text = await response.text();
      const data = text ? JSON.parse(text) : null;

      if (!response.ok) {
        throw new Error(data?.detail || "Не удалось создать профиль кандидата");
      }

      const refreshed = await refreshTelegramUser();
      setCreateRole(null);
      if (refreshed) {
        saveRole("candidate", refreshed);
      }
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
    if (!telegramUser) {
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

      const response = await fetch("/api/telegram/create-employer-profile", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          telegram_user_id: telegramUser.telegram_user_id,
          company_name: employerForm.company_name.trim(),
          contact_name: employerForm.contact_name.trim(),
          phone: employerForm.phone.trim(),
          telegram_username: telegramUser.telegram_username || null,
          city: employerForm.city.trim(),
          website: employerForm.website.trim() || null,
        }),
      });

      const text = await response.text();
      const data = text ? JSON.parse(text) : null;

      if (!response.ok) {
        throw new Error(data?.detail || "Не удалось создать профиль работодателя");
      }

      const refreshed = await refreshTelegramUser();
      setCreateRole(null);
      if (refreshed) {
        saveRole("employer", refreshed);
      }
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
    if (!telegramUser) {
      return "Telegram пользователь";
    }

    const fullName = [telegramUser.first_name, telegramUser.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();

    return fullName || telegramUser.telegram_username || "Telegram пользователь";
  }, [telegramUser]);

  if (loading) {
    return <main className="px-4 py-6">Подключаем Telegram...</main>;
  }

  if (errorText && !telegramUser) {
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

  if (!telegramUser) {
    return (
      <main className="px-4 py-6">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Не удалось загрузить Telegram-пользователя.
        </div>
      </main>
    );
  }

  const hasCandidate = Boolean(telegramUser.candidate_id);
  const hasEmployer = Boolean(telegramUser.employer_id);

  return (
    <main className="space-y-6 px-4 py-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-violet-50 via-white to-white p-5 md:p-6">
          <p className="text-sm font-medium text-slate-500">Telegram вход</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            Выберите роль
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Здесь можно продолжить в уже созданной роли или добавить вторую.
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
              <span className="font-semibold">
                {savedRole === "candidate"
                  ? "Кандидат"
                  : savedRole === "employer"
                    ? "Работодатель"
                    : "Не выбрана"}
              </span>
            </div>

            <div className="mt-2 text-sm text-slate-600">
              Профиль кандидата: {hasCandidate ? "есть" : "нет"} · Профиль работодателя:{" "}
              {hasEmployer ? "есть" : "нет"}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  resetSavedRole();
                  setSavedRole(null);
                  setCreateRole(null);
                  setErrorText("");
                }}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Сбросить текущую роль
              </button>
            </div>
          </div>
        </div>
      </section>

      {errorText ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorText}
        </div>
      ) : null}

      {!createRole ? (
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-lg font-semibold text-slate-900">Кандидат</div>
            <div className="mt-2 text-sm leading-6 text-slate-600">
              Смотреть вакансии, откликаться и следить за статусами.
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {hasCandidate ? (
                <button
                  type="button"
                  onClick={() => saveRole("candidate")}
                  className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  Продолжить как кандидат
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setErrorText("");
                    setCreateRole("candidate");
                  }}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Создать роль кандидата
                </button>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-lg font-semibold text-slate-900">Работодатель</div>
            <div className="mt-2 text-sm leading-6 text-slate-600">
              Смотреть кандидатов, работать со статусами и вакансиями.
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {hasEmployer ? (
                <button
                  type="button"
                  onClick={() => saveRole("employer")}
                  className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  Продолжить как работодатель
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setErrorText("");
                    setCreateRole("employer");
                  }}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Создать роль работодателя
                </button>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {createRole === "candidate" ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-slate-900">Создать профиль кандидата</h2>
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
              <label className="mb-1 block text-sm font-medium text-slate-700">Телефон *</label>
              <input
                value={candidateForm.phone}
                onChange={(e) =>
                  setCandidateForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                className={inputClass()}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Город *</label>
              <input
                value={candidateForm.city}
                onChange={(e) =>
                  setCandidateForm((prev) => ({ ...prev, city: e.target.value }))
                }
                className={inputClass()}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Район</label>
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
              <label className="mb-1 block text-sm font-medium text-slate-700">Компания *</label>
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
              <label className="mb-1 block text-sm font-medium text-slate-700">Телефон *</label>
              <input
                value={employerForm.phone}
                onChange={(e) =>
                  setEmployerForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                className={inputClass()}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Город *</label>
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