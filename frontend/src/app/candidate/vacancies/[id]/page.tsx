"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type CandidateItem = {
  id: number;
  full_name: string;
  phone: string;
  telegram_username?: string | null;
  city: string;
  district?: string | null;
  primary_role: string;
  horeca_experience_months: number;
  ready_to_start: string;
  expected_income?: string | null;
  is_active: boolean;
};

type VacancyItem = {
  id: number;
  employer_id: number;
  role: string;
  venue_name: string;
  city: string;
  district?: string | null;
  salary_text?: string | null;
  schedule_text?: string | null;
  needed_start?: string | null;
  status: string;
};

type MatchItem = {
  id: number;
  candidate_id: number;
  employer_id: number;
  vacancy_id: number;
  match_score?: number | null;
  status: string;
  comment?: string | null;
};

type ApplyResult = {
  status: string;
  match_id: number;
  candidate_id: number;
  vacancy_id: number;
  match_score: number;
  match_status: string;
};

async function readJsonSafe<T>(response: Response): Promise<T | null> {
  const text = await response.text();

  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function getCurrentCandidateId() {
  if (typeof window === "undefined") {
    return 1;
  }

  const possibleKeys = [
    "hubsty_candidate_id",
    "candidateId",
    "selectedCandidateId",
  ];

  for (const key of possibleKeys) {
    const value = window.localStorage.getItem(key);
    const id = Number(value);
    if (Number.isFinite(id) && id > 0) {
      return id;
    }
  }

  return 1;
}

function formatExperience(months: number) {
  if (months <= 0) {
    return "Без опыта";
  }

  const years = Math.floor(months / 12);
  const restMonths = months % 12;

  if (years > 0 && restMonths > 0) {
    return `${years} г. ${restMonths} мес.`;
  }

  if (years > 0) {
    return `${years} г.`;
  }

  return `${restMonths} мес.`;
}

function formatIncomeText(value?: string | null) {
  return value?.trim() ? value : "Не указано";
}

function formatVacancyStatus(status: string) {
  switch (status) {
    case "new":
      return "Новая";
    case "in_progress":
      return "В работе";
    case "shortlist_ready":
      return "Шорт-лист готов";
    case "partially_closed":
      return "Частично закрыта";
    case "closed":
      return "Закрыта";
    case "archived":
      return "Архив";
    default:
      return status || "—";
  }
}

function formatMatchStatus(status: string) {
  switch (status) {
    case "shortlist":
      return "Отклик принят";
    case "sent":
      return "Отправлено работодателю";
    case "viewed":
      return "Просмотрено работодателем";
    case "invited":
      return "Приглашение получено";
    case "interviewed":
      return "Идет общение";
    case "offered":
      return "Есть предложение";
    case "hired":
      return "Вас приняли";
    case "rejected":
      return "Не подошло";
    case "no_show":
      return "Процесс остановлен";
    default:
      return status || "—";
  }
}

function buildFitReasons(candidate: CandidateItem, vacancy: VacancyItem) {
  const reasons: string[] = [];

  if (
    candidate.primary_role.trim().toLowerCase() ===
    vacancy.role.trim().toLowerCase()
  ) {
    reasons.push("Роль полностью совпадает с вашим профилем");
  } else if (
    candidate.primary_role.trim().toLowerCase().includes(vacancy.role.trim().toLowerCase()) ||
    vacancy.role.trim().toLowerCase().includes(candidate.primary_role.trim().toLowerCase())
  ) {
    reasons.push("Роль близка к вашему текущему профилю");
  }

  if (candidate.city.trim().toLowerCase() === vacancy.city.trim().toLowerCase()) {
    reasons.push("Вакансия находится в вашем городе");
  }

  if (
    candidate.district &&
    vacancy.district &&
    candidate.district.trim().toLowerCase() === vacancy.district.trim().toLowerCase()
  ) {
    reasons.push("Район совпадает с вашим предпочтением");
  }

  if (candidate.horeca_experience_months > 0) {
    reasons.push(
      `У вас уже есть опыт в HoReCa: ${formatExperience(candidate.horeca_experience_months)}`
    );
  }

  if (candidate.ready_to_start?.trim()) {
    reasons.push(`Вы готовы выйти: ${candidate.ready_to_start}`);
  }

  if (candidate.expected_income && vacancy.salary_text) {
    reasons.push("По доходу вакансия выглядит близкой к вашим ожиданиям");
  }

  if (reasons.length === 0) {
    reasons.push("Вакансия подходит по базовым параметрам вашего профиля");
  }

  return reasons.slice(0, 4);
}

export default function CandidateVacancyDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const vacancyId = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");

  const [candidate, setCandidate] = useState<CandidateItem | null>(null);
  const [vacancy, setVacancy] = useState<VacancyItem | null>(null);
  const [existingMatch, setExistingMatch] = useState<MatchItem | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setErrorText("");
      setSuccessText("");

      if (!Number.isFinite(vacancyId)) {
        throw new Error("Некорректный идентификатор вакансии");
      }

      const candidateId = getCurrentCandidateId();

      const [candidateResponse, vacancyResponse, matchesResponse] = await Promise.all([
        fetch(`/api/candidates/${candidateId}`, { cache: "no-store" }),
        fetch(`/api/vacancies/${vacancyId}`, { cache: "no-store" }),
        fetch(`/api/matches?candidate_id=${candidateId}`, { cache: "no-store" }),
      ]);

      if (!candidateResponse.ok) {
        throw new Error("Не удалось загрузить данные кандидата");
      }

      if (!vacancyResponse.ok) {
        throw new Error("Не удалось загрузить вакансию");
      }

      if (!matchesResponse.ok) {
        throw new Error("Не удалось загрузить отклики кандидата");
      }

      const candidateData = await readJsonSafe<CandidateItem>(candidateResponse);
      const vacancyData = await readJsonSafe<VacancyItem>(vacancyResponse);
      const matchesData = await readJsonSafe<MatchItem[]>(matchesResponse);

      if (!candidateData) {
        throw new Error("Кандидат не найден");
      }

      if (!vacancyData) {
        throw new Error("Вакансия не найдена");
      }

      const currentMatch =
        (matchesData || []).find((item) => item.vacancy_id === vacancyId) || null;

      setCandidate(candidateData);
      setVacancy(vacancyData);
      setExistingMatch(currentMatch);
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        setErrorText(error.message);
      } else {
        setErrorText("Не удалось загрузить страницу вакансии");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [vacancyId]);

  const fitReasons = useMemo(() => {
    if (!candidate || !vacancy) {
      return [];
    }

    return buildFitReasons(candidate, vacancy);
  }, [candidate, vacancy]);

  async function applyToVacancy() {
    try {
      if (!candidate || !vacancy) {
        throw new Error("Не удалось подготовить отклик");
      }

      if (existingMatch) {
        setSuccessText(
          `Вы уже откликнулись на эту вакансию. Текущий статус: ${formatMatchStatus(existingMatch.status)}.`
        );
        return;
      }

      setApplying(true);
      setErrorText("");
      setSuccessText("");

      const response = await fetch(`/api/vacancies/${vacancy.id}/apply`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          candidate_id: candidate.id,
          vacancy_id: vacancy.id,
          comment: null,
        }),
      });

      const text = await response.text();
      let data: ApplyResult | { detail?: string } | null = null;

      if (text.trim()) {
        try {
          data = JSON.parse(text);
        } catch {
          data = null;
        }
      }

      if (!response.ok) {
        const detail =
          (data as { detail?: string } | null)?.detail ||
          `Не удалось откликнуться (${response.status})`;

        if (detail === "Candidate already applied to this vacancy") {
          setExistingMatch({
            id: -1,
            candidate_id: candidate.id,
            employer_id: vacancy.employer_id,
            vacancy_id: vacancy.id,
            match_score: null,
            status: "shortlist",
            comment: null,
          });

          setSuccessText(
            "Вы уже откликнулись на эту вакансию. Проверьте текущий статус в разделе «Мои отклики»."
          );
          return;
        }

        throw new Error(detail);
      }

      setSuccessText(
        "Отклик отправлен. Теперь вы можете следить за статусом в разделе «Мои отклики»."
      );

      await loadData();

      setTimeout(() => {
        router.push("/candidate/matches");
      }, 900);
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        setErrorText(error.message);
      } else {
        setErrorText("Не удалось откликнуться на вакансию");
      }
    } finally {
      setApplying(false);
    }
  }

  if (loading) {
    return <main className="px-4 py-6">Загрузка вакансии...</main>;
  }

  if (errorText && !vacancy) {
    return (
      <main className="px-4 py-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorText}
        </div>
      </main>
    );
  }

  if (!vacancy || !candidate) {
    return (
      <main className="px-4 py-6">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Не удалось показать вакансию.
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6 px-4 py-6">
      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm text-slate-500">Вакансия для вас</p>
            <h1 className="mt-2 text-2xl font-semibold">
              {vacancy.role} · {vacancy.venue_name}
            </h1>
            <div className="mt-3 space-y-1 text-sm text-slate-600">
              <div>
                Локация: {vacancy.city}
                {vacancy.district ? `, ${vacancy.district}` : ""}
              </div>
              <div>Доход: {formatIncomeText(vacancy.salary_text)}</div>
              <div>График: {vacancy.schedule_text || "Не указан"}</div>
              <div>Когда нужен человек: {vacancy.needed_start || "Не указано"}</div>
              <div>Статус вакансии: {formatVacancyStatus(vacancy.status)}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/candidate/vacancies"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Назад к вакансиям
            </Link>

            <button
              type="button"
              onClick={() => void applyToVacancy()}
              disabled={applying || Boolean(existingMatch)}
              className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {existingMatch
                ? "Вы уже откликнулись"
                : applying
                  ? "Отправляем..."
                  : "Откликнуться"}
            </button>
          </div>
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

      {existingMatch ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-amber-900">
            Вы уже откликались на эту вакансию
          </h2>
          <div className="mt-3 text-sm text-amber-800">
            Текущий статус: <span className="font-medium">{formatMatchStatus(existingMatch.status)}</span>
          </div>
          <div className="mt-2 text-sm text-amber-800">
            Новый отклик создавать не нужно — лучше посмотреть, что происходит с текущим, в разделе «Мои отклики».
          </div>
          <div className="mt-4">
            <Link
              href="/candidate/matches"
              className="inline-flex rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
            >
              Перейти в мои отклики
            </Link>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Почему эта вакансия вам подходит</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {fitReasons.map((reason) => (
            <div
              key={reason}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
            >
              {reason}
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Что важно по вакансии</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div>
              <span className="font-medium text-slate-900">Роль:</span> {vacancy.role}
            </div>
            <div>
              <span className="font-medium text-slate-900">Заведение:</span> {vacancy.venue_name}
            </div>
            <div>
              <span className="font-medium text-slate-900">Город:</span> {vacancy.city}
            </div>
            <div>
              <span className="font-medium text-slate-900">Район:</span> {vacancy.district || "Не указан"}
            </div>
            <div>
              <span className="font-medium text-slate-900">Доход:</span> {formatIncomeText(vacancy.salary_text)}
            </div>
            <div>
              <span className="font-medium text-slate-900">График:</span> {vacancy.schedule_text || "Не указан"}
            </div>
            <div>
              <span className="font-medium text-slate-900">Когда нужен человек:</span> {vacancy.needed_start || "Не указано"}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Что система уже знает о вас</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div>
              <span className="font-medium text-slate-900">Имя:</span> {candidate.full_name}
            </div>
            <div>
              <span className="font-medium text-slate-900">Основная роль:</span> {candidate.primary_role}
            </div>
            <div>
              <span className="font-medium text-slate-900">Город:</span> {candidate.city}
            </div>
            <div>
              <span className="font-medium text-slate-900">Район:</span> {candidate.district || "Не указан"}
            </div>
            <div>
              <span className="font-medium text-slate-900">Опыт:</span> {formatExperience(candidate.horeca_experience_months)}
            </div>
            <div>
              <span className="font-medium text-slate-900">Готовность выйти:</span> {candidate.ready_to_start}
            </div>
            <div>
              <span className="font-medium text-slate-900">Ожидаемый доход:</span> {formatIncomeText(candidate.expected_income)}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Что будет после отклика</h2>
        <div className="mt-4 space-y-3 text-sm text-slate-600">
          <div>1. Ваш отклик отправится работодателю.</div>
          <div>2. Вы увидите статус в разделе «Мои отклики».</div>
          <div>3. Если работодатель посмотрит отклик, статус обновится.</div>
          <div>4. Если по вам будет интерес, это тоже станет видно в статусах.</div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void applyToVacancy()}
            disabled={applying || Boolean(existingMatch)}
            className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {existingMatch
              ? "Отклик уже отправлен"
              : applying
                ? "Отправляем..."
                : "Откликнуться на вакансию"}
          </button>

          <Link
            href="/candidate/matches"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Мои отклики
          </Link>
        </div>
      </section>
    </main>
  );
}