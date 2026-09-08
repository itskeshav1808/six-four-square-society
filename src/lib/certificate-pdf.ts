import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { PDFDocument } from "pdf-lib";
import { circleMaskDataUrl } from "./face-crop";
import excellenceTpl from "@/assets/cert-excellence.png.asset.json";
import participationTpl from "@/assets/cert-participation.jpg.asset.json";

export type CertInput = {
  recipient: string;
  title: string;
  details?: string;
  tournamentName: string;
  issuedAt?: string | Date;
  qrTargetUrl?: string; // e.g. https://.../players/<slug>
  photoUrl?: string;
  /** Age/rating category printed on the "of category ____" line. */
  category?: string;
  /** Rank badge text (Excellence design only). */
  rank?: string;
  /** Which artwork to use. Anything other than "participation" uses Excellence. */
  certType?: string;
};

/** Template artwork is 1549x1080 (aspect 1.434). */
const TPL_W = 1549;
const TPL_H = 1080;

type Layout = {
  url: string;
  format: "PNG" | "JPEG";
  /** photo circle: center + diameter, as fractions of template width/height */
  photo: { cx: number; cy: number; d: number };
  /** blank line centers for the recipient name and category */
  name: { cx: number; cy: number };
  category: { cx: number; cy: number };
  rank?: { cx: number; cy: number };
};

const LAYOUTS: Record<"excellence" | "participation", Layout> = {
  excellence: {
    url: excellenceTpl.url,
    format: "PNG",
    photo: { cx: 0.157, cy: 0.386, d: 0.155 },
    name: { cx: 0.607, cy: 0.567 },
    category: { cx: 0.497, cy: 0.605 },
    rank: { cx: 0.888, cy: 0.5 },
  },
  participation: {
    url: participationTpl.url,
    format: "JPEG",
    photo: { cx: 0.198, cy: 0.483, d: 0.135 },
    name: { cx: 0.705, cy: 0.511 },
    category: { cx: 0.588, cy: 0.559 },
  },
};



async function fetchImageDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

const tplCache = new Map<string, string | null>();
async function template(url: string) {
  if (!tplCache.has(url)) tplCache.set(url, await fetchImageDataUrl(url));
  return tplCache.get(url) ?? null;
}

/** Shrink font size until the text fits the given width. */
function fitText(doc: jsPDF, text: string, maxWidth: number, startSize: number, minSize = 9) {
  let size = startSize;
  doc.setFontSize(size);
  while (size > minSize && doc.getTextWidth(text) > maxWidth) {
    size -= 0.5;
    doc.setFontSize(size);
  }
}

export async function makeCertificatePdf(input: CertInput): Promise<jsPDF> {
  const kind = (input.certType ?? "").toLowerCase() === "participation" ? "participation" : "excellence";
  const layout = LAYOUTS[kind];

  const w = 841.89; // A4 landscape width in pt
  const h = Math.round((w * TPL_H) / TPL_W); // keep artwork aspect
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: [w, h] });

  const bg = await template(layout.url);
  if (bg) {
    try {
      doc.addImage(bg, layout.format, 0, 0, w, h);
    } catch {
      // fall through to plain background
    }
  }
  if (!bg) {
    doc.setFillColor(248, 244, 234);
    doc.rect(0, 0, w, h, "F");
  }

  // Participant photo, circle-masked into the artwork's empty frame.
  if (input.photoUrl) {
    const circular = await circleMaskDataUrl(input.photoUrl, 512);
    if (circular) {
      const size = layout.photo.d * w;
      const cx = layout.photo.cx * w;
      const cy = layout.photo.cy * h;
      try {
        doc.addImage(circular, "PNG", cx - size / 2, cy - size / 2, size, size);
      } catch {
        // ignore image errors
      }
    }
  }

  // Recipient name on the first blank line.
  doc.setFont("times", "bold");
  doc.setTextColor(59, 20, 92);
  fitText(doc, input.recipient, 0.28 * w, 20);
  doc.text(input.recipient, layout.name.cx * w, layout.name.cy * h, { align: "center" });

  // Category on the second blank line.
  if (input.category) {
    doc.setFont("times", "normal");
    fitText(doc, input.category, 0.2 * w, 15);
    doc.text(input.category, layout.category.cx * w, layout.category.cy * h, { align: "center" });
  }

  // Rank badge (Excellence artwork only).
  if (input.rank && layout.rank) {
    doc.setFont("times", "bold");
    fitText(doc, input.rank, 0.09 * w, 17);
    doc.text(input.rank, layout.rank.cx * w, layout.rank.cy * h, { align: "center" });
  }

  // QR to the live player profile, tucked into the lower-right corner.
  if (input.qrTargetUrl) {
    try {
      const qrDataUrl = await QRCode.toDataURL(input.qrTargetUrl, {
        margin: 0,
        width: 240,
        color: { dark: "#2b0f45", light: "#ffffff" },
      });
      const size = 54;
      const x = w - size - 30;
      const y = h - size - 26;
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x - 4, y - 4, size + 8, size + 8, 4, 4, "F");
      doc.addImage(qrDataUrl, "PNG", x, y, size, size);
    } catch {
      // ignore QR failures
    }
  }
  return doc;
}

export async function mergeCertificatesToMaster(pdfs: jsPDF[]): Promise<Blob> {
  const master = await PDFDocument.create();
  for (const doc of pdfs) {
    const bytes = doc.output("arraybuffer");
    const src = await PDFDocument.load(bytes);
    const copied = await master.copyPages(src, src.getPageIndices());
    copied.forEach((p) => master.addPage(p));
  }
  const out = await master.save();
  // pdf-lib returns Uint8Array; wrap the underlying buffer to satisfy Blob typings
  return new Blob([out.buffer as ArrayBuffer], { type: "application/pdf" });
}
