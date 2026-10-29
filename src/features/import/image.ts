/** Reduz a capa para no máximo `maxWidth` e devolve um JPEG leve + a cor média. */
export async function processCover(blob: Blob, maxWidth = 600): Promise<{ blob: Blob; tint: string } | null> {
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, maxWidth / bitmap.width);
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    // Cor média de uma amostra pequena
    const sample = document.createElement("canvas");
    sample.width = sample.height = 8;
    const sctx = sample.getContext("2d")!;
    sctx.drawImage(canvas, 0, 0, 8, 8);
    const px = sctx.getImageData(0, 0, 8, 8).data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < px.length; i += 4) {
      r += px[i];
      g += px[i + 1];
      b += px[i + 2];
    }
    const n = px.length / 4;
    const tint = `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`;

    const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    return out ? { blob: out, tint } : null;
  } catch {
    return null;
  }
}
