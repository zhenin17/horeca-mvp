export function statusLabel(status: string): string {
    const map: Record<string, string> = {
      shortlist: "В шортлисте",
      sent: "Отправлен работодателю",
      viewed: "Просмотрен работодателем",
      invited: "Приглашен",
      interviewed: "Собеседование",
      offered: "Оффер",
      hired: "Нанят",
      rejected: "Отклонен",
      no_show: "Не дошел",
  
      new: "Новая",
      active: "Активна",
      closed: "Закрыта",
      archived: "В архиве",
    };
  
    return map[status] || status;
  }