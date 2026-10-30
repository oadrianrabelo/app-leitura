import type { AchievementState } from "./achievements";

/** Fitas de marcador colecionáveis: cada uma destrava com um nível de conquista. */
export interface Ribbon {
  id: string;
  name: string;
  /** [conquista, nível] que destrava; null = já vem com o app */
  unlock: [string, number] | null;
}

export const RIBBONS: Ribbon[] = [
  { id: "fita", name: "Clássica", unlock: null },
  { id: "glicinia", name: "Glicínia", unlock: ["livros", 0] },
  { id: "aurora", name: "Aurora", unlock: ["aurora", 0] },
  { id: "noturna", name: "Noturna", unlock: ["coruja", 0] },
  { id: "renda", name: "Renda", unlock: ["releitura", 0] },
  { id: "chama", name: "Chama", unlock: ["constancia", 1] },
  { id: "listrada", name: "Listrada", unlock: ["fimdesemana", 1] },
  { id: "veludo", name: "Veludo", unlock: ["maratona", 1] },
  { id: "dourada", name: "Dourada", unlock: ["livros", 2] },
  { id: "marinha", name: "Marinha", unlock: ["semanas", 2] },
  { id: "folhagem", name: "Folhagem", unlock: ["constancia", 3] },
  { id: "colorida", name: "Arco-íris", unlock: ["livros", 3] },
];

export function ribbonUnlocked(r: Ribbon, achievements: AchievementState[]): boolean {
  if (!r.unlock) return true;
  const a = achievements.find((x) => x.id === r.unlock![0]);
  return !!a && a.level > r.unlock[1];
}

/** Fitas que um nível de conquista destrava */
export const ribbonsFor = (id: string, tier: number) => RIBBONS.filter((r) => r.unlock?.[0] === id && r.unlock[1] === tier);
