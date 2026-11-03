import { db } from "../../db/db";
import { dayKey } from "../../db/streak";
import { platform } from "../../lib/platform";
import { useSettings } from "../../lib/settings";

/**
 * Lembrete diário de leitura. O Android dispara notificações agendadas mesmo com o app
 * fechado, mas o texto é fixo na hora do agendamento: por isso, sempre que o app abre
 * ou fecha, reagendamos os próximos dias com o livro e as páginas do momento. Se ela
 * já leu hoje, o lembrete de hoje nem aparece.
 */

const FIRST_ID = 4100;
const DAYS = 7;
const CHANNEL = "lembrete";

export const remindersSupported = () => platform === "android";

async function api() {
  return import("@tauri-apps/plugin-notification");
}

/** Pede permissão de notificação (Android 13+). Devolve se pode notificar. */
export async function ensurePermission(): Promise<boolean> {
  if (!remindersSupported()) return false;
  const n = await api();
  if (await n.isPermissionGranted()) return true;
  return (await n.requestPermission()) === "granted";
}

interface Current {
  title: string;
  page: number | null;
  total: number | null;
}

/** O livro em andamento mais recente, com a página onde parou */
async function currentBook(): Promise<Current | null> {
  const reading = (await db.books.where("status").equals("lendo").toArray()).filter((b) => !b.deletedAt);
  if (!reading.length) return null;
  const positions = await db.positions.bulkGet(reading.map((b) => b.id));
  const withPos = reading.map((b, i) => ({ b, p: positions[i] })).sort((x, y) => (y.p?.updatedAt ?? y.b.updatedAt) - (x.p?.updatedAt ?? x.b.updatedAt));
  const { b, p } = withPos[0];
  const total = b.pageCount;
  return { title: b.title, total, page: total && p ? Math.max(1, Math.round(p.fraction * total)) : null };
}

/** Mensagens gentis, que variam de um dia para o outro */
function message(day: number, current: Current | null, name: string | null, pagesToday: number) {
  const hi = name ? `${name}, ` : "";
  if (!current) {
    const idle = [
      `${hi}que tal escolher o próximo livro hoje?`,
      "Uma página já é leitura. Sua estante está esperando.",
      "Um capítulo antes de dormir? O Sépia guardou seu lugar.",
    ];
    return { title: "Hora da leitura", body: idle[day % idle.length] };
  }
  const left = current.total && current.page ? current.total - current.page : null;
  const where = current.page && current.total ? `página ${current.page} de ${current.total}` : null;
  const lines = [
    where ? `Você parou na ${where} de ${current.title}. Mais algumas hoje?` : `${current.title} está esperando por você.`,
    left !== null && left > 0 ? `Faltam ${left} páginas para terminar ${current.title}.` : `${hi}que tal um capítulo de ${current.title}?`,
    `${hi}uns minutinhos com ${current.title} e o seu jardim agradece.`,
    pagesToday > 0 ? `Ontem foram ${pagesToday} páginas. Bora manter o ritmo?` : `Um pouquinho de ${current.title} hoje mantém a sequência viva.`,
  ];
  return { title: name ? `Hora da leitura, ${name}` : "Hora da leitura", body: lines[day % lines.length] };
}

let running: Promise<void> | null = null;

/** Cancela e reagenda os lembretes dos próximos dias (chamar sem medo: é idempotente) */
export function rescheduleReminders(): Promise<void> {
  running = (running ?? Promise.resolve()).then(doReschedule).catch(() => {});
  return running;
}

async function doReschedule() {
  if (!remindersSupported()) return;
  const n = await api();
  const ids = Array.from({ length: DAYS }, (_, i) => FIRST_ID + i);
  await n.cancel(ids).catch(() => {});
  const { reminderEnabled, reminderTime, name } = useSettings.getState();
  if (!reminderEnabled || !(await n.isPermissionGranted())) return;

  await n
    .createChannel({ id: CHANNEL, name: "Lembrete de leitura", description: "Um lembrete por dia, no horário que você escolher", importance: n.Importance.Default })
    .catch(() => {});

  const [h, m] = reminderTime.split(":").map(Number);
  const today = dayKey(Date.now());
  const sessionsToday = await db.sessions.where("day").equals(today).toArray();
  const readToday = sessionsToday.some((s) => !s.deletedAt && (s.pages > 0 || s.seconds >= 60));
  const pagesToday = sessionsToday.reduce((sum, s) => sum + (s.deletedAt ? 0 : s.pages), 0);
  const current = await currentBook();

  for (let i = 0; i < DAYS; i++) {
    const at = new Date();
    at.setDate(at.getDate() + i);
    at.setHours(h, m, 0, 0);
    if (at.getTime() <= Date.now() + 30_000) continue;
    if (i === 0 && readToday) continue;
    const { title, body } = message(at.getDate(), current, name, i === 1 ? pagesToday : 0);
    n.sendNotification({ id: ids[i], channelId: CHANNEL, title, body, schedule: n.Schedule.at(at, false, true) });
  }
}
