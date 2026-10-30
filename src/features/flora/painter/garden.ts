import { Arte, type GardenOptions } from "./art.js";
import { Aquarela } from "./paint.js";

export const GARDEN_W = 1000;
export const GARDEN_H = 760;

/** Pinta o jardim vivo num canvas (comum ou fora da tela) */
export function paintGarden(canvas: HTMLCanvasElement | OffscreenCanvas, opts: GardenOptions) {
  canvas.width = GARDEN_W;
  canvas.height = GARDEN_H;
  const g = canvas.getContext("2d") as CanvasRenderingContext2D;
  Arte.livingGarden(g, GARDEN_W, GARDEN_H, opts);
  Aquarela.granulate(g, GARDEN_W, GARDEN_H, 0.16);
}
