"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getCurrentCandidateId } from "@/lib/current-user";

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

type FitExplanation = {
  title: string;
  reasons: string[];
};

type VacancyCardItem = VacancyItem & {
  match?: MatchItem | null;
  fitScore: number;
  fitExplanation: FitExplanation;
};

type VacancyFilter = "all" | "fresh" | "applied";
type ListingTypeFilter = "all" | "job" | "part_time" | "shift";

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

function isTelegramMiniApp() {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(window.Telegram?.WebApp);
}

function formatIncomeText(value?: string | null) {
  return value?.trim() ? value : "Не указано";
}

function formatReadyToStart(value?: string | null) {
  if (!value?.trim()) {
    return "Не указано";
  }

  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case "today":
    case "сегодня":
      return "Сегодня";
    case "tomorrow":
    case "завтра":
      return "Завтра";
    case "3days":
    case "3_days":
    case "3 дня":
      return "В течение 3 дней";
    case "week":
    case "неделя":
      return "В течение недели";
    default:
      return value;
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
      return "Работодатель хочет связаться";
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

function getStatusHint(match?: MatchItem | null) {
  if (!match) {
    return "Новая для вас — можно быстро открыть и решить, откликаться ли сейчас.";
  }

  switch (match.status) {
    case "shortlist":
    case "sent":
      return "Отклик уже отправлен. Сейчас лучше ждать ответа и смотреть другие варианты.";
    case "viewed":
      return "Работодатель уже увидел отклик. Лучше быть на связи.";
    case "invited":
    case "interviewed":
    case "offered":
      return "По этой вакансии уже есть движение. Проверьте отклики и будьте на связи.";
    case "hired":
      return "Процесс по этой вакансии завершился успешно.";
    case "rejected":
    case "no_show":
      return "По этой вакансии процесс завершен. Можно сфокусироваться на других вариантах.";
    default:
      return "Статус по вакансии уже есть в откликах.";
  }
}

function calculateFitScore(candidate: CandidateItem, vacancy: VacancyItem) {
  let score = 40;

  const candidateRole = candidate.primary_role.trim().toLowerCase();
  const vacancyRole = vacancy.role.trim().toLowerCase();

  if (candidateRole === vacancyRole) {
    score += 25;
  } else if (
    candidateRole.includes(vacancyRole) ||
    vacancyRole.includes(candidateRole)
  ) {
    score += 15;
  }

  if (
    candidate.city.trim().toLowerCase() === vacancy.city.trim().toLowerCase()
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

function fitScoreLabel(score: number) {
  if (score >= 80) {
    return "Хорошее совпадение";
  }
  if (score >= 65) {
    return "Подходит";
  }
  return "Есть шанс";
}

function vacancyFilterLabel(filter: VacancyFilter) {
  switch (filter) {
    case "all":
      return "Все";
    case "fresh":
      return "Новые";
    case "applied":
      return "С откликом";
    default:
      return "Все";
  }
}

function vacancyFilterHint(filter: VacancyFilter) {
  switch (filter) {
    case "all":
      return "Все вакансии, которые сейчас доступны вам на экране.";
    case "fresh":
      return "Сначала смотрите новые — это вакансии, где вы еще не откликались.";
    case "applied":
      return "Здесь вакансии, по которым процесс уже начался.";
    default:
      return "";
  }
}

function listingTypeFilterLabel(filter: ListingTypeFilter) {
  switch (filter) {
    case "job":
      return "Работа";
    case "part_time":
      return "Подработка";
    case "shift":
      return "Смены";
    case "all":
    default:
      return "Все типы";
  }
}

function listingTypeFilterHint(filter: ListingTypeFilter) {
  switch (filter) {
    case "job":
      return "Постоянная работа и обычные вакансии.";
    case "part_time":
      return "Короткие форматы подработки без полного графика.";
    case "shift":
      return "Отдельные смены с датой и временем.";
    case "all":
    default:
      return "Можно быстро отделить работу, подработку и смены.";
  }
}

function listingTypeMatches(
  vacancy: VacancyItem | VacancyCardItem,
  filter: ListingTypeFilter
) {
  if (filter === "all") {
    return true;
  }

  return (vacancy.listing_type || "job") === filter;
}

function buildFitExplanation(
  candidate: CandidateItem,
  vacancy: VacancyItem
): FitExplanation {
  const candidateRole = candidate.primary_role.trim().toLowerCase();
  const vacancyRole = vacancy.role.trim().toLowerCase();

  const reasons: string[] = [];
  let title = "Подходит по базовым параметрам";

  if (candidateRole === vacancyRole) {
    title = "Роль полностью совпадает";
  } else if (
    candidateRole.includes(vacancyRole) ||
    vacancyRole.includes(candidateRole)
  ) {
    title = "Роль близка вашему профилю";
  }

  if (
    candidate.city.trim().toLowerCase() === vacancy.city.trim().toLowerCase()
  ) {
    reasons.push("Ваш город");
  }

  if (
    candidate.district &&
    vacancy.district &&
    candidate.district.trim().toLowerCase() ===
      vacancy.district.trim().toLowerCase()
  ) {
    reasons.push("Ваш район");
  }

  if (candidate.ready_to_start?.trim()) {
    reasons.push(`Можно выйти: ${formatReadyToStart(candidate.ready_to_start)}`);
  }

  if (candidate.expected_income && vacancy.salary_text) {
    reasons.push("Доход близок ожиданиям");
  }

  if (candidate.horeca_experience_months > 0) {
    reasons.push("Есть опыт в HoReCa");
  }

  if (reasons.length === 0) {
    reasons.push("Есть базовое совпадение");
  }

  return {
    title,
    reasons: reasons.slice(0, 3),
  };
}

function getVacancyStatusTone(match?: MatchItem | null) {
  if (!match) {
    return "bg-slate-100 text-slate-700";
  }

  if (["invited", "interviewed", "offered", "hired"].includes(match.status)) {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
  }

  if (["rejected", "no_show"].includes(match.status)) {
    return "bg-slate-100 text-slate-600";
  }

  return "bg-violet-50 text-violet-700 ring-1 ring-violet-100";
}

function getRoleEmoji(role: string) {
  const value = role.trim().toLowerCase();

  if (value.includes("бар")) {
    return "☕";
  }
  if (value.includes("офици")) {
    return "🍽️";
  }
  if (value.includes("повар")) {
    return "🍳";
  }
  if (value.includes("касс")) {
    return "💳";
  }
  if (value.includes("админ")) {
    return "🧾";
  }
  if (value.includes("хост")) {
    return "✨";
  }

  return "📍";
}

function getRoleGradient(role: string) {
  const value = role.trim().toLowerCase();

  if (value.includes("бар")) {
    return "from-amber-100 via-orange-50 to-white";
  }
  if (value.includes("офици")) {
    return "from-sky-100 via-blue-50 to-white";
  }
  if (value.includes("повар")) {
    return "from-rose-100 via-pink-50 to-white";
  }
  if (value.includes("касс")) {
    return "from-emerald-100 via-green-50 to-white";
  }
  if (value.includes("админ")) {
    return "from-violet-100 via-fuchsia-50 to-white";
  }

  return "from-slate-100 via-slate-50 to-white";
}

function getLocationLine(vacancy: VacancyItem) {
  if (vacancy.city && vacancy.district) {
    return `${vacancy.city}, ${vacancy.district}`;
  }

  return vacancy.city || vacancy.district || "Локация не указана";
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
  if (!vacancy.shift_date && !vacancy.shift_start_time && !vacancy.shift_end_time) {
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

function getPrimaryActionText(vacancy: VacancyCardItem) {
  if (vacancy.match) {
    return "Посмотреть вакансию";
  }

  if (vacancy.listing_type === "shift") {
    return "Посмотреть смену";
  }

  if (vacancy.listing_type === "part_time") {
    return "Посмотреть подработку";
  }

  return "Открыть вакансию";
}

function getVacancyCoverPhoto(vacancy: VacancyItem) {
  if (!vacancy.photos || vacancy.photos.length === 0) {
    return null;
  }

  return (
    vacancy.photos.find((photo) => photo.is_cover) ||
    [...vacancy.photos].sort((a, b) => a.sort_order - b.sort_order)[0] ||
    null
  );
}

function VacancyPhotoBlock({
  vacancy,
  roleEmoji,
}: {
  vacancy: VacancyItem;
  roleEmoji: string;
}) {
  const coverPhoto = getVacancyCoverPhoto(vacancy);
  const [imageFailed, setImageFailed] = useState(false);

  if (!coverPhoto || imageFailed) {
    return (
      <div className="relative flex h-48 w-full items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.14),transparent_35%)]" />
        <div className="relative flex flex-col items-center justify-center px-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/90 text-2xl shadow-sm ring-1 ring-slate-200">
            {roleEmoji}
          </div>
          <div className="mt-3 text-sm font-medium text-slate-700">
            Фото вакансии пока не добавлено
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {vacancy.venue_name}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-48 w-full overflow-hidden bg-slate-100">
      <img
        src={coverPhoto.photo_url}
        alt={`${vacancy.venue_name} — ${vacancy.role}`}
        className="h-full w-full object-cover"
        onError={() => setImageFailed(true)}
      />
    </div>
  );
}

export default function CandidateVacanciesPage() {
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [messageText, setMessageText] = useState("");
  const [candidate, setCandidate] = useState<CandidateItem | null>(null);
  const [vacancies, setVacancies] = useState<VacancyCardItem[]>([]);
  const [filter, setFilter] = useState<VacancyFilter>("all");
  const [listingTypeFilter, setListingTypeFilter] =
    useState<ListingTypeFilter>("all");
  const [isTelegram, setIsTelegram] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      setErrorText("");
      setMessageText("");

      const candidateId = getCurrentCandidateId();

      const [candidateResponse, vacanciesResponse, matchesResponse] =
        await Promise.all([
          fetch(`/api/candidates/${candidateId}`, { cache: "no-store" }),
          fetch("/api/vacancies/", { cache: "no-store" }),
          fetch(`/api/matches/?candidate_id=${candidateId}`, {
            cache: "no-store",
          }),
        ]);

      if (!candidateResponse.ok) {
        throw new Error("Не удалось загрузить кандидата");
      }

      if (!vacanciesResponse.ok) {
        throw new Error("Не удалось загрузить вакансии");
      }

      if (!matchesResponse.ok) {
        throw new Error("Не удалось загрузить отклики");
      }

      const candidateData = await readJsonSafe<CandidateItem>(candidateResponse);
      const vacanciesData = await readJsonSafe<VacancyItem[]>(vacanciesResponse);
      const matchesData = await readJsonSafe<MatchItem[]>(matchesResponse);

      if (!candidateData) {
        throw new Error("Кандидат не найден");
      }

      const matchByVacancyId = new Map<number, MatchItem>();
      for (const match of matchesData || []) {
        matchByVacancyId.set(match.vacancy_id, match);
      }

      const preparedVacancies: VacancyCardItem[] = (vacanciesData || [])
        .map((vacancy) => {
          const fitScore = calculateFitScore(candidateData, vacancy);
          const fitExplanation = buildFitExplanation(candidateData, vacancy);
          const match = matchByVacancyId.get(vacancy.id) || null;

          return {
            ...vacancy,
            match,
            fitScore,
            fitExplanation,
          };
        })
        .sort((a, b) => {
          if (Boolean(a.match) !== Boolean(b.match)) {
            return a.match ? 1 : -1;
          }
          return b.fitScore - a.fitScore;
        });

      setCandidate(candidateData);
      setVacancies(preparedVacancies);
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        setErrorText(error.message);
      } else {
        setErrorText("Не удалось загрузить вакансии");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setIsTelegram(isTelegramMiniApp());
    void loadData();
  }, []);

  const stats = useMemo(() => {
    return {
      total: vacancies.length,
      fresh: vacancies.filter((item) => !item.match).length,
      applied: vacancies.filter((item) => Boolean(item.match)).length,
    };
  }, [vacancies]);

  const nextStepText = useMemo(() => {
    if (!candidate) {
      return "Сначала проверьте профиль, чтобы вакансии подбирались точнее.";
    }

    if (!candidate.is_active) {
      return "Сначала лучше привести профиль в порядок, потом смотреть вакансии.";
    }

    if (stats.fresh > 0) {
      return "Начните с новых вакансий — там вы еще не откликались.";
    }

    if (stats.applied > 0) {
      return "Новых вакансий мало. Проверьте отклики — там может быть движение.";
    }

    return "Сейчас можно обновить список или скорректировать профиль.";
  }, [candidate, stats]);

  const filteredVacancies = useMemo(() => {
    return vacancies.filter((item) => {
      const baseMatch =
        filter === "all"
          ? true
          : filter === "fresh"
            ? !item.match
            : Boolean(item.match);

      if (!baseMatch) {
        return false;
      }

      return listingTypeMatches(item, listingTypeFilter);
    });
  }, [vacancies, filter, listingTypeFilter]);

  if (loading) {
    return (
      <main className="px-4 py-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          Загрузка вакансий...
        </div>
      </main>
    );
  }

  if (errorText && !candidate) {
    return (
      <main className="px-4 py-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorText}
        </div>
      </main>
    );
  }

  return (
    <main className={`px-4 py-6 ${isTelegram ? "space-y-4" : "space-y-6"}`}>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-violet-50 via-white to-white p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p
                className={`${
                  isTelegram
                    ? "text-xs font-semibold uppercase tracking-[0.16em] text-violet-600"
                    : "text-sm text-slate-500"
                }`}
              >
                {isTelegram ? "Для вас" : "Кандидат"}
              </p>

              <h1 className="mt-2 text-2xl font-semibold text-slate-900">
                Подходящие вакансии
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                {isTelegram
                  ? "Собрали вакансии по вашей роли, району и готовности выйти."
                  : "Здесь собраны вакансии, которые подходят вам по роли, локации и готовности выйти. Если вы уже откликались, это видно сразу."}
              </p>

              {candidate ? (
                <div className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-sm text-slate-600 ring-1 ring-slate-200">
                  {candidate.primary_role}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {isTelegram ? (
                <button
                  type="button"
                  onClick={() => setShowFilters((prev) => !prev)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {showFilters ? "Скрыть фильтры" : "Фильтры"}
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  void loadData();
                }}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Обновить
              </button>

              <Link
                href="/candidate/matches"
                className="rounded-2xl bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white hover:opacity-95"
              >
                Мои отклики
              </Link>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Что делать сейчас
            </div>

            <div className="mt-2 text-sm leading-6 text-slate-700">
              {nextStepText}
            </div>

            <div className="mt-3 text-sm text-slate-600">
              Совет: начните с вакансий с хорошим совпадением и без отклика.
            </div>
          </div>
        </div>
      </section>

      {messageText ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {messageText}
        </div>
      ) : null}

      {errorText ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorText}
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">
            {isTelegram ? "Всего" : "Всего вакансий"}
          </div>
          <div className="mt-2 text-xl font-semibold text-slate-900">
            {stats.total}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">
            {isTelegram ? "Новые" : "Новые для вас"}
          </div>
          <div className="mt-2 text-xl font-semibold text-slate-900">
            {stats.fresh}
          </div>
        </div>

        <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-1">
          <div className="text-xs text-slate-500">С откликом</div>
          <div className="mt-2 text-xl font-semibold text-slate-900">
            {stats.applied}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        {(!isTelegram || showFilters) && (
          <>
            <div className="flex flex-wrap gap-2">
              {(["all", "fresh", "applied"] as VacancyFilter[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                    filter === item
                      ? "bg-violet-600 text-white"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {vacancyFilterLabel(item)}
                </button>
              ))}
            </div>

            <div className="mt-3 text-sm text-slate-500">
              {vacancyFilterHint(filter)}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {(
                ["all", "job", "part_time", "shift"] as ListingTypeFilter[]
              ).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setListingTypeFilter(item)}
                  className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                    listingTypeFilter === item
                      ? "bg-slate-900 text-white"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {listingTypeFilterLabel(item)}
                </button>
              ))}
            </div>

            <div className="mt-3 text-sm text-slate-500">
              {listingTypeFilterHint(listingTypeFilter)}
            </div>
          </>
        )}

        {filteredVacancies.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            По выбранным фильтрам вакансий пока нет.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {filteredVacancies.map((vacancy) => {
              const roleEmoji = getRoleEmoji(vacancy.role);
              const roleGradient = getRoleGradient(vacancy.role);

              return (
                <div
                  key={vacancy.id}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  <VacancyPhotoBlock vacancy={vacancy} roleEmoji={roleEmoji} />

                  <div className={`bg-gradient-to-br ${roleGradient} p-4`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/90 text-xl shadow-sm ring-1 ring-slate-200">
                          {roleEmoji}
                        </div>

                        <div className="mt-4 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
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

                          <div className="text-xl font-semibold text-slate-900">
                            {vacancy.role}
                          </div>

                          <div className="text-sm text-slate-700">
                            {vacancy.venue_name}
                          </div>

                          {vacancy.listing_type === "shift" &&
                          formatShiftTimeLine(vacancy) ? (
                            <div className="text-sm font-medium text-slate-700">
                              {formatShiftTimeLine(vacancy)}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span className="rounded-full bg-white/90 px-3 py-1 text-xs text-slate-700 ring-1 ring-slate-200">
                          {getLocationLine(vacancy)}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${getVacancyStatusTone(
                            vacancy.match
                          )}`}
                        >
                          {vacancy.match
                            ? formatMatchStatus(vacancy.match.status)
                            : "Еще без отклика"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                          Доход
                        </div>
                        <div className="mt-2 text-sm font-medium text-slate-900">
                          {formatIncomeText(vacancy.salary_text)}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-3">
                        <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                          {vacancy.listing_type === "shift" ? "Дата и время" : "График"}
                        </div>
                        <div className="mt-2 text-sm font-medium text-slate-900">
                          {vacancy.listing_type === "shift"
                            ? formatShiftTimeLine(vacancy) || "Не указаны"
                            : vacancy.schedule_text || "Не указан"}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-3">
                        <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                          Когда нужен человек
                        </div>
                        <div className="mt-2 text-sm font-medium text-slate-900">
                          {formatReadyToStart(vacancy.needed_start)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 ring-1 ring-violet-100">
                        {fitScoreLabel(vacancy.fitScore)} · {vacancy.fitScore}
                      </span>

                      {vacancy.fitExplanation.reasons.map((reason) => (
                        <span
                          key={reason}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                      <div className="text-sm font-medium text-slate-900">
                        {vacancy.fitExplanation.title}
                      </div>

                      <div className="mt-2 text-sm leading-6 text-slate-600">
                        {getStatusHint(vacancy.match)}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 lg:flex-row">
                      <Link
                        href={`/candidate/vacancies/${vacancy.id}`}
                        className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white hover:opacity-95"
                      >
                        {getPrimaryActionText(vacancy)}
                      </Link>

                      {vacancy.match ? (
                        <Link
                          href="/candidate/matches"
                          className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Смотреть статус
                        </Link>
                      ) : (
                        <div className="inline-flex items-center justify-center rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm text-slate-500">
                          Отклик отправляется внутри вакансии
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}