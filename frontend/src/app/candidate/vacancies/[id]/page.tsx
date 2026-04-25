"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, apiPostJson, normalizeMediaUrl } from "@/lib/api";
import type { CurrentUserRead } from "@/lib/current-user";

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

type VacancyPhoto = {
  id: number;
  vacancy_id: number;
  photo_url: string;
  sort_order: number;
  is_cover: boolean;
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
  listing_type?: "job" | "part_time" | "shift";
  shift_date?: string | null;
  shift_start_time?: string | null;
  shift_end_time?: string | null;
  urgent_flag?: boolean;
  slots_count?: number | null;
  status: string;
  photos?: VacancyPhoto[];
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

function isTelegramMiniApp() {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(window.Telegram?.WebApp);
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
      return "Отправлен работодателю";
    case "viewed":
      return "Работодатель посмотрел";
    case "invited":
      return "Приглашают связаться";
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

function formatReadyToStart(value?: string | null) {
  if (!value?.trim()) {
    return "Не указано";
  }

  const normalized = value.trim().toLowerCase();

  const map: Record<string, string> = {
    today: "Сегодня",
    tomorrow: "Завтра",
    "3days": "В течение 3 дней",
    "3_days": "В течение 3 дней",
    week: "В течение недели",
    сегодня: "Сегодня",
    завтра: "Завтра",
    "3 дня": "В течение 3 дней",
    неделя: "В течение недели",
  };

  return map[normalized] || value;
}

function fitScoreLabel(score: number) {
  if (score >= 80) {
    return "Хорошее совпадение";
  }
  if (score >= 65) {
    return "Подходит";
  }
  return "Есть шанс";
}

function calculateFitScore(candidate: CandidateItem, vacancy: VacancyItem) {
  let score = 40;

  const candidateRole = (candidate.primary_role || "").trim().toLowerCase();
  const vacancyRole = (vacancy.role || "").trim().toLowerCase();

  if (candidateRole && vacancyRole && candidateRole === vacancyRole) {
    score += 25;
  } else if (
    candidateRole &&
    vacancyRole &&
    (candidateRole.includes(vacancyRole) ||
      vacancyRole.includes(candidateRole))
  ) {
    score += 15;
  }

  if (
    candidate.city?.trim().toLowerCase() === vacancy.city?.trim().toLowerCase()
  ) {
    score += 10;
  }

  if (
    candidate.district &&
    vacancy.district &&
    candidate.district.trim().toLowerCase() ===
      vacancy.district.trim().toLowerCase()
  ) {
    score += 10;
  }

  if (candidate.horeca_experience_months >= 12) {
    score += 10;
  } else if (candidate.horeca_experience_months > 0) {
    score += 5;
  }

  if (candidate.ready_to_start?.trim()) {
    score += 5;
  }

  return Math.min(score, 100);
}

function buildFitReasons(candidate: CandidateItem, vacancy: VacancyItem) {
  const reasons: string[] = [];

  const candidateRole = (candidate.primary_role || "").trim().toLowerCase();
  const vacancyRole = (vacancy.role || "").trim().toLowerCase();

  if (candidateRole && vacancyRole && candidateRole === vacancyRole) {
    reasons.push("Роль полностью совпадает с вашим профилем");
  } else if (
    candidateRole &&
    vacancyRole &&
    (candidateRole.includes(vacancyRole) ||
      vacancyRole.includes(candidateRole))
  ) {
    reasons.push("Роль близка к вашему текущему профилю");
  }

  if (
    candidate.city?.trim().toLowerCase() === vacancy.city?.trim().toLowerCase()
  ) {
    reasons.push("Вакансия находится в вашем городе");
  }

  if (
    candidate.district &&
    vacancy.district &&
    candidate.district.trim().toLowerCase() ===
      vacancy.district.trim().toLowerCase()
  ) {
    reasons.push("Район совпадает с вашим предпочтением");
  }

  if (candidate.horeca_experience_months > 0) {
    reasons.push(
      `У вас уже есть опыт в HoReCa: ${formatExperience(candidate.horeca_experience_months)}`
    );
  }

  if (candidate.ready_to_start?.trim()) {
    reasons.push(`Вы готовы выйти: ${formatReadyToStart(candidate.ready_to_start)}`);
  }

  if (candidate.expected_income && vacancy.salary_text) {
    reasons.push("Доход выглядит близким к вашим ожиданиям");
  }

  if (reasons.length === 0) {
    reasons.push("Вакансия подходит по базовым параметрам вашего профиля");
  }

  return reasons.slice(0, 4);
}

function buildNextStepText(
  existingMatch: MatchItem | null,
  vacancy: VacancyItem | null
) {
  if (!existingMatch) {
    if (vacancy?.listing_type === "shift") {
      return "Если смена вам подходит, можно откликнуться сейчас. Дальше статус сразу появится в разделе откликов.";
    }

    if (vacancy?.listing_type === "part_time") {
      return "Если подработка вам подходит, можно откликнуться сейчас. Дальше статус появится в разделе откликов.";
    }

    return "Если вакансия вам подходит, можно откликнуться сейчас. Дальше статус появится в разделе откликов.";
  }

  switch (existingMatch.status) {
    case "shortlist":
    case "sent":
      return "Отклик уже отправлен. Сейчас лучше ждать ответа и параллельно смотреть другие вакансии.";
    case "viewed":
      return "Работодатель уже посмотрел ваш отклик. Лучше быть на связи и не дублировать отклик.";
    case "invited":
      return "Контакт уже открыт работодателю. Проверьте Telegram и телефон.";
    case "interviewed":
      return "По этой вакансии уже идет следующий этап общения.";
    case "offered":
      return "По вам уже есть позитивное решение. Лучше не создавать новый отклик.";
    case "hired":
      return "Эта вакансия уже завершилась для вас успешно.";
    case "rejected":
    case "no_show":
      return "По этой вакансии процесс уже завершен. Лучше сфокусироваться на других вариантах.";
    default:
      return "Текущий статус уже есть в системе. Новый отклик не нужен.";
  }
}

function buildAfterApplySteps(
  existingMatch: MatchItem | null,
  vacancy: VacancyItem | null
) {
  if (existingMatch) {
    return [
      "Новый отклик создавать не нужно.",
      "Текущий статус уже сохранен в системе.",
      "Следить за изменениями лучше в разделе «Мои отклики».",
    ];
  }

  if (vacancy?.listing_type === "shift") {
    return [
      "Ваш отклик на смену отправится работодателю.",
      "Статус сразу появится в разделе «Мои отклики».",
      "Если смена срочная или по вам быстро примут решение, это будет видно по статусу.",
    ];
  }

  return [
    "Ваш отклик отправится работодателю.",
    "Статус сразу появится в разделе «Мои отклики».",
    "Если работодатель посмотрит вас или захочет связаться, это будет видно по статусу.",
  ];
}

function getListingTypeLabel(type?: VacancyItem["listing_type"]) {
  switch (type) {
    case "part_time":
      return "Подработка";
    case "shift":
      return "Смена";
    case "job":
    default:
      return "Работа";
  }
}

function getListingTypeTone(type?: VacancyItem["listing_type"]) {
  switch (type) {
    case "part_time":
      return "bg-violet-50 text-violet-700 ring-1 ring-violet-100";
    case "shift":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
    case "job":
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  }
}

function formatShiftTimeLine(vacancy: VacancyItem) {
  if (
    !vacancy.shift_date &&
    !vacancy.shift_start_time &&
    !vacancy.shift_end_time
  ) {
    return null;
  }

  const date = vacancy.shift_date || "Дата не указана";

  if (vacancy.shift_start_time && vacancy.shift_end_time) {
    return `${date} · ${vacancy.shift_start_time}–${vacancy.shift_end_time}`;
  }

  if (vacancy.shift_start_time) {
    return `${date} · с ${vacancy.shift_start_time}`;
  }

  return date;
}

function getApplyButtonText(
  vacancy: VacancyItem,
  existingMatch: MatchItem | null,
  applying: boolean
) {
  if (existingMatch) {
    return "Отклик уже есть";
  }

  if (applying) {
    return "Отправляем...";
  }

  if (vacancy.listing_type === "shift") {
    return "Откликнуться на смену";
  }

  if (vacancy.listing_type === "part_time") {
    return "Откликнуться на подработку";
  }

  return "Откликнуться на вакансию";
}

function normalizeArrayResponse<T>(
  value: unknown,
  keys: string[] = []
): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (value && typeof value === "object") {
    const objectValue = value as Record<string, unknown>;

    for (const key of keys) {
      const nested = objectValue[key];
      if (Array.isArray(nested)) {
        return nested as T[];
      }
    }

    if (Array.isArray(objectValue.items)) {
      return objectValue.items as T[];
    }

    if (Array.isArray(objectValue.vacancies)) {
      return objectValue.vacancies as T[];
    }

    if (Array.isArray(objectValue.matches)) {
      return objectValue.matches as T[];
    }

    if (Array.isArray(objectValue.results)) {
      return objectValue.results as T[];
    }

    if (Array.isArray(objectValue.data)) {
      return objectValue.data as T[];
    }
  }

  return [];
}

function normalizeVacancyItem(raw: unknown): VacancyItem | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const objectValue = raw as Record<string, unknown>;

  const source =
    objectValue.vacancy && typeof objectValue.vacancy === "object"
      ? (objectValue.vacancy as Record<string, unknown>)
      : objectValue;

  const id = Number(source.id);
  const employerId = Number(source.employer_id);

  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }

  const listingType =
    source.listing_type === "part_time" || source.listing_type === "shift"
      ? source.listing_type
      : "job";

  const slotsCount =
    source.slots_count === null || source.slots_count === undefined
      ? null
      : Number(source.slots_count);

  return {
    id,
    employer_id: Number.isFinite(employerId) ? employerId : 0,
    role: String(source.role ?? ""),
    venue_name: String(source.venue_name ?? ""),
    city: String(source.city ?? ""),
    district:
      source.district === null || source.district === undefined
        ? null
        : String(source.district),
    salary_text:
      source.salary_text === null || source.salary_text === undefined
        ? null
        : String(source.salary_text),
    schedule_text:
      source.schedule_text === null || source.schedule_text === undefined
        ? null
        : String(source.schedule_text),
    needed_start:
      source.needed_start === null || source.needed_start === undefined
        ? null
        : String(source.needed_start),
    listing_type: listingType,
    shift_date:
      source.shift_date === null || source.shift_date === undefined
        ? null
        : String(source.shift_date),
    shift_start_time:
      source.shift_start_time === null || source.shift_start_time === undefined
        ? null
        : String(source.shift_start_time),
    shift_end_time:
      source.shift_end_time === null || source.shift_end_time === undefined
        ? null
        : String(source.shift_end_time),
    urgent_flag: Boolean(source.urgent_flag),
    slots_count: Number.isFinite(slotsCount) ? slotsCount : null,
    status: String(source.status ?? "active"),
    photos: normalizeArrayResponse<VacancyPhoto>(source.photos, [
      "items",
      "photos",
      "results",
      "data",
    ]),
  };
}

