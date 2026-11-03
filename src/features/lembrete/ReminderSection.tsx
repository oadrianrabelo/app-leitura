import { useState } from "react";
import { Section } from "../../components/Page";
import { Icon } from "../../components/Icon";
import { useSettings } from "../../lib/settings";
import { ensurePermission, remindersSupported, rescheduleReminders } from "./reminder";

/** Ajustes → Lembrete: uma notificação por dia, no horário que ela escolher */
export function ReminderSection() {
  const { reminderEnabled, reminderTime, setReminder } = useSettings();
  const [denied, setDenied] = useState(false);
  if (!remindersSupported()) return null;

  const toggle = async (on: boolean) => {
    setDenied(false);
    if (on && !(await ensurePermission())) {
      setDenied(true);
      return;
    }
    setReminder(on);
    rescheduleReminders();
  };

  return (
    <Section title="Lembrete">
      <div className="group">
        <label className="row">
          <span className="row-icon">
            <Icon name="calendar" size={18} />
          </span>
          <span className="row-label sync-who">
            Lembrete de leitura
            <small>Um aviso por dia, com o livro e a página onde você parou. Se já leu no dia, ele não aparece.</small>
          </span>
          <input type="checkbox" className="switch" checked={reminderEnabled} onChange={(e) => toggle(e.target.checked)} />
        </label>
        {reminderEnabled && (
          <label className="row">
            <span className="row-icon">
              <Icon name="moon" size={18} />
            </span>
            <span className="row-label">Horário</span>
            <input
              type="time"
              className="reminder-time"
              value={reminderTime}
              onChange={(e) => {
                if (!e.target.value) return;
                setReminder(true, e.target.value);
                rescheduleReminders();
              }}
            />
          </label>
        )}
      </div>
      {denied && (
        <p className="data-message is-error">
          O Android não deixou o Sépia mandar notificações. Libere em Configurações → Apps → Sépia → Notificações.
        </p>
      )}
    </Section>
  );
}
