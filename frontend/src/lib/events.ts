import { statusLabel } from "@/lib/status";

export function eventTypeLabel(eventType: string): string {
  const map: Record<string, string> = {
    candidate_created: "Кандидат создан",
    match_created: "Match создан",
    candidate_applied: "Кандидат откликнулся",
    match_status_changed: "Статус отклика изменен",
  };

  return map[eventType] || eventType;
}

export function eventSourceLabel(eventSource?: string | null): string {
  const map: Record<string, string> = {
    api: "API",
    candidate_api: "Кандидатский интерфейс",
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
      return `Match #${matchId}: статус изменен с «${statusLabel(
        fromStatus
      )}» на «${statusLabel(toStatus)}»`;
    }
  }

  if (eventType === "match_created") {
    const match = comment.match(/^match_id=(\d+);\s*score=(\d+)$/i);
    if (match) {
      const [, matchId, score] = match;
      return `Match #${matchId}: создан со score ${score}`;
    }
  }

  if (eventType === "candidate_applied") {
    const match = comment.match(/^match_id=(\d+)$/i);
    if (match) {
      const [, matchId] = match;
      return `Отклик создан. Match #${matchId}`;
    }
  }

  return comment;
}