function normalizeMatchItem(raw: unknown): MatchItem | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const objectValue = raw as Record<string, unknown>;

  const id = Number(objectValue.id);
  const candidateId = Number(objectValue.candidate_id);
  const employerId = Number(objectValue.employer_id);
  const nestedVacancy =
    objectValue.vacancy && typeof objectValue.vacancy === "object"
      ? (objectValue.vacancy as Record<string, unknown>)
      : null;

  const vacancyId = Number(objectValue.vacancy_id ?? nestedVacancy?.id);

  if (!Number.isFinite(id) || !Number.isFinite(vacancyId)) {
    return null;
  }

  const matchScore =
    objectValue.match_score === null || objectValue.match_score === undefined
      ? null
      : Number(objectValue.match_score);

  return {
    id,
    candidate_id: Number.isFinite(candidateId) ? candidateId : 0,
    employer_id: Number.isFinite(employerId) ? employerId : 0,
    vacancy_id: vacancyId,
    match_score: Number.isFinite(matchScore) ? matchScore : null,
    status: String(objectValue.status ?? ""),
    comment:
      objectValue.comment === null || objectValue.comment === undefined
        ? null
        : String(objectValue.comment),
  };
}

function getVacancyCoverPhoto(vacancy: VacancyItem) {
  const photos = normalizeArrayResponse<VacancyPhoto>(vacancy.photos, [
    "items",
    "photos",
    "results",
    "data",
  ]);

  if (photos.length === 0) {
    return null;
  }

  return (
    photos.find((photo) => photo.is_cover) ||
    [...photos].sort((a, b) => a.sort_order - b.sort_order)[0] ||
    null
  );
}

function VacancyHeroPhoto({
  vacancy,
}: {
  vacancy: VacancyItem;
}) {
  const coverPhoto = getVacancyCoverPhoto(vacancy);
  const [imageFailed, setImageFailed] = useState(false);

  if (!coverPhoto || imageFailed) {
    return (
      <div className="relative flex h-56 w-full items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-white sm:h-64">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.14),transparent_35%)]" />
        <div className="relative flex flex-col items-center justify-center px-4 text-center">
          <div className="rounded-2xl bg-white/90 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200">
            {vacancy.venue_name || "Заведение не указано"}
          </div>
          <div className="mt-3 text-base font-semibold text-slate-800">
            Фото вакансии пока не добавлено
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {vacancy.role || "Без названия"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-56 w-full overflow-hidden bg-slate-100 sm:h-64">
      <img
        src={normalizeMediaUrl(coverPhoto.photo_url) || ""}
        alt={`${vacancy.venue_name || "Вакансия"} — ${
          vacancy.role || "Без названия"
        }`}
        className="h-full w-full object-cover"
        onError={() => setImageFailed(true)}
      />
    </div>
  );
}

export default function CandidateVacancyDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const vacancyId = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");
  const [isTelegram, setIsTelegram] = useState(false);

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

      const me = await apiFetch<CurrentUserRead>("/auth/me");
      if (!me.is_candidate || !me.candidate_id) {
        throw new Error("Профиль кандидата не найден");
      }

      const [candidateData, matchesRaw, vacanciesRaw] = await Promise.all([
        apiFetch<CandidateItem>("/me/candidate"),
        apiFetch<unknown>("/me/candidate/matches"),
        apiFetch<unknown>("/me/candidate/vacancies"),
      ]);

      const allVacancies = normalizeArrayResponse<unknown>(vacanciesRaw, [
        "items",
        "vacancies",
        "results",
        "data",
      ])
        .map(normalizeVacancyItem)
        .filter(Boolean) as VacancyItem[];

      const matchesData = normalizeArrayResponse<unknown>(matchesRaw, [
        "items",
        "matches",
        "results",
        "data",
      ])
        .map(normalizeMatchItem)
        .filter(Boolean) as MatchItem[];

      const vacancyData =
        allVacancies.find((item) => item.id === vacancyId) || null;

      if (!candidateData) {
        throw new Error("Кандидат не найден");
      }

      if (!vacancyData) {
        throw new Error("Вакансия не найдена");
      }

      const currentMatch =
        matchesData.find((item) => item.vacancy_id === vacancyId) || null;

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
    setIsTelegram(isTelegramMiniApp());
    void loadData();
  }, [vacancyId]);

  const fitReasons = useMemo(() => {
    if (!candidate || !vacancy) {
      return [];
    }

    return buildFitReasons(candidate, vacancy);
  }, [candidate, vacancy]);

  const fitScore = useMemo(() => {
    if (!candidate || !vacancy) {
      return 0;
    }

    return calculateFitScore(candidate, vacancy);
  }, [candidate, vacancy]);

  const afterApplySteps = useMemo(() => {
    return buildAfterApplySteps(existingMatch, vacancy);
  }, [existingMatch, vacancy]);

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

      await apiPostJson<ApplyResult>(`/vacancies/${vacancy.id}/apply`, {
        candidate_id: candidate.id,
        vacancy_id: vacancy.id,
        comment: null,
      });

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
        if (error.message === "Candidate already applied to this vacancy") {
          setSuccessText(
            "Вы уже откликнулись на эту вакансию. Проверьте текущий статус в разделе «Мои отклики»."
          );
          await loadData();
          return;
        }

        setErrorText(error.message);
      } else {
        setErrorText("Не удалось откликнуться на вакансию");
      }
    } finally {
      setApplying(false);
    }
  }

  if (loading) {
    return (
      <main className="px-4 py-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          Загрузка вакансии...
        </div>
      </main>
    );
  }

  if (errorText && !vacancy) {
    return (
      <main className="px-4 py-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorText}
        </div>
      </main>
    );
  }

  if (!vacancy || !candidate) {
    return (
      <main className="px-4 py-6">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Не удалось показать вакансию.
        </div>
      </main>
    );
  }

  return (
    <main className={`space-y-5 px-4 py-5 ${isTelegram ? "" : "md:space-y-6 md:py-6"}`}>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <VacancyHeroPhoto vacancy={vacancy} />

        <div className="bg-gradient-to-br from-violet-50 via-white to-white p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-600">
                  {vacancy.listing_type === "shift"
                    ? "Смена"
                    : vacancy.listing_type === "part_time"
                      ? "Подработка"
                      : "Вакансия"}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${getListingTypeTone(
                      vacancy.listing_type
                    )}`}
                  >
                    {getListingTypeLabel(vacancy.listing_type)}
                  </span>

                  {vacancy.urgent_flag ? (
                    <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-100">
                      Срочно
                    </span>
                  ) : null}
                </div>

                <h1 className="mt-3 text-2xl font-semibold text-slate-900">
                  {vacancy.role || "Без названия"}
                </h1>

                <div className="mt-1 text-sm text-slate-700">
                  {vacancy.venue_name || "Заведение не указано"}
                </div>

                {vacancy.listing_type === "shift" && formatShiftTimeLine(vacancy) ? (
                  <div className="mt-2 text-sm font-medium text-slate-700">
                    {formatShiftTimeLine(vacancy)}
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                    {vacancy.city || "Локация не указана"}
                    {vacancy.district ? `, ${vacancy.district}` : ""}
                  </span>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                    Доход: {formatIncomeText(vacancy.salary_text)}
                  </span>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                    {vacancy.listing_type === "shift"
                      ? `Дата и время: ${formatShiftTimeLine(vacancy) || "Не указаны"}`
                      : `График: ${vacancy.schedule_text || "Не указан"}`}
                  </span>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                    Выход: {formatReadyToStart(vacancy.needed_start)}
                  </span>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                    Статус: {formatVacancyStatus(vacancy.status)}
                  </span>
                </div>

                <div className="mt-4 inline-flex rounded-full bg-violet-50 px-3 py-1 text-sm text-violet-700 ring-1 ring-violet-100">
                  {fitScoreLabel(fitScore)} · {fitScore}
                </div>
              </div>

              <div className="flex w-full flex-col gap-3 md:w-[280px]">
                <button
                  type="button"
                  onClick={() => void applyToVacancy()}
                  disabled={applying || Boolean(existingMatch)}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {getApplyButtonText(vacancy, existingMatch, applying)}
                </button>

                <Link
                  href="/candidate/vacancies"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                >
                  Назад к вакансиям
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Что делать сейчас
              </div>

              <div className="mt-2 text-sm leading-6 text-slate-700">
                {buildNextStepText(existingMatch, vacancy)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {errorText ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorText}
        </div>
      ) : null}

      {successText ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-800">
          {successText}
        </div>
      ) : null}

      {existingMatch ? (
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm">
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">
                Уже есть отклик
              </p>
              <h2 className="mt-2 text-xl font-semibold text-emerald-950">
                Вы уже откликались на эту вакансию
              </h2>
            </div>

            <div className="inline-flex w-fit rounded-full border border-emerald-200 bg-white/90 px-3 py-1 text-sm font-medium text-emerald-900">
              Текущий статус: {formatMatchStatus(existingMatch.status)}
            </div>

            <p className="text-sm leading-6 text-emerald-900">
              Новый отклик создавать не нужно. Лучше просто следить за текущим
              статусом и быть на связи.
            </p>

            <div className="pt-1">
              <Link
                href="/candidate/matches"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100"
              >
                Перейти в мои отклики
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-600">
              Почему подходит
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              Почему эта вакансия может вам подойти
            </h2>

            <div className="mt-4 flex flex-wrap gap-2">
              {fitReasons.map((reason) => (
                <span
                  key={reason}
                  className="rounded-full border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900"
                >
                  {reason}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Что система видит
            </div>

            <div className="mt-2 text-sm leading-6 text-slate-700">
              Система сопоставила ваш профиль с этой вакансией по роли, локации,
              опыту и готовности выйти.
            </div>

            <div className="mt-3 text-sm font-medium text-slate-900">
              Совпадение: {fitScoreLabel(fitScore)} · {fitScore}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-600">
            По вакансии
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">
            Что важно знать
          </h2>

          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div>
              <span className="font-medium text-slate-900">Тип:</span>{" "}
              {getListingTypeLabel(vacancy.listing_type)}
            </div>
            <div>
              <span className="font-medium text-slate-900">Роль:</span>{" "}
              {vacancy.role || "Без названия"}
            </div>
            <div>
              <span className="font-medium text-slate-900">Заведение:</span>{" "}
              {vacancy.venue_name || "Заведение не указано"}
            </div>
            <div>
              <span className="font-medium text-slate-900">Город:</span>{" "}
              {vacancy.city || "Локация не указана"}
            </div>
            <div>
              <span className="font-medium text-slate-900">Район:</span>{" "}
              {vacancy.district || "Не указан"}
            </div>
            <div>
              <span className="font-medium text-slate-900">Доход:</span>{" "}
              {formatIncomeText(vacancy.salary_text)}
            </div>
            <div>
              <span className="font-medium text-slate-900">
                {vacancy.listing_type === "shift" ? "Дата и время:" : "График:"}
              </span>{" "}
              {vacancy.listing_type === "shift"
                ? formatShiftTimeLine(vacancy) || "Не указаны"
                : vacancy.schedule_text || "Не указан"}
            </div>
            <div>
              <span className="font-medium text-slate-900">Когда нужен человек:</span>{" "}
              {formatReadyToStart(vacancy.needed_start)}
            </div>
            <div>
              <span className="font-medium text-slate-900">Статус вакансии:</span>{" "}
              {formatVacancyStatus(vacancy.status)}
            </div>
            {vacancy.urgent_flag ? (
              <div>
                <span className="font-medium text-slate-900">Срочность:</span> Срочная
              </div>
            ) : null}
            {vacancy.slots_count ? (
              <div>
                <span className="font-medium text-slate-900">Нужно человек:</span>{" "}
                {vacancy.slots_count}
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-600">
            Ваш профиль
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">
            Что система уже знает о вас
          </h2>

          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div>
              <span className="font-medium text-slate-900">Имя:</span> {candidate.full_name}
            </div>
            <div>
              <span className="font-medium text-slate-900">Основная роль:</span>{" "}
              {candidate.primary_role || "Не указана"}
            </div>
            <div>
              <span className="font-medium text-slate-900">Город:</span>{" "}
              {candidate.city || "Не указан"}
            </div>
            <div>
              <span className="font-medium text-slate-900">Район:</span>{" "}
              {candidate.district || "Не указан"}
            </div>
            <div>
              <span className="font-medium text-slate-900">Опыт:</span>{" "}
              {formatExperience(candidate.horeca_experience_months)}
            </div>
            <div>
              <span className="font-medium text-slate-900">Готовность выйти:</span>{" "}
              {formatReadyToStart(candidate.ready_to_start)}
            </div>
            <div>
              <span className="font-medium text-slate-900">Ожидаемый доход:</span>{" "}
              {formatIncomeText(candidate.expected_income)}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-600">
          После отклика
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">
          Что произойдет дальше
        </h2>

        <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
          {afterApplySteps.map((step) => (
            <div key={step}>{step}</div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => void applyToVacancy()}
            disabled={applying || Boolean(existingMatch)}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {getApplyButtonText(vacancy, existingMatch, applying)}
          </button>

          <Link
            href="/candidate/matches"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
          >
            Мои отклики
          </Link>
        </div>
      </section>
    </main>
  );
}