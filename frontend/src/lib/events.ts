import { statusLabel } from "@/lib/status";

export function eventTypeLabel(eventType: string): string {
  const map: Record<string, string> = {
    candidate_created: "Кандидат создан",
    match_created: "Совпадение создано",
    candidate_applied: "Кандидат откликнулся",
    match_status_changed: "Статус отклика изменен",
  };

  return map[eventType] || eventType;
}

export function eventSourceLabel(eventSource?: string | null): string {
  const map: Record<string, string> = {
    api: "Система",
    candidate_api: "Интерфейс кандидата",
    manual_test: "Ручной тест",
  };

  if (!eventSource) return "-";
  return map[eventSource] || eventSource;
}

export function formatEventComment(
  eventType: string,
  comment?: string | null
): string {
  if (!comment) return "-";

  if (eventType === "match_status_changed") {
    const match = comment.match(/^match_id=(\d+);\s*([a-z_]+)\s*->\s*([a-z_]+)$/i);
    if (match) {
      const [, matchId, fromStatus, toStatus] = match;
      return `Отклик #${matchId}: статус изменен с «${statusLabel(
        fromStatus
      )}» на «${statusLabel(toStatus)}»`;
    }
  }

  if (eventType === "match_created") {
    const match = comment.match(/^match_id=(\d+);\s*score=(\d+)$/i);
    if (match) {
      const [, matchId, score] = match;
      return `Отклик #${matchId}: создан со score ${score}`;
    }
  }

  if (eventType === "candidate_applied") {
    const match = comment.match(/^match_id=(\d+)$/i);
    if (match) {
      const [, matchId] = match;
      return `Создан отклик #${matchId}`;
    }
  }

  return comment;
}

export function reliabilityLabel(score: number): string {
  if (score >= 80) return "Высокая";
  if (score >= 60) return "Хорошая";
  if (score >= 40) return "Средняя";
  return "Низкая";
}

export function reliabilityBadgeClass(score: number): string {
  if (score >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (score >= 60) return "bg-sky-50 text-sky-700 border-sky-200";
  if (score >= 40) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
}