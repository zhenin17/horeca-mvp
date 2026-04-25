"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { normalizeMediaUrl } from "@/lib/api";
import { formatReadyToStart, formatSalary } from "@/lib/format";
import { statusLabel } from "@/lib/status";
import { reliabilityBadgeClass, reliabilityLabel } from "@/lib/events";

type CandidateDashboardItem = {
  match_id: number;
  vacancy_id: number;
  employer_id: number;
  role: string;
  venue_name: string;
  city: string;
  district?: string | null;
  match_score?: number | null;
  status: string;
  comment?: string | null;
};

type CandidateDashboard = {
  candidate_id: number;
  full_name: string;
  primary_role: string;
  city: string;
  district?: string | null;
  ready_to_start: string;
  total_matches: number;
  active_matches: number;
  hired_matches: number;
  rejected_matches: number;
  items: CandidateDashboardItem[];
};

type CandidateProfile = {
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

  // Новый ожидаемый формат
  score?: number;
  worked_count?: number;
  cancelled_count?: number;

  // Уже существующий формат, который был в файле
  total_matches?: number;
  invited_count?: number;
  interviewed_count?: number;
  hired_count?: number;
  rejected_count?: number;
  no_show_count?: number;
  reliability_score?: number;
};

type CandidatePhoto = {
  id: number;
  candidate_id?: number;
  photo_url: string;
  is_main?: boolean | null;
  created_at?: string | null;
};

type CandidateAvailabilityItem = {
  id: number;
  candidate_id: number;
  available_date: string;
  slot_type: string;
  start_time?: string | null;
  end_time?: string | null;
  is_active?: boolean;
};

function getReliabilityScore(reliability: CandidateReliability | null): number {
  if (!reliability) {
    return 0;
  }

  return reliability.score ?? reliability.reliability_score ?? 0;
}

function formatSlotType(slotType: string): string {
  const labels: Record<string, string> = {
    morning: "Утро",
    day: "День",
    evening: "Вечер",
    night: "Ночь",
    full_day: "Полный день",
  };

  return labels[slotType] || slotType;
}

function formatAvailabilityTime(item: CandidateAvailabilityItem): string {
  if (item.start_time && item.end_time) {
    return `${item.start_time}–${item.end_time}`;
  }

  if (item.start_time) {
    return `с ${item.start_time}`;
  }

  if (item.end_time) {
    return `до ${item.end_time}`;
  }

  return "Время не указано";
}

export default function AdminCandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [dashboard, setDashboard] = useState<CandidateDashboard | null>(null);
  const [reliability, setReliability] = useState<CandidateReliability | null>(null);
  const [photos, setPhotos] = useState<CandidatePhoto[]>([]);
  const [availability, setAvailability] = useState<CandidateAvailabilityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoDeletingId, setPhotoDeletingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);

    try {
      const [
        candidateResponse,
        dashboardResponse,
        reliabilityResponse,
        photosResponse,
        availabilityResponse,
      ] = await Promise.all([
        fetch(`/api/candidates/${id}`, { cache: "no-store" }),
        fetch(`/api/candidates/${id}/dashboard`, { cache: "no-store" }),
        fetch(`/api/candidates/${id}/reliability`, { cache: "no-store" }),
        fetch(`/api/candidates/${id}/photos`, { cache: "no-store" }),
        fetch(`/api/candidates/${id}/availability`, { cache: "no-store" }),
      ]);

      if (!candidateResponse.ok) {
        throw new Error("Не удалось загрузить профиль кандидата");
      }

      if (!dashboardResponse.ok) {
        throw new Error("Не удалось загрузить дашборд кандидата");
      }

      if (!reliabilityResponse.ok) {
        throw new Error("Не удалось загрузить индекс надежности кандидата");
      }

      const candidateData = (await candidateResponse.json()) as CandidateProfile;
      const dashboardData = (await dashboardResponse.json()) as CandidateDashboard;
      const reliabilityData = (await reliabilityResponse.json()) as CandidateReliability;

      let photosData: CandidatePhoto[] = [];
      let availabilityData: CandidateAvailabilityItem[] = [];

      if (photosResponse.ok) {
        photosData = (await photosResponse.json()) as CandidatePhoto[];
      } else {
        console.warn("Не удалось загрузить фото кандидата");
      }

      if (availabilityResponse.ok) {
        availabilityData = (await availabilityResponse.json()) as CandidateAvailabilityItem[];
      } else {
        console.warn("Не удалось загрузить availability кандидата");
      }

      setCandidate(candidateData);
      setDashboard(dashboardData);
      setReliability(reliabilityData);
      setPhotos(photosData);
      setAvailability(availabilityData);
    } catch (error) {
      console.error(error);
      setMessage("Не удалось загрузить карточку кандидата");
    } finally {
      setLoading(false);
    }
  }

  async function loadPhotos() {
    try {
      const response = await fetch(`/api/candidates/${id}/photos`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Не удалось загрузить фото кандидата");
      }

      const data = (await response.json()) as CandidatePhoto[];
      setPhotos(data);
    } catch (error) {
      console.error(error);
      setMessage("Не удалось обновить фото кандидата");
    }
  }

  useEffect(() => {
    loadData();
  }, [id]);

  async function deleteCandidatePhoto(photoId: number) {
    const confirmed = window.confirm("Удалить фото кандидата? Это действие нельзя отменить.");

    if (!confirmed) {
      return;
    }

    setMessage("");
    setPhotoDeletingId(photoId);

    try {
      const response = await fetch(`/api/candidates/${id}/photos/${photoId}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail || "Не удалось удалить фото кандидата");
      }

      setMessage("Фото кандидата удалено");
      await loadPhotos();
    } catch (error) {
      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Не удалось удалить фото кандидата");
      }
    } finally {
      setPhotoDeletingId(null);
    }
  }

  async function runMatchAction(matchId: number, action: string, successText: string) {
    setMessage("");

    try {
      const response = await fetch(`/api/matches/${matchId}/${action}`, {
        method: "POST",
      });

      const data = (await response.json()) as { detail?: string };

      if (!response.ok) {
        throw new Error(data.detail || "Не удалось изменить статус");
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

  if (!candidate || !dashboard || !reliability) {
    return <main className="px-4 py-6">Кандидат не найден</main>;
  }

  const reliabilityScore = getReliabilityScore(reliability);

  return (
    <main className="px-4 py-6 space-y-6">
      <div>
        <Link href="/admin/candidates" className="text-sm text-slate-600 underline">
          ← Назад к кандидатам
        </Link>
      </div>

      {message ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          {message}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <p className="text-sm text-slate-500">Карточка кандидата</p>
        <h1 className="mt-1 text-2xl font-semibold">{candidate.full_name}</h1>

        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <div>Роль: {candidate.primary_role}</div>
          <div>Телефон: {candidate.phone}</div>
          <div>Telegram: {candidate.telegram_username || "-"}</div>
          <div>
            Локация: {candidate.city}
            {candidate.district ? `, ${candidate.district}` : ""}
          </div>
          <div>Опыт: {candidate.horeca_experience_months} мес.</div>
          <div>Готовность выйти: {formatReadyToStart(candidate.ready_to_start)}</div>
          <div>Желаемый доход: {formatSalary(candidate.expected_income)}</div>
          <div>Статус профиля: {candidate.is_active ? "Активен" : "Неактивен"}</div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Модерация фото</h2>
            <p className="mt-1 text-sm text-slate-500">
              Фото кандидата, которые используются в профиле и карточках.
            </p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
            {photos.length} фото
          </div>
        </div>

        {photos.length === 0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            У кандидата пока нет фото.
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
                        alt={`Фото кандидата ${photo.id}`}
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
                      {photo.is_main ? (
                        <div className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                          главное
                        </div>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteCandidatePhoto(photo.id)}
                      disabled={photoDeletingId === photo.id}
                      className="w-full rounded-xl border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {photoDeletingId === photo.id ? "Удаляем..." : "Удалить фото"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Индекс надежности</h2>
            <p className="mt-1 text-sm text-slate-500">
              Оценка строится на основе истории приглашений, смен, отказов и невыходов.
            </p>
          </div>
          <div
            className={`rounded-full border px-4 py-2 text-sm font-medium ${reliabilityBadgeClass(
              reliabilityScore
            )}`}
          >
            {reliabilityLabel(reliabilityScore)}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3 sm:col-span-2">
            <div className="text-xs text-slate-500">Индекс надежности</div>
            <div className="mt-1 text-2xl font-semibold">{reliabilityScore} / 100</div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Отработано</div>
            <div className="mt-1 text-xl font-semibold">
              {reliability.worked_count ?? reliability.hired_count ?? 0}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Не дошел</div>
            <div className="mt-1 text-xl font-semibold">{reliability.no_show_count ?? 0}</div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Отмены</div>
            <div className="mt-1 text-xl font-semibold">
              {reliability.cancelled_count ?? reliability.rejected_count ?? 0}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Всего откликов</div>
            <div className="mt-1 text-xl font-semibold">{reliability.total_matches ?? 0}</div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Приглашений</div>
            <div className="mt-1 text-xl font-semibold">{reliability.invited_count ?? 0}</div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Собеседований</div>
            <div className="mt-1 text-xl font-semibold">
              {reliability.interviewed_count ?? 0}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Доступность кандидата</h2>
            <p className="mt-1 text-sm text-slate-500">
              Read-only просмотр дат и слотов, которые указал кандидат.
            </p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
            {availability.length} слотов
          </div>
        </div>

        {availability.length === 0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            Кандидат пока не указал доступность.
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-4 gap-3 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500">
              <div>Дата</div>
              <div>Слот</div>
              <div>Время</div>
              <div>Статус</div>
            </div>

            <div className="divide-y divide-slate-200">
              {availability.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-4 gap-3 px-4 py-3 text-sm text-slate-700"
                >
                  <div>{item.available_date}</div>
                  <div>{formatSlotType(item.slot_type)}</div>
                  <div>{formatAvailabilityTime(item)}</div>
                  <div>{item.is_active === false ? "Неактивен" : "Активен"}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Сводка по кандидату</h2>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Всего откликов</div>
            <div className="mt-1 text-xl font-semibold">{dashboard.total_matches}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Активные</div>
            <div className="mt-1 text-xl font-semibold">{dashboard.active_matches}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Нанят</div>
            <div className="mt-1 text-xl font-semibold">{dashboard.hired_matches}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Отклонен</div>
            <div className="mt-1 text-xl font-semibold">{dashboard.rejected_matches}</div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Отклики и статусы</h2>

        {dashboard.items.length === 0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            У кандидата пока нет откликов.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {dashboard.items.map((item) => (
              <div
                key={item.match_id}
                className="rounded-xl border border-slate-200 p-4 space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium">
                      {item.role} · {item.venue_name}
                    </div>
                    <div className="text-sm text-slate-600">
                      {item.city}
                      {item.district ? `, ${item.district}` : ""}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      Статус отклика: {statusLabel(item.status)}
                    </div>
                    {item.comment ? (
                      <div className="mt-1 text-sm text-slate-500">
                        Комментарий: {item.comment}
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">
                    score {item.match_score ?? "-"}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      runMatchAction(item.match_id, "send", "Кандидат отправлен работодателю")
                    }
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    Отправить
                  </button>
                  <button
                    onClick={() =>
                      runMatchAction(item.match_id, "view", "Работодатель просмотрел кандидата")
                    }
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    Просмотрен
                  </button>
                  <button
                    onClick={() =>
                      runMatchAction(item.match_id, "invite", "Кандидат приглашен")
                    }
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    Пригласить
                  </button>
                  <button
                    onClick={() =>
                      runMatchAction(item.match_id, "interview", "Собеседование отмечено")
                    }
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    Собеседование
                  </button>
                  <button
                    onClick={() =>
                      runMatchAction(item.match_id, "hire", "Кандидат отмечен как нанятый")
                    }
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    Нанять
                  </button>
                  <button
                    onClick={() =>
                      runMatchAction(item.match_id, "reject", "Кандидат отклонен")
                    }
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    Отклонить
                  </button>
                  <button
                    onClick={() =>
                      runMatchAction(item.match_id, "no-show", "Отмечен невыход")
                    }
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    Не дошел
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}