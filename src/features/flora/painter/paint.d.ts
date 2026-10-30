// Tipos mínimos do pintor (o código é JavaScript puro, compartilhado com design/aquarela)
type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export interface GardenBook {
  pages: number | null;
}
export interface GardenOptions {
  seed: number;
  palette: string;
  books: GardenBook[];
  leaves: number;
  /** dias com leitura: viram pétalas no chão */
  days: number;
}
export declare const Arte: {
  livingGarden(g: Ctx, W: number, H: number, opts: GardenOptions): void;
  [name: string]: (g: Ctx, W: number, H: number, opts?: Record<string, unknown>) => void;
};
export declare const Aquarela: {
  granulate(g: Ctx, W: number, H: number, amount?: number): void;
};
