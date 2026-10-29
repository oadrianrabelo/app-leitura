import { motion } from "motion/react";
import { Icon, type IconName } from "./Icon";
import "./Navigation.css";

export type TabId = "hoje" | "biblioteca" | "conquistas" | "ajustes";

export const TABS: { id: TabId; label: string; icon: IconName }[] = [
  { id: "hoje", label: "Hoje", icon: "book" },
  { id: "biblioteca", label: "Biblioteca", icon: "library" },
  { id: "conquistas", label: "Conquistas", icon: "award" },
  { id: "ajustes", label: "Ajustes", icon: "settings" },
];

interface NavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

/** Barra inferior no celular. */
export function TabBar({ active, onChange }: NavProps) {
  return (
    <nav className="tabbar" aria-label="Navegação principal">
      {TABS.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            className={`tabbar-item${selected ? " is-active" : ""}`}
            onClick={() => onChange(tab.id)}
            aria-current={selected ? "page" : undefined}
          >
            {selected && (
              <motion.span
                layoutId="tabbar-pill"
                className="tabbar-pill"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <motion.span
              className="tabbar-icon"
              animate={{ y: selected ? -1 : 0, scale: selected ? 1.04 : 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <Icon name={tab.icon} size={22} strokeWidth={selected ? 2 : 1.75} />
            </motion.span>
            <span className="tabbar-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/** Barra lateral em telas largas (desktop). */
export function Sidebar({ active, onChange }: NavProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src="/icon.svg" alt="" width={28} height={28} />
        <span>Sépia</span>
      </div>
      <nav aria-label="Navegação principal">
        {TABS.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              className={`sidebar-item${selected ? " is-active" : ""}`}
              onClick={() => onChange(tab.id)}
              aria-current={selected ? "page" : undefined}
            >
              {selected && (
                <motion.span
                  layoutId="sidebar-pill"
                  className="sidebar-pill"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
              <Icon name={tab.icon} size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
