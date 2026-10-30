// Pinta o jardim vivo fora da tela, sem travar o app enquanto as camadas de tinta se acumulam.
import { paintGarden } from "./painter/garden";
import type { GardenOptions } from "./painter/art.js";

self.onmessage = async (e: MessageEvent<{ id: number; opts: GardenOptions }>) => {
  const canvas = new OffscreenCanvas(1, 1);
  paintGarden(canvas, e.data.opts);
  const blob = await canvas.convertToBlob({ type: "image/webp", quality: 0.78 });
  (self as unknown as Worker).postMessage({ id: e.data.id, blob });
};
