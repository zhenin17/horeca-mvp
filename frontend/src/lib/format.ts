export function formatReadyToStart(value?: string | null): string {
    const map: Record<string, string> = {
      today: "Сегодня",
      tomorrow: "Завтра",
      "3days": "В течение 3 дней",
      "3_days": "В течение 3 дней",
      week: "В течение недели",
      "сегодня": "Сегодня",
      "завтра": "Завтра",
      "3 дня": "В течение 3 дней",
      "неделя": "В течение недели",
    };
  
    if (!value) return "-";
    return map[value] || value;
  }
  
  export function formatSalary(value?: string | null): string {
    if (!value) return "-";
  
    let result = value;
  
    result = result.replace(" shift", " за смену");
    result = result.replace("/shift", " за смену");
    result = result.replace(" per shift", " за смену");
  
    return result;
  }