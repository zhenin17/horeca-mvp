"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, apiPostJson, normalizeMediaUrl } from "@/lib/api";
import type { CurrentUserRead } from "@/lib/current-user";

type EmployerItem = {
  id: number;
  company_name: string;
  contact_name: string;
  phone: string;
  telegram_username?: string | null;
  city: string;
  website?: string | null;
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

type MatchItem = {
  id: number;
  candidate_id: number;
  employer_id: number;
  vacancy_id: number;
  match_score?: number | null;
  status: string;
  comment?: string | null;
  candidate: CandidateItem;
};

type CandidateReliability = {
  candidate_id: number;
  score: number;
  worked_count: number;
  no_show_count: number;
  cancelled_count: number;
};

type CandidateFilter = "new" | "in_work" | "finished" | "all";
type VacancyTypeFilter = "all" | "job" | "part_time" | "shift";

type MatchAction = {
  key: string;
  label: string;
  endpoint: string;
  successText: string;
};

function vacancyStatusLabel(status: string) {
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

function matchStatusLabel(status: string) {
  switch (status) {
    case "shortlist":
      return "Новый";
    case "sent":
      return "Отправлен";
    case "viewed":
      return "Просмотрен";
    case "invited":
      return "Приглашен";
    case "interviewed":
      return "На интервью";
    case "offered":
      return "Есть предложение";
    case "hired":
      return "Принят";
    case "rejected":
      return "Не подошел";
    case "no_show":
      return "Не вышел";
    default:
      return status || "—";
  }
}

function getReliabilityMeta(score?: number) {
  if (score === undefined) {
    return {
      label: "Без оценки",
      badgeClassName: "bg-slate-100 text-slate-700",
      helperText:
        "Истории пока недостаточно, чтобы сформировать ориентир по выходам.",
    };
  }

  if (score >= 80) {
    return {
      label: "Высокая надежность",
      badgeClassName:
        "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
      helperText: "Оценка формируется по истории выходов и отмен.",
    };
  }

  if (score >= 60) {
    return {
      label: "Хорошая надежность",
      badgeClassName: "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
      helperText: "Оценка формируется по истории выходов и отмен.",
    };
  }

  if (score >= 40) {
    return {
      label: "Пока мало истории",
      badgeClassName: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
      helperText: "Это не запрет, а ориентир для работодателя.",
    };
  }

  return {
    label: "Есть риск по выходам",
    badgeClassName: "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
    helperText: "Это не запрет, а ориентир для работодателя.",
  };
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

function shouldShowContacts(status: string) {
  return ["invited", "interviewed", "offered", "hired"].includes(status);
}

function normalizePhoneHref(phone?: string | null) {
  if (!phone?.trim()) {
    return null;
  }

  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : null;
}

function normalizeTelegramHref(username?: string | null) {
  if (!username?.trim()) {
    return null;
  }

  const cleaned = username.trim().replace(/^@/, "");
  return cleaned ? `https://t.me/${cleaned}` : null;
}

function getAvailableActions(status: string): MatchAction[] {
  switch (status) {
    case "shortlist":
      return [
        {
          key: "send",
          label: "Отправлен",
          endpoint: "send",
          successText: "Кандидат отмечен как отправленный",
        },
        {
          key: "invite",
          label: "Пригласить",
          endpoint: "invite",
          successText: "Кандидат приглашен",
        },
        {
          key: "reject",
          label: "Не подходит",
          endpoint: "reject",
          successText: "Кандидат отклонен",
        },
      ];

    case "sent":
      return [
        {
          key: "view",
          label: "Просмотрен",
          endpoint: "view",
          successText: "Кандидат отмечен как просмотренный",
        },
        {
          key: "invite",
          label: "Пригласить",
          endpoint: "invite",
          successText: "Кандидат приглашен",
        },
        {
          key: "reject",
          label: "Не подходит",
          endpoint: "reject",
          successText: "Кандидат отклонен",
        },
      ];

    case "viewed":
      return [
        {
          key: "invite",
          label: "Пригласить",
          endpoint: "invite",
          successText: "Кандидат приглашен",
        },
        {
          key: "reject",
          label: "Не подходит",
          endpoint: "reject",
          successText: "Кандидат отклонен",
        },
      ];

    case "invited":
      return [
        {
          key: "interview",
          label: "Интервью",
          endpoint: "interview",
          successText: "Кандидат переведен на этап интервью",
        },
        {
          key: "no-show",
          label: "Не вышел",
          endpoint: "no-show",
          successText: "Кандидат отмечен как не вышедший",
        },
        {
          key: "reject",
          label: "Не подходит",
          endpoint: "reject",
          successText: "Кандидат отклонен",
        },
      ];

    case "interviewed":
      return [
        {
          key: "hire",
          label: "Принять",
          endpoint: "hire",
          successText: "Кандидат отмечен как принятый",
        },
        {
          key: "no-show",
          label: "Не вышел",
          endpoint: "no-show",
          successText: "Кандидат отмечен как не вышедший",
        },
        {
          key: "reject",
          label: "Не подходит",
          endpoint: "reject",
          successText: "Кандидат отклонен",
        },
      ];

    case "hired":
    case "rejected":
    case "no_show":
      return [
        {
          key: "reopen",
          label: "Вернуть в работу",
          endpoint: "reopen",
          successText: "Кандидат возвращен в работу",
        },
      ];

    default:
      return [];
  }
}

function belongsToFilter(status: string, filter: CandidateFilter) {
  if (filter === "all") {
    return true;
  }

  if (filter === "new") {
    return ["shortlist", "sent", "viewed"].includes(status);
  }

  if (filter === "in_work") {
    return ["invited", "interviewed", "offered"].includes(status);
  }

  if (filter === "finished") {
    return ["hired", "rejected", "no_show"].includes(status);
  }

  return true;
}

function candidateFilterLabel(filter: CandidateFilter) {
  switch (filter) {
    case "new":
      return "Новые";
    case "in_work":
      return "В работе";
    case "finished":
      return "Завершены";
    case "all":
      return "Все";
    default:
      return "Все";
  }
}

function candidateFilterHint(filter: CandidateFilter) {
  switch (filter) {
    case "new":
      return "Сначала смотрите новых кандидатов — здесь нужен самый быстрый разбор.";
    case "in_work":
      return "Здесь кандидаты, с которыми уже есть движение по вакансии.";
    case "finished":
      return "Здесь завершенные процессы: найм, отказ или остановка.";
    case "all":
      return "Полный список кандидатов по выбранной вакансии.";
    default:
      return "";
  }
}

function vacancyTypeFilterLabel(filter: VacancyTypeFilter) {
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

function vacancyTypeFilterHint(filter: VacancyTypeFilter) {
  switch (filter) {
    case "job":
      return "Показываем только постоянную работу.";
    case "part_time":
      return "Показываем только подработку.";
    case "shift":
      return "Показываем только смены.";
    case "all":
    default:
      return "Показываем вакансии всех типов.";
  }
}

function belongsToVacancyTypeFilter(
  vacancy: VacancyItem,
  filter: VacancyTypeFilter
) {
  if (filter === "all") {
    return true;
  }

  return (vacancy.listing_type || "job") === filter;
}

function fitLabel(score: number) {
  if (score >= 80) {
    return "Хорошее совпадение";
  }
  if (score >= 65) {
    return "Подходит";
  }
  return "Есть шанс";
}

function buildCandidateFitReasons(
  match: MatchItem,
  vacancy: VacancyItem | null,
  reliability?: CandidateReliability
) {
  const reasons: string[] = [];
  const candidateRole = match.candidate.primary_role.trim().toLowerCase();
  const vacancyRole = vacancy?.role.trim().toLowerCase() || "";

  if (candidateRole && vacancyRole) {
    if (candidateRole === vacancyRole) {
      reasons.push("Главное: полностью совпадает по роли");
    } else if (
      candidateRole.includes(vacancyRole) ||
      vacancyRole.includes(candidateRole)
    ) {
      reasons.push("Главное: близко подходит по роли");
    }
  }

  if (
    vacancy &&
    match.candidate.city.trim().toLowerCase() === vacancy.city.trim().toLowerCase()
  ) {
    reasons.push("В том же городе");
  }

  if (
    vacancy?.district &&
    match.candidate.district &&
    vacancy.district.trim().toLowerCase() ===
      match.candidate.district.trim().toLowerCase()
  ) {
    reasons.push("Район совпадает");
  }

  if (match.candidate.horeca_experience_months >= 12) {
    reasons.push(
      `Есть опыт: ${formatExperience(match.candidate.horeca_experience_months)}`
    );
  } else if (match.candidate.horeca_experience_months > 0) {
    reasons.push("Есть опыт в HoReCa");
  }

  if (match.candidate.ready_to_start?.trim()) {
    reasons.push(`Может выйти: ${formatReadyToStart(match.candidate.ready_to_start)}`);
  }

  if (reliability?.score !== undefined && reliability.score >= 60) {
    reasons.push(`Надежность: ${getReliabilityMeta(reliability.score).label}`);
  }

  if (reasons.length === 0) {
    reasons.push("Подходит по базовым параметрам");
  }

  return reasons.slice(0, 3);
}

function getMatchStatusHint(status: string) {
  switch (status) {
    case "shortlist":
      return "Кандидат только что попал в подборку. Сейчас лучше быстро решить, двигать ли дальше.";
    case "sent":
      return "Кандидат уже отправлен дальше по воронке, но решение еще не принято.";
    case "viewed":
      return "Кандидат просмотрен. Следующий шаг — пригласить или завершить процесс.";
    case "invited":
      return "Контакты уже открыты. Сейчас важно быстро связаться с кандидатом.";
    case "interviewed":
      return "Общение уже идет. Следующий шаг — решение по найму.";
    case "offered":
      return "Есть позитивный сигнал. Лучше не затягивать со следующим действием.";
    case "hired":
      return "Процесс завершился успешно.";
    case "rejected":
      return "По этому кандидату процесс завершен отказом.";
    case "no_show":
      return "Процесс остановился после приглашения или общения.";
    default:
      return "Следующий шаг зависит от вашего решения по кандидату.";
  }
}

function getInitials(fullName: string) {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "К";
  }

  return parts.map((part) => part[0]?.toUpperCase() || "").join("");
}

function getCandidateAvatarTone(role: string) {
  const value = role.trim().toLowerCase();

  if (value.includes("бар")) {
    return "from-amber-100 via-orange-50 to-white text-amber-900";
  }
  if (value.includes("офици")) {
    return "from-sky-100 via-blue-50 to-white text-sky-900";
  }
  if (value.includes("повар")) {
    return "from-rose-100 via-pink-50 to-white text-rose-900";
  }
  if (value.includes("админ")) {
    return "from-violet-100 via-fuchsia-50 to-white text-violet-900";
  }
  if (value.includes("касс")) {
    return "from-emerald-100 via-green-50 to-white text-emerald-900";
  }

  return "from-slate-100 via-slate-50 to-white text-slate-900";
}

function getVacancyGradient(role: string) {
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
  if (value.includes("админ")) {
    return "from-violet-100 via-fuchsia-50 to-white";
  }

  return "from-slate-100 via-slate-50 to-white";
}

function getVacancyEmoji(role: string) {
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
  if (value.includes("админ")) {
    return "🧾";
  }
  if (value.includes("касс")) {
    return "💳";
  }
  if (value.includes("хост")) {
    return "✨";
  }

  return "📍";
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

function formatShiftTimeLine(vacancy?: VacancyItem | null) {
  if (!vacancy) {
    return null;
  }

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

function getSelectedVacancyActionHint(status: string) {
  switch (status) {
    case "closed":
      return "Вакансия закрыта. Ее можно вернуть в работу или отправить в архив.";
    case "archived":
      return "Вакансия в архиве. Ее можно вернуть в работу.";
    default:
      return "Сначала выберите действие по вакансии, затем разбирайте кандидатов ниже.";
  }
}

function getVacancyCoverPhoto(vacancy?: VacancyItem | null) {
  if (!vacancy?.photos || vacancy.photos.length === 0) {
    return null;
  }

  return (
    vacancy.photos.find((photo) => photo.is_cover) ||
    [...vacancy.photos].sort((a, b) => a.sort_order - b.sort_order)[0] ||
    null
  );
}

function VacancyPhotoThumb({
  vacancy,
  emoji,
}: {
  vacancy: VacancyItem;
  emoji: string;
}) {
  const coverPhoto = getVacancyCoverPhoto(vacancy);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [coverPhoto?.photo_url]);

  if (!coverPhoto || imageFailed) {
    return (
      <div className="flex h-24 w-full items-center justify-center rounded-2xl bg-white/80 ring-1 ring-slate-200 md:h-28">
        <div className="text-center">
          <div className="text-2xl">{emoji}</div>
          <div className="mt-1 text-[11px] text-slate-500">Без фото</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-24 w-full overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200 md:h-28">
      <img
        src={normalizeMediaUrl(coverPhoto.photo_url) || ""}
        alt={`${vacancy.venue_name} — ${vacancy.role}`}
        className="h-full w-full object-cover"
        onError={() => setImageFailed(true)}
      />
    </div>
  );
}

function SelectedVacancyPhoto({
  vacancy,
}: {
  vacancy: VacancyItem;
}) {
  const coverPhoto = getVacancyCoverPhoto(vacancy);
  const [imageFailed, setImageFailed] = useState(false);
  const emoji = getVacancyEmoji(vacancy.role);

  useEffect(() => {
    setImageFailed(false);
  }, [coverPhoto?.photo_url]);

  if (!coverPhoto || imageFailed) {
    return (
      <div className="flex h-52 w-full items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-100 via-slate-50 to-white">
        <div className="text-center">
          <div className="text-3xl">{emoji}</div>
          <div className="mt-3 text-sm font-medium text-slate-700">
            Фото вакансии пока не добавлено
          </div>
          <div className="mt-1 text-xs text-slate-500">{vacancy.venue_name}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-52 w-full overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
      <img
        src={normalizeMediaUrl(coverPhoto.photo_url) || ""}
        alt={`${vacancy.venue_name} — ${vacancy.role}`}
        className="h-full w-full object-cover"
        onError={() => setImageFailed(true)}
      />
    </div>
  );
}

export default function EmployerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [messageText, setMessageText] = useState("");

  const [currentUser, setCurrentUser] = useState<CurrentUserRead | null>(null);
  const [employer, setEmployer] = useState<EmployerItem | null>(null);
  const [vacancies, setVacancies] = useState<VacancyItem[]>([]);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [selectedVacancyId, setSelectedVacancyId] = useState<number | null>(null);
  const [candidateFilter, setCandidateFilter] = useState<CandidateFilter>("new");
  const [vacancyTypeFilter, setVacancyTypeFilter] =
    useState<VacancyTypeFilter>("all");
  const [busyMatchId, setBusyMatchId] = useState<number | null>(null);
  const [busyVacancyId, setBusyVacancyId] = useState<number | null>(null);
  const selectedVacancySectionRef = useRef<HTMLElement | null>(null);
  const [reliabilityByCandidateId, setReliabilityByCandidateId] = useState<
    Record<number, CandidateReliability>
  >({});

  async function loadPageData() {
    try {
      setLoading(true);
      setErrorText("");
      setMessageText("");

      const me = await apiFetch<CurrentUserRead>("/auth/me");
      setCurrentUser(me);

      if (!me.is_employer || !me.employer_id) {
        throw new Error("Профиль работодателя не найден");
      }

      const [currentEmployer, vacanciesData, matchesData] = await Promise.all([
        apiFetch<EmployerItem>("/me/employer"),
        apiFetch<VacancyItem[]>("/me/employer/vacancies"),
        apiFetch<MatchItem[]>("/me/employer/matches"),
      ]);

      setEmployer(currentEmployer);

      const employerVacancies = [...(vacanciesData || [])].sort((a, b) => b.id - a.id);
      const employerMatches = matchesData || [];

      setVacancies(employerVacancies);
      setMatches(employerMatches);

      setSelectedVacancyId((prev) => {
        if (prev && employerVacancies.some((item) => item.id === prev)) {
          return prev;
        }
        return employerVacancies[0]?.id ?? null;
      });

      const uniqueCandidateIds = Array.from(
        new Set(employerMatches.map((item) => item.candidate_id))
      );

      if (uniqueCandidateIds.length > 0) {
        const reliabilityResults = await Promise.all(
          uniqueCandidateIds.map(async (candidateId) => {
            try {
              const data = await apiFetch<CandidateReliability>(
                `/candidates/${candidateId}/reliability`
              );
              return data;
            } catch {
              return null;
            }
          })
        );

        const nextReliability: Record<number, CandidateReliability> = {};
        for (const item of reliabilityResults) {
          if (item) {
            nextReliability[item.candidate_id] = item;
          }
        }
        setReliabilityByCandidateId(nextReliability);
      } else {
        setReliabilityByCandidateId({});
      }
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        setErrorText(error.message);
      } else {
        setErrorText("Не удалось загрузить кабинет работодателя");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPageData();
  }, []);

  const vacanciesWithStats = useMemo(() => {
    return vacancies
      .filter((vacancy) => belongsToVacancyTypeFilter(vacancy, vacancyTypeFilter))
      .map((vacancy) => {
        const vacancyMatches = matches.filter((item) => item.vacancy_id === vacancy.id);

        const totalCount = vacancyMatches.length;
        const newCount = vacancyMatches.filter((item) =>
          ["shortlist", "sent", "viewed"].includes(item.status)
        ).length;
        const inWorkCount = vacancyMatches.filter((item) =>
          ["invited", "interviewed", "offered"].includes(item.status)
        ).length;
        const finishedCount = vacancyMatches.filter((item) =>
          ["hired", "rejected", "no_show"].includes(item.status)
        ).length;

        return {
          ...vacancy,
          totalCount,
          newCount,
          inWorkCount,
          finishedCount,
        };
      });
  }, [vacancies, matches, vacancyTypeFilter]);

  const selectedVacancy = useMemo(() => {
    return vacanciesWithStats.find((item) => item.id === selectedVacancyId) || null;
  }, [vacanciesWithStats, selectedVacancyId]);

  useEffect(() => {
    if (vacanciesWithStats.length === 0) {
      setSelectedVacancyId(null);
      return;
    }

    if (
      !selectedVacancyId ||
      !vacanciesWithStats.some((item) => item.id === selectedVacancyId)
    ) {
      setSelectedVacancyId(vacanciesWithStats[0].id);
    }
  }, [vacanciesWithStats, selectedVacancyId]);

  useEffect(() => {
    if (!selectedVacancyId) {
      return;
    }

    const timer = window.setTimeout(() => {
      selectedVacancySectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [selectedVacancyId]);

  const selectedVacancyMatches = useMemo(() => {
    const filtered = matches
      .filter((item) => item.vacancy_id === selectedVacancyId)
      .filter((item) => belongsToFilter(item.status, candidateFilter));

    return filtered.sort((a, b) => {
      const scoreA = a.match_score ?? 0;
      const scoreB = b.match_score ?? 0;
      return scoreB - scoreA;
    });
  }, [matches, selectedVacancyId, candidateFilter]);

  const dashboardStats = useMemo(() => {
    const activeVacancies = vacanciesWithStats.filter(
      (item) => !["closed", "archived"].includes(item.status)
    ).length;

    const newCandidates = matches.filter((item) =>
      ["shortlist", "sent", "viewed"].includes(item.status)
    ).length;

    const inWorkCandidates = matches.filter((item) =>
      ["invited", "interviewed", "offered"].includes(item.status)
    ).length;

    const hiredCandidates = matches.filter((item) => item.status === "hired").length;

    return {
      activeVacancies,
      newCandidates,
      inWorkCandidates,
      hiredCandidates,
    };
  }, [vacanciesWithStats, matches]);

  const nextStepText = useMemo(() => {
    if (dashboardStats.newCandidates > 0) {
      return "Сначала разберите новых кандидатов — это главный быстрый шаг по кабинету.";
    }

    if (dashboardStats.activeVacancies === 0) {
      return "Сейчас у вас нет активных вакансий. Следующий шаг — создать новую.";
    }

    if (dashboardStats.inWorkCandidates > 0) {
      return "По части кандидатов уже идет движение. Проверьте, кому пора написать или принять решение.";
    }

    return "Кабинет в порядке. Можно обновить вакансии или добавить новую.";
  }, [dashboardStats]);

  async function runMatchAction(
    matchId: number,
    endpoint: string,
    successText: string
  ) {
    try {
      setBusyMatchId(matchId);
      setMessageText("");
      setErrorText("");

      await apiPostJson(`/matches/${matchId}/${endpoint}`, {});

      if (endpoint === "invite") {
        setCandidateFilter("in_work");
        setMessageText("Кандидат приглашен. Контакты открыты.");
      } else if (endpoint === "reopen") {
        setCandidateFilter("new");
        setMessageText("Кандидат возвращен в работу.");
      } else if (
        endpoint === "reject" ||
        endpoint === "no-show" ||
        endpoint === "hire"
      ) {
        setCandidateFilter("finished");
        setMessageText(successText);
      } else {
        setMessageText(successText);
      }

      await loadPageData();
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        setErrorText(error.message);
      } else {
        setErrorText("Не удалось изменить статус");
      }
    } finally {
      setBusyMatchId(null);
    }
  }

  async function runVacancyAction(
    vacancyId: number,
    endpoint: "close" | "archive" | "reopen",
    successText: string
  ) {
    try {
      setBusyVacancyId(vacancyId);
      setMessageText("");
      setErrorText("");

      await apiPostJson(`/vacancies/${vacancyId}/${endpoint}`, {});
      setMessageText(successText);
      await loadPageData();
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        setErrorText(error.message);
      } else {
        setErrorText("Не удалось изменить статус вакансии");
      }
    } finally {
      setBusyVacancyId(null);
    }
  }

  if (loading) {
    return (
      <main className="px-4 py-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          Загрузка кабинета работодателя...
        </div>
      </main>
    );
  }

  if (errorText && !employer) {
    return (
      <main className="px-4 py-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorText}
        </div>
      </main>
    );
  }

  if (!employer || !currentUser?.employer_id) {
    return (
      <main className="px-4 py-6">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Работодатель не найден.
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
              <p className="text-sm font-medium text-slate-500">Кабинет работодателя</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                {employer.company_name}
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Здесь собраны ваши вакансии, кандидаты и все ключевые действия по воронке.
              </p>

              <div className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-sm text-slate-600 ring-1 ring-slate-200">
                {employer.city}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
  <Link
    href={`/employer/${currentUser.employer_id}/create-vacancies`}
    className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
  >
    Создать вакансию
  </Link>

  <Link
    href="/employer/onboarding"
    className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
  >
    Редактировать данные
  </Link>

  <button
    type="button"
    onClick={() => {
      void loadPageData();
    }}
    className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
  >
    Обновить
  </button>

  <Link
    href={`/about?from=/employer/${currentUser.employer_id}`}
    className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
  >
    О приложении
  </Link>
</div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Что делать сейчас
            </div>

            <div className="mt-2 text-sm leading-6 text-slate-700">
              {nextStepText}
            </div>

            <div className="mt-3 text-sm text-slate-600">
              Совет: начните с вакансии, которая сейчас выбрана ниже, и сначала разберите новых кандидатов по ней.
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Контактные данные
            </div>

            <div className="mt-3 space-y-1 text-sm text-slate-600">
              <div>Контакт: {employer.contact_name}</div>
              <div>Телефон: {employer.phone}</div>
              <div>Город: {employer.city}</div>
              {employer.telegram_username ? (
                <div>Telegram: @{employer.telegram_username}</div>
              ) : null}
              {employer.website ? <div>Сайт: {employer.website}</div> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Активные вакансии</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">
            {dashboardStats.activeVacancies}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Новые кандидаты</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">
            {dashboardStats.newCandidates}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">В работе</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">
            {dashboardStats.inWorkCandidates}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Приняты</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">
            {dashboardStats.hiredCandidates}
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

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">1. Выберите вакансию</h2>
              <p className="mt-1 text-sm text-slate-500">
                Сначала выберите нужную вакансию из списка. После выбора ниже сразу
                откроется блок с ее действиями и кандидатами.
              </p>
            </div>

            <Link
              href={`/employer/${currentUser.employer_id}/create-vacancies`}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Добавить вакансию
            </Link>
          </div>

          <div>
            <div className="flex flex-wrap gap-2">
              {(["all", "job", "part_time", "shift"] as VacancyTypeFilter[]).map(
                (item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setVacancyTypeFilter(item)}
                    className={`rounded-2xl border px-3 py-2 text-sm ${
                      vacancyTypeFilter === item
                        ? "border-violet-600 bg-violet-600 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {vacancyTypeFilterLabel(item)}
                  </button>
                )
              )}
            </div>

            <div className="mt-3 text-sm text-slate-500">
              {vacancyTypeFilterHint(vacancyTypeFilter)}
            </div>
          </div>
        </div>

        {vacanciesWithStats.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            У работодателя пока нет вакансий.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {vacanciesWithStats.map((vacancy) => {
              const isSelected = vacancy.id === selectedVacancyId;
              const needsAttention = vacancy.newCount > 0;
              const vacancyGradient = getVacancyGradient(vacancy.role);
              const vacancyEmoji = getVacancyEmoji(vacancy.role);

              return (
                <button
                  key={vacancy.id}
                  type="button"
                  onClick={() => setSelectedVacancyId(vacancy.id)}
                  className={`w-full overflow-hidden rounded-3xl border text-left transition ${
                    isSelected
                      ? "border-violet-600 bg-violet-50 shadow-sm"
                      : needsAttention
                        ? "border-amber-300 bg-white shadow-sm hover:shadow-md"
                        : "border-slate-200 bg-white shadow-sm hover:shadow-md"
                  }`}
                >
                  <div className={`bg-gradient-to-br ${vacancyGradient} p-4`}>
                    <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                      <VacancyPhotoThumb vacancy={vacancy} emoji={vacancyEmoji} />

                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/90 text-xl shadow-sm ring-1 ring-slate-200">
                            {vacancyEmoji}
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-2">
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

                            {needsAttention ? (
                              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
                                Требуют внимания: {vacancy.newCount} новых
                              </span>
                            ) : null}

                            {isSelected ? (
                              <span className="rounded-full bg-violet-600 px-3 py-1 text-xs font-medium text-white">
                                Выбрана
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-3 font-semibold text-slate-900">
                            {vacancy.role}
                          </div>
                          <div className="mt-1 text-sm text-slate-700">
                            {vacancy.venue_name}
                          </div>
                          <div className="mt-1 text-sm text-slate-700">
                            {vacancy.city}
                            {vacancy.district ? `, ${vacancy.district}` : ""}
                          </div>

                          {vacancy.listing_type === "shift" && formatShiftTimeLine(vacancy) ? (
                            <div className="mt-2 text-sm font-medium text-slate-700">
                              {formatShiftTimeLine(vacancy)}
                            </div>
                          ) : null}

                          <div className="mt-2 text-sm text-slate-600">
                            Статус: {vacancyStatusLabel(vacancy.status)}
                          </div>
                          <div className="mt-1 text-sm text-slate-600">
                            {vacancy.listing_type === "shift"
                              ? `Дата и время: ${formatShiftTimeLine(vacancy) || "—"}`
                              : `График: ${vacancy.schedule_text || "—"}`}
                          </div>
                          <div className="mt-1 text-sm text-slate-600">
                            Доход: {vacancy.salary_text || "—"}
                          </div>
                          <div className="mt-1 text-sm text-slate-600">
                            Нужен человек: {formatReadyToStart(vacancy.needed_start)}
                          </div>
                          {vacancy.slots_count ? (
                            <div className="mt-1 text-sm text-slate-600">
                              Нужно человек: {vacancy.slots_count}
                            </div>
                          ) : null}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm md:min-w-[280px]">
                          <div className="rounded-2xl bg-white/80 px-3 py-3">
                            Всего: {vacancy.totalCount}
                          </div>
                          <div className="rounded-2xl bg-amber-100 px-3 py-3">
                            Новые: {vacancy.newCount}
                          </div>
                          <div className="rounded-2xl bg-sky-100 px-3 py-3">
                            В работе: {vacancy.inWorkCount}
                          </div>
                          <div className="rounded-2xl bg-emerald-100 px-3 py-3">
                            Завершены: {vacancy.finishedCount}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section
        ref={selectedVacancySectionRef}
        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        {!selectedVacancy ? (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            Выберите вакансию выше, чтобы увидеть действия по ней и кандидатов.
          </div>
        ) : (
          <>
            <div className="rounded-3xl border border-violet-200 bg-violet-50/60 p-4 md:p-5">
              <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
                <SelectedVacancyPhoto vacancy={selectedVacancy} />

                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="max-w-2xl">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
                      2. Работаем с выбранной вакансией
                    </div>

                    <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                      {selectedVacancy.role}
                    </h2>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${getListingTypeTone(
                          selectedVacancy.listing_type
                        )}`}
                      >
                        {getListingTypeLabel(selectedVacancy.listing_type)}
                      </span>

                      <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-700 ring-1 ring-slate-200">
                        {vacancyStatusLabel(selectedVacancy.status)}
                      </span>

                      {selectedVacancy.urgent_flag ? (
                        <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-100">
                          Срочно
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 space-y-1 text-sm text-slate-700">
                      <div>Точка: {selectedVacancy.venue_name}</div>
                      <div>
                        Локация: {selectedVacancy.city}
                        {selectedVacancy.district ? `, ${selectedVacancy.district}` : ""}
                      </div>
                      <div>Доход: {selectedVacancy.salary_text || "Не указан"}</div>
                      <div>
                        {selectedVacancy.listing_type === "shift"
                          ? `Дата и время: ${formatShiftTimeLine(selectedVacancy) || "Не указаны"}`
                          : `График: ${selectedVacancy.schedule_text || "Не указан"}`}
                      </div>
                      <div>
                        Нужен человек: {formatReadyToStart(selectedVacancy.needed_start)}
                      </div>
                      {selectedVacancy.slots_count ? (
                        <div>Нужно человек: {selectedVacancy.slots_count}</div>
                      ) : null}
                    </div>

                    <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600 ring-1 ring-violet-100">
                      {getSelectedVacancyActionHint(selectedVacancy.status)}
                    </div>
                  </div>

                  <div className="w-full md:w-[360px]">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Действия по вакансии
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedVacancy.status !== "closed" &&
                        selectedVacancy.status !== "archived" ? (
                          <button
                            type="button"
                            disabled={busyVacancyId === selectedVacancy.id}
                            onClick={() =>
                              void runVacancyAction(
                                selectedVacancy.id,
                                "close",
                                "Вакансия закрыта"
                              )
                            }
                            className="rounded-2xl border border-amber-300 bg-white px-3 py-2 text-sm text-amber-800 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {busyVacancyId === selectedVacancy.id ? "Сохраняем..." : "Закрыть"}
                          </button>
                        ) : null}

                        {selectedVacancy.status !== "archived" ? (
                          <button
                            type="button"
                            disabled={busyVacancyId === selectedVacancy.id}
                            onClick={() =>
                              void runVacancyAction(
                                selectedVacancy.id,
                                "archive",
                                "Вакансия отправлена в архив"
                              )
                            }
                            className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {busyVacancyId === selectedVacancy.id ? "Сохраняем..." : "В архив"}
                          </button>
                        ) : null}

                        {(selectedVacancy.status === "closed" ||
                          selectedVacancy.status === "archived") ? (
                          <button
                            type="button"
                            disabled={busyVacancyId === selectedVacancy.id}
                            onClick={() =>
                              void runVacancyAction(
                                selectedVacancy.id,
                                "reopen",
                                "Вакансия возвращена в работу"
                              )
                            }
                            className="rounded-2xl border border-emerald-300 bg-white px-3 py-2 text-sm text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {busyVacancyId === selectedVacancy.id
                              ? "Сохраняем..."
                              : "Вернуть в работу"}
                          </button>
                        ) : null}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-2xl bg-slate-50 px-3 py-3">
                          Всего: {selectedVacancy.totalCount}
                        </div>
                        <div className="rounded-2xl bg-amber-50 px-3 py-3">
                          Новые: {selectedVacancy.newCount}
                        </div>
                        <div className="rounded-2xl bg-sky-50 px-3 py-3">
                          В работе: {selectedVacancy.inWorkCount}
                        </div>
                        <div className="rounded-2xl bg-emerald-50 px-3 py-3">
                          Завершены: {selectedVacancy.finishedCount}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  3. Кандидаты по выбранной вакансии
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Ниже только кандидаты именно по вакансии «{selectedVacancy.role}».
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {(["new", "in_work", "finished", "all"] as CandidateFilter[]).map(
                  (item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCandidateFilter(item)}
                      className={`rounded-2xl border px-3 py-2 text-sm ${
                        candidateFilter === item
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {candidateFilterLabel(item)}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="mt-3 text-sm text-slate-500">
              {candidateFilterHint(candidateFilter)}
            </div>

            {selectedVacancyMatches.length === 0 ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                По выбранному фильтру кандидатов пока нет.
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {selectedVacancyMatches.map((match) => {
                  const reliability = reliabilityByCandidateId[match.candidate_id];
                  const reliabilityMeta = getReliabilityMeta(reliability?.score);
                  const actions = getAvailableActions(match.status);
                  const contactsOpened = shouldShowContacts(match.status);
                  const fitReasons = buildCandidateFitReasons(
                    match,
                    selectedVacancy || null,
                    reliability
                  );
                  const score = match.match_score ?? 0;
                  const phoneHref = normalizePhoneHref(match.candidate.phone);
                  const telegramHref = normalizeTelegramHref(
                    match.candidate.telegram_username
                  );
                  const initials = getInitials(match.candidate.full_name);
                  const avatarTone = getCandidateAvatarTone(
                    match.candidate.primary_role
                  );

                  return (
                    <div
                      key={match.id}
                      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                    >
                      <div className="p-4 md:p-5">
                        <div className="flex flex-col gap-5">
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="flex min-w-0 gap-4">
                              <div
                                className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarTone} text-base font-semibold shadow-sm ring-1 ring-slate-200`}
                              >
                                {initials}
                              </div>

                              <div className="min-w-0">
                                <div className="text-lg font-semibold text-slate-900">
                                  {match.candidate.full_name}
                                </div>

                                <div className="mt-1 text-sm text-slate-600">
                                  {match.candidate.primary_role}
                                </div>

                                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                                    {match.candidate.city}
                                    {match.candidate.district
                                      ? `, ${match.candidate.district}`
                                      : ""}
                                  </span>

                                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                                    Опыт: {formatExperience(match.candidate.horeca_experience_months)}
                                  </span>

                                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                                    Может выйти: {formatReadyToStart(match.candidate.ready_to_start)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 ring-1 ring-violet-100">
                                {fitLabel(score)} · {score}
                              </span>

                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                                {matchStatusLabel(match.status)}
                              </span>
                            </div>
                          </div>

                          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                            <div className="space-y-4">
                              <div className="rounded-2xl bg-slate-50 p-4">
                                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                  Почему подходит
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                  {fitReasons.map((reason) => (
                                    <span
                                      key={reason}
                                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700"
                                    >
                                      {reason}
                                    </span>
                                  ))}
                                </div>

                                <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-slate-600 ring-1 ring-slate-200">
                                  {getMatchStatusHint(match.status)}
                                </div>

                                {match.comment ? (
                                  <div className="mt-4 text-sm text-slate-500">
                                    Комментарий: {match.comment}
                                  </div>
                                ) : null}
                              </div>

                              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                      Надежность
                                    </div>
                                    <div className="mt-2 text-sm font-semibold text-slate-900">
                                      {reliabilityMeta.label}
                                    </div>
                                  </div>

                                  <span
                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${reliabilityMeta.badgeClassName}`}
                                  >
                                    score: {reliability?.score ?? "—"}
                                  </span>
                                </div>

                                <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                                  <div className="rounded-2xl bg-slate-50 px-3 py-3 text-slate-700">
                                    <div className="text-slate-500">Отработано</div>
                                    <div className="mt-1 text-base font-semibold text-slate-900">
                                      {reliability?.worked_count ?? 0}
                                    </div>
                                  </div>

                                  <div className="rounded-2xl bg-slate-50 px-3 py-3 text-slate-700">
                                    <div className="text-slate-500">Не вышел</div>
                                    <div className="mt-1 text-base font-semibold text-slate-900">
                                      {reliability?.no_show_count ?? 0}
                                    </div>
                                  </div>

                                  <div className="rounded-2xl bg-slate-50 px-3 py-3 text-slate-700">
                                    <div className="text-slate-500">Отменил</div>
                                    <div className="mt-1 text-base font-semibold text-slate-900">
                                      {reliability?.cancelled_count ?? 0}
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-3 text-xs leading-5 text-slate-500">
                                  {reliabilityMeta.helperText}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              {contactsOpened ? (
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                                  <div className="text-sm font-semibold text-emerald-900">
                                    Следующий шаг — связаться с кандидатом
                                  </div>

                                  <div className="mt-3 space-y-1">
                                    <div>Телефон: {match.candidate.phone}</div>
                                    {match.candidate.telegram_username ? (
                                      <div>Telegram: @{match.candidate.telegram_username}</div>
                                    ) : (
                                      <div className="text-emerald-700">
                                        Telegram не указан
                                      </div>
                                    )}
                                  </div>

                                  <div className="mt-4 flex flex-col gap-2">
                                    {phoneHref ? (
                                      <a
                                        href={phoneHref}
                                        className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
                                      >
                                        Позвонить
                                      </a>
                                    ) : null}

                                    {telegramHref ? (
                                      <a
                                        href={telegramHref}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center justify-center rounded-2xl border border-emerald-300 bg-white px-4 py-3 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50"
                                      >
                                        Написать в Telegram
                                      </a>
                                    ) : null}

                                    {!phoneHref && !telegramHref ? (
                                      <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                                        У кандидата нет контактов для быстрого выхода на связь.
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              ) : (
                                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                                  Контакты откроются после приглашения кандидата.
                                </div>
                              )}

                              {actions.length === 0 ? (
                                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                                  Для текущего статуса больше нет доступных действий.
                                </div>
                              ) : (
                                <div className="grid gap-2">
                                  {actions.map((action) => (
                                    <button
                                      key={action.key}
                                      type="button"
                                      disabled={busyMatchId === match.id}
                                      onClick={() =>
                                        void runMatchAction(
                                          match.id,
                                          action.endpoint,
                                          action.successText
                                        )
                                      }
                                      className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {busyMatchId === match.id ? "Сохраняем..." : action.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}