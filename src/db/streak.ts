export const dayKey = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Sequência gentil: um dia sem leitura entre dois dias lidos não quebra a sequência
 * (até 1 dia de descanso por semana). Dois dias seguidos sem ler, aí sim recomeça.
 */
export function computeStreak(days: Set<string>, today = new Date()): number {
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  // Hoje ainda pode ler: se não leu, começa a contar de ontem
  if (!days.has(dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  let restUsed = 0;
  let sinceRest = 0;
  for (let i = 0; i < 3650; i++) {
    const key = dayKey(cursor.getTime());
    if (days.has(key)) {
      streak++;
      sinceRest++;
      if (sinceRest >= 7) restUsed = 0;
    } else {
      // Descanso permitido só se o dia anterior foi lido e ainda há descanso na semana
      const prev = new Date(cursor);
      prev.setDate(prev.getDate() - 1);
      if (streak > 0 && restUsed === 0 && days.has(dayKey(prev.getTime()))) {
        restUsed = 1;
        sinceRest = 0;
      } else break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

