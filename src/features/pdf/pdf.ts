import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export type PdfDocument = pdfjs.PDFDocumentProxy;

export async function openPdf(data: ArrayBuffer | Uint8Array): Promise<PdfDocument> {
  return pdfjs.getDocument({ data: data instanceof Uint8Array ? data : new Uint8Array(data) }).promise;
}

/** Título, autor, páginas e a primeira página como capa. */
export async function pdfMetadata(buffer: ArrayBuffer) {
  const doc = await openPdf(buffer.slice(0));
  try {
    const meta = await doc.getMetadata().catch(() => null);
    const info = (meta?.info ?? {}) as { Title?: string; Author?: string; CreationDate?: string };
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: 600 / base.width });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    await page.render({ canvas, viewport }).promise;
    const cover = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    const year = info.CreationDate?.match(/D:(\d{4})/)?.[1];
    return {
      title: info.Title?.trim() || null,
      authors: info.Author ? info.Author.split(/[;,&]| e /).map((a) => a.trim()).filter(Boolean) : [],
      pageCount: doc.numPages,
      year: year ? Number(year) : null,
      cover,
    };
  } finally {
    doc.loadingTask.destroy();
  }
}
