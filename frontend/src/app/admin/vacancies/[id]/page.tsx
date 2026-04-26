"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { apiFetch, getAccessToken, normalizeMediaUrl } from "@/lib/api";
import { formatReadyToStart } from "@/lib/format";
import { reliabilityBadgeClass, reliabilityLabel } from "@/lib/events";
import { statusLabel } from "@/lib/status";
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

type CandidateReliability = {
  candidate_id: number;

  // Текущий backend-формат
  score?: number;
  worked_count?: number;
  no_show_count?: number;
  cancelled_count?: number;

  // Совместимость со старым frontend-форматом
  total_matches?: number;
  invited_count?: number;
  interviewed_count?: number;
  hired_count?: number;
  rejected_count?: number;
  reliability_score?: number;
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

type VacancyShortlist = {
  vacancy_id: number;
  role: string;
  venue_name: string;
  city: string;
  district?: string | null;
  status: string;
  matches: MatchItem[];
};

type VacancyFunnel = {
  vacancy_id: number;
  role: string;
  venue_name: string;
  total_matches: number;
  by_status: Record<string, number>;
};

type VacancyPhoto = {
  id: number;
  vacancy_id?: number;
  photo_url: string;
  sort_order?: number;
  is_cover?: boolean | null;
  is_main?: boolean | null;
  created_at?: string | null;
};

type MatchAction = {
  action: string;
  label: string;
  successText: string;
};

type VacancyStatusAction = {
  status: string;
  label: string;
};

const VACANCY_STATUS_ACTIONS: VacancyStatusAction[] = [
  { status: "new", label: "Новая" },
  { status: "in_progress", label: "В работе" },
  { status: "closed", label: "Закрыть" },
  { status: "archived", label: "Архив" },
];

function getAllowedActions(status: string): MatchAction[] {
  const transitions: Record<string, MatchAction[]> = {
    shortlist: [
      { action: "send", label: "Отправить", successText: "Кандидат отправлен работодателю" },
      { action: "view", label: "Просмотрен", successText: "Работодатель просмотрел кандидата" },
      { action: "invite", label: "Пригласить", successText: "Кандидат приглашен" },
      { action: "reject", label: "Отклонить", successText: "Кандидат отклонен" },
    ],
    sent: [
      { action: "view", label: "Просмотрен", successText: "Работодатель просмотрел кандидата" },
      { action: "invite", label: "Пригласить", successText: "Кандидат приглашен" },
      { action: "reject", label: "Отклонить", successText: "Кандидат отклонен" },
    ],
    viewed: [
      { action: "invite", label: "Пригласить", successText: "Кандидат приглашен" },
      { action: "reject", label: "Отклонить", successText: "Кандидат отклонен" },
    ],
    invited: [
      { action: "interview", label: "Собеседование", successText: "Собеседование отмечено" },
      { action: "hire", label: "Нанять", successText: "Кандидат отмечен как нанятый" },
      { action: "reject", label: "Отклонить", successText: "Кандидат отклонен" },
      { action: "no-show", label: "Не дошел", successText: "Отмечен невыход" },
    ],
    interviewed: [
      { action: "hire", label: "Нанять", successText: "Кандидат отмечен как нанятый" },
      { action: "reject", label: "Отклонить", successText: "Кандидат отклонен" },
      { action: "no-show", label: "Не дошел", successText: "Отмечен невыход" },
    ],
    offered: [
      { action: "hire", label: "Нанять", successText: "Кандидат отмечен как нанятый" },
      { action: "reject", label: "Отклонить", successText: "Кандидат отклонен" },
    ],
    rejected: [
      { action: "reopen", label: "Вернуть в работу", successText: "Отклик возвращен в работу" },
    ],
    no_show: [
      { action: "reopen", label: "Вернуть в работу", successText: "Отклик возвращен в работу" },
    ],
    hired: [
      { action: "reopen", label: "Вернуть в работу", successText: "Отклик возвращен в работу" },
    ],
    worked: [
      { action: "reopen", label: "Вернуть в работу", successText: "Отклик возвращен в работу" },
    ],
    cancelled: [
      { action: "reopen", label: "Вернуть в работу", successText: "Отклик возвращен в работу" },
    ],
    confirmed: [
      { action: "worked", label: "Отработал", successText: "Смена отмечена как отработанная" },
      { action: "cancel", label: "Отмена", successText: "Смена отменена" },
      { action: "no-show", label: "Не дошел", successText: "Отмечен невыход" },
    ],
  };

  return transitions[status] || [];
}

function getAuthHeaders(): HeadersInit {
  const token = getAccessToken();

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

function getReliabilityScore(reliability: CandidateReliability): number {
  return reliability.score ?? reliability.reliability_score ?? 0;
}

export default function AdminVacancyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [currentUser, setCurrentUser] = useState<CurrentUserRead | null>(null);
  const [shortlist, setShortlist] = useState<VacancyShortlist | null>(null);
  const [funnel, setFunnel] = useState<VacancyFunnel | null>(null);
  const [photos, setPhotos] = useState<VacancyPhoto[]>([]);
  const [reliabilityMap, setReliabilityMap] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [photoDeletingId, setPhotoDeletingId] = useState<number | null>(null);
  const [vacancyStatusUpdating, setVacancyStatusUpdating] = useState(false);
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);

    try {
      const [currentUserData, shortlistResponse, funnelResponse, photosData] =
        await Promise.all([
          apiFetch<CurrentUserRead>("/auth/me"),
          fetch(`/api/shortlists/vacancy/${id}`, {
            cache: "no-store",
            headers: getAuthHeaders(),
          }),
          fetch(`/api/shortlists/vacancy/${id}/funnel`, {
            cache: "no-store",
            headers: getAuthHeaders(),
          }),
          apiFetch<VacancyPhoto[]>(`/me/staff/vacancies/${id}/photos`),
        ]);

      if (!shortlistResponse.ok) {
        const data = await shortlistResponse.json().catch(() => null);
        throw new Error(data?.detail || "Не удалось загрузить shortlist");
      }

      if (!funnelResponse.ok) {
        const data = await funnelResponse.json().catch(() => null);
        throw new Error(data?.detail || "Не удалось загрузить воронку");
      }

      const shortlistData = (await shortlistResponse.json()) as VacancyShortlist;
      const funnelData = (await funnelResponse.json()) as VacancyFunnel;

      setCurrentUser(currentUserData);
      setShortlist(shortlistData);
      setFunnel(funnelData);
      setPhotos(photosData);

      const reliabilityEntries = await Promise.all(
        shortlistData.matches.map(async (match) => {
          try {
            const data = await apiFetch<CandidateReliability>(
              `/me/staff/candidates/${match.candidate_id}/reliability`
            );

            return [match.candidate_id, getReliabilityScore(data)] as const;
          } catch {
            return [match.candidate_id, 0] as const;
          }
        })
      );

      setReliabilityMap(Object.fromEntries(reliabilityEntries));
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        setMessage(error.message || "Не удалось загрузить страницу вакансии");
      } else {
        setMessage("Не удалось загрузить страницу вакансии");
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadPhotos() {
    try {
      const data = await apiFetch<VacancyPhoto[]>(`/me/staff/vacancies/${id}/photos`);
      setPhotos(data);
    } catch (error) {
      console.error(error);
      setMessage("Не удалось обновить фото вакансии");
    }
  }

  useEffect(() => {
    loadData();
  }, [id]);

  async function deleteVacancyPhoto(photoId: number) {
    const confirmed = window.confirm("Удалить фото вакансии? Это действие нельзя отменить.");

    if (!confirmed) {
      return;
    }

    setMessage("");
    setPhotoDeletingId(photoId);

    try {
      const response = await fetch(`/api/me/staff/vacancies/${id}/photos/${photoId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail || "Не удалось удалить фото вакансии");
      }

      setMessage("Фото вакансии удалено");
      await loadPhotos();
    } catch (error) {
      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Не удалось удалить фото вакансии");
      }
    } finally {
      setPhotoDeletingId(null);
    }
  }

  async function updateVacancyStatus(status: string) {
    setMessage("");
    setVacancyStatusUpdating(true);

    try {
      const response = await fetch(`/api/me/staff/vacancies/${id}/status`, {
        method: "PATCH",
        headers: {
          ...getAuthHeaders(),
          "content-type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail || "Не удалось изменить статус вакансии");
      }

      setMessage("Статус вакансии обновлен");
      await loadData();
    } catch (error) {
      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Не удалось изменить статус вакансии");
      }
    } finally {
      setVacancyStatusUpdating(false);
    }
  }

  async function runMatchAction(matchId: number, action: string, successText: string) {
    setMessage("");

    try {
      const response = await fetch(`/api/me/staff/matches/${matchId}/${action}`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      const data = (await response.json().catch(() => null)) as { detail?: string } | null;

      if (!response.ok) {
        throw new Error(data?.detail || "Не удалось изменить статус");
      }

      setMessage(successText);
      await loadData();
    } catch (error) {
      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Не удалось изменить статус");
      }
    }
  }

  if (loading) {
    return <main className="px-4 py-6">Загрузка...</main>;
  }

  if (!shortlist || !funnel) {
    return <main className="px-4 py-6">Вакансия не найдена</main>;
  }

  const canModeratePhotos = Boolean(currentUser?.is_admin || currentUser?.is_moderator);
  const canModerateMatches = Boolean(currentUser?.is_admin || currentUser?.is_moderator);
  const canModerateVacancyStatus = Boolean(currentUser?.is_admin || currentUser?.is_moderator);

  return (
    <main className="px-4 py-6 space-y-6">
      <div>
        <Link href="/admin/vacancies" className="text-sm text-slate-600 underline">
          ← Назад к вакансиям
        </Link>
      </div>

      {message ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          {message}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h1 className="text-2xl font-semibold">
          {shortlist.role} · {shortlist.venue_name}
        </h1>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <div>
            Локация: {shortlist.city}
            {shortlist.district ? `, ${shortlist.district}` : ""}
          </div>
          <div>Статус вакансии: {statusLabel(shortlist.status)}</div>
          <div>Всего откликов: {funnel.total_matches}</div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">Статус вакансии</h2>
          <p className="mt-1 text-sm text-slate-500">
            Текущий статус: {statusLabel(shortlist.status)}
          </p>
        </div>

        {!canModerateVacancyStatus ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Вы можете просматривать статус вакансии. Изменение доступно только admin и moderator.
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {VACANCY_STATUS_ACTIONS.map((item) => {
              const isCurrentStatus = shortlist.status === item.status;

              return (
                <button
                  key={item.status}
                  type="button"
                  onClick={() => updateVacancyStatus(item.status)}
                  disabled={vacancyStatusUpdating || isCurrentStatus}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCurrentStatus ? `${item.label} · сейчас` : item.label}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Модерация фото</h2>
            <p className="mt-1 text-sm text-slate-500">
              Фото вакансии, которые видят кандидаты в карточке.
            </p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
            {photos.length} фото
          </div>
        </div>

        {!canModeratePhotos ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Вы можете просматривать фото. Удаление доступно только admin и moderator.
          </div>
        ) : null}

        {photos.length === 0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            У вакансии пока нет фото.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((photo) => {
              const photoUrl = normalizeMediaUrl(photo.photo_url) || "";

              return (
                <div
                  key={photo.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  <div className="aspect-[4/3] bg-slate-100">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={`Фото вакансии ${photo.id}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-500">
                        Не удалось подготовить ссылку на фото
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 p-3">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <div className="text-slate-600">ID фото: {photo.id}</div>
                      {photo.is_cover || photo.is_main ? (
                        <div className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                          главное
                        </div>
                      ) : null}
                    </div>

                    {canModeratePhotos ? (
                      <button
                        type="button"
                        onClick={() => deleteVacancyPhoto(photo.id)}
                        disabled={photoDeletingId === photo.id}
                        className="w-full rounded-xl border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {photoDeletingId === photo.id ? "Удаляем..." : "Удалить фото"}
                      </button>
                    ) : (
                      <div className="rounded-xl bg-slate-50 px-3 py-2 text-center text-sm text-slate-500">
                        Только просмотр
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Воронка по вакансии</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Object.entries(funnel.by_status).map(([status, count]) => (
            <div key={status} className="rounded-xl bg-slate-50 p-3">
              <div className="text-xs text-slate-500">{statusLabel(status)}</div>
              <div className="mt-1 text-xl font-semibold">{count}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Shortlist</h2>

        {!canModerateMatches ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Вы можете просматривать отклики и статусы. Изменение статусов доступно только admin и moderator.
          </div>
        ) : null}

        {shortlist.matches.length === 0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            Пока в shortlist нет кандидатов.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {shortlist.matches.map((match) => {
              const reliabilityScore = reliabilityMap[match.candidate_id] ?? 0;
              const allowedActions = getAllowedActions(match.status);

              return (
                <div
                  key={match.id}
                  className="rounded-xl border border-slate-200 p-4 space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium">{match.candidate.full_name}</div>
                      <div className="text-sm text-slate-600">
                        {match.candidate.primary_role} · {match.candidate.city}
                        {match.candidate.district ? `, ${match.candidate.district}` : ""}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        Опыт: {match.candidate.horeca_experience_months} мес.
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        Готовность: {formatReadyToStart(match.candidate.ready_to_start)}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        Статус отклика: {statusLabel(match.status)}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        Индекс надежности: {reliabilityScore} / 100 ·{" "}
                        {reliabilityLabel(reliabilityScore)}
                      </div>
                      {match.comment ? (
                        <div className="mt-1 text-sm text-slate-500">
                          Комментарий: {match.comment}
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-2 text-right">
                      <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">
                        оценка {match.match_score ?? "-"}
                      </div>
                      <div
                        className={`rounded-full border px-3 py-1 text-sm font-medium ${reliabilityBadgeClass(
                          reliabilityScore
                        )}`}
                      >
                        надежность {reliabilityScore}
                      </div>
                    </div>
                  </div>

                  {!canModerateMatches ? (
                    <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                      Только просмотр
                    </div>
                  ) : allowedActions.length === 0 ? (
                    <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                      Для текущего статуса больше нет доступных действий.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {allowedActions.map((item) => (
                        <button
                          key={item.action}
                          onClick={() => runMatchAction(match.id, item.action, item.successText)}
                          className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}