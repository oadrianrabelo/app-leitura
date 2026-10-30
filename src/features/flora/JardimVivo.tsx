import { useEffect, useMemo, useState } from "react";
import type { Book, Reading } from "../../db/types";
import { safeStorage } from "../../lib/storage";
import { useFloraPalette } from "../../components/Botanical";
import type { GardenOptions } from "./painter/art.js";
import "./JardimVivo.css";

const KEY = "sepia.jardim";

interface Props {
  finished: { reading: Reading; book: Book }[];
  streak: number;
  readDays: number;
}

/** Semente estável da leitora: muda só se a biblioteca começar do zero */
function seedFrom(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (Math.abs(h) % 2147483646) + 1;
}

let worker: Worker | null = null;
let nextId = 0;

async function render(opts: GardenOptions): Promise<Blob> {
  if (typeof OffscreenCanvas !== "undefined" && typeof Worker !== "undefined") {
    worker ??= new Worker(new URL("./garden.worker.ts", import.meta.url), { type: "module" });
    const id = ++nextId;
    return new Promise((resolve, reject) => {
      const onMessage = (e: MessageEvent<{ id: number; blob: Blob }>) => {
        if (e.data.id !== id) return;
        worker!.removeEventListener("message", onMessage);
        resolve(e.data.blob);
      };
      worker!.addEventListener("message", onMessage);
      worker!.addEventListener("error", reject, { once: true });
      worker!.postMessage({ id, opts });
    });
  }
  // Sem OffscreenCanvas: pinta na thread principal, quando o app estiver ocioso
  const { paintGarden } = await import("./painter/garden");
  await new Promise((r) => setTimeout(r, 300));
  const canvas = document.createElement("canvas");
  paintGarden(canvas, opts);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/webp", 0.78));
}

const toDataUrl = (blob: Blob) =>
  new Promise<string>((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.readAsDataURL(blob);
  });

function loadCache(): { key: string; image: string } | null {
  try {
    return JSON.parse(safeStorage.get(KEY) ?? "null");
  } catch {
    return null;
  }
}

/**
 * O jardim da leitora: pintado em aquarela no próprio aparelho, ganha um cacho de
 * glicínia para cada livro terminado. Fica guardado e só é repintado quando muda.
 */
export function JardimVivo({ finished, streak, readDays }: Props) {
  const palette = useFloraPalette();
  const opts = useMemo<GardenOptions>(() => {
    const first = finished[0]?.book.id ?? "sepia";
    return {
      seed: seedFrom(first),
      palette,
      books: finished.map((f) => ({ pages: f.book.pageCount })),
      leaves: streak,
      days: readDays,
    };
  }, [finished, palette, streak, readDays]);
  const key = useMemo(() => JSON.stringify([opts.seed, opts.palette, opts.books.map((b) => b.pages), Math.min(40, opts.leaves), Math.min(140, opts.days)]), [opts]);
  const [image, setImage] = useState<string | null>(() => loadCache()?.image ?? null);
  const [growing, setGrowing] = useState(false);

  useEffect(() => {
    const cached = loadCache();
    if (cached?.key === key) {
      setImage(cached.image);
      return;
    }
    let alive = true;
    setGrowing(true);
    render(opts)
      .then(toDataUrl)
      .then((url) => {
        if (!alive) return;
        safeStorage.set(KEY, JSON.stringify({ key, image: url }));
        setImage(url);
      })
      .catch(() => {})
      .finally(() => alive && setGrowing(false));
    return () => {
      alive = false;
    };
  }, [key, opts]);

  const n = finished.length;
  return (
    <section className="jardim-vivo">
      <div className="jardim-vivo-art">
        {image && <img key={image.length} src={image} alt="" draggable={false} />}
        {growing && <span className="jardim-vivo-growing">{image ? "Florescendo…" : "Plantando seu jardim…"}</span>}
      </div>
      <div className="jardim-vivo-text">
        <strong>Seu jardim</strong>
        <span>
          {n === 0
            ? "Termine seu primeiro livro e a primeira flor desabrocha."
            : `${n} ${n === 1 ? "cacho" : "cachos"} de glicínia, um para cada livro terminado, e uma pétala no chão para cada dia de leitura.`}
        </span>
      </div>
    </section>
  );
}
