import { useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Sidebar, TabBar, type TabId } from "./components/Navigation";
import { Hoje } from "./screens/Hoje";
import { Biblioteca } from "./screens/Biblioteca";
import { Conquistas } from "./screens/Conquistas";
import { Ajustes } from "./screens/Ajustes";
import { UpdateSheet } from "./features/updates/UpdateSheet";
import { NovidadesSheet } from "./features/novidades/NovidadesSheet";
import { useUpdates } from "./features/updates/updates";
import { useApplyTheme } from "./lib/theme";
import { useSettings } from "./lib/settings";
import "./App.css";

export default function App() {
  useApplyTheme();
  const [tab, setTab] = useState<TabId>("hoje");
  const scrollRef = useRef<HTMLElement>(null);
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
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setTab(next);
    scrollRef.current?.scrollTo({ top: 0 });
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="app">
        <Sidebar active={tab} onChange={changeTab} />
        <main className="app-main" ref={scrollRef}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {tab === "hoje" && <Hoje onOpenLibrary={() => changeTab("biblioteca")} />}
              {tab === "biblioteca" && <Biblioteca />}
              {tab === "conquistas" && <Conquistas />}
              {tab === "ajustes" && <Ajustes />}
            </motion.div>
          </AnimatePresence>
        </main>
        <TabBar active={tab} onChange={changeTab} />
        <UpdateSheet />
        <NovidadesSheet />
      </div>
    </MotionConfig>
  );
}
