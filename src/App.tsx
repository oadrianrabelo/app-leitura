import { useEffect, useRef, useState, type ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { Sidebar, TabBar, type TabId } from "./components/Navigation";
import { Hoje } from "./screens/Hoje";
import { Biblioteca } from "./screens/Biblioteca";
import { Conquistas } from "./screens/Conquistas";
import { Ajustes } from "./screens/Ajustes";
import { UpdateSheet } from "./features/updates/UpdateSheet";
import { NovidadesSheet } from "./features/novidades/NovidadesSheet";
import { ImportSheet } from "./features/import/ImportSheet";
import { AddSheet } from "./features/library/AddSheet";
import { BookDetail } from "./features/library/BookDetail";
import { PhysicalSheet } from "./features/physical/PhysicalSheet";
import { Reader } from "./features/reader/Reader";
import { useUpdates } from "./features/updates/updates";
import { useApplyTheme } from "./lib/theme";
import { useSettings } from "./lib/settings";
import "./App.css";

/**
 * Cada aba fica montada depois da primeira visita: trocar de aba é só mostrar/esconder,
 * sem refazer a tela. Cada uma guarda a própria rolagem.
 */
function TabPanel({ active, children, panelRef }: { active: boolean; children: ReactNode; panelRef?: (el: HTMLElement | null) => void }) {
  const [visited, setVisited] = useState(active);
  useEffect(() => {
    if (active) setVisited(true);
  }, [active]);
  if (!visited) return null;
  return (
    <section className={`tab-panel${active ? " is-active" : ""}`} hidden={!active} ref={panelRef}>
      {children}
    </section>
  );
}

export default function App() {
  useApplyTheme();
  const [tab, setTab] = useState<TabId>("hoje");
  const panels = useRef(new Map<TabId, HTMLElement>());
  const autoCheck = useSettings((s) => s.autoCheckUpdates);
  const checkUpdates = useUpdates((s) => s.check);

  useEffect(() => {
    if (!autoCheck) return;
    // Espera o app assentar antes de ir à rede.
    const t = setTimeout(() => checkUpdates({ silent: true }), 2500);
    return () => clearTimeout(t);
  }, [autoCheck, checkUpdates]);

  const changeTab = (next: TabId) => {
    if (next === tab) {
      panels.current.get(tab)?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setTab(next);
  };

  const panelRef = (id: TabId) => (el: HTMLElement | null) => {
    if (el) panels.current.set(id, el);
    else panels.current.delete(id);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="app">
        <Sidebar active={tab} onChange={changeTab} />
        <main className="app-main">
          <TabPanel active={tab === "hoje"} panelRef={panelRef("hoje")}>
            <Hoje onOpenLibrary={() => changeTab("biblioteca")} />
          </TabPanel>
          <TabPanel active={tab === "biblioteca"} panelRef={panelRef("biblioteca")}>
            <Biblioteca />
          </TabPanel>
          <TabPanel active={tab === "conquistas"} panelRef={panelRef("conquistas")}>
            <Conquistas />
          </TabPanel>
          <TabPanel active={tab === "ajustes"} panelRef={panelRef("ajustes")}>
            <Ajustes />
          </TabPanel>
        </main>
        <TabBar active={tab} onChange={changeTab} />
        <Reader />
        <BookDetail />
        <AddSheet />
        <ImportSheet />
        <PhysicalSheet />
        <UpdateSheet />
        <NovidadesSheet />
      </div>
    </MotionConfig>
  );
}
