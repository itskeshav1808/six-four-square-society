import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { PDFDocument } from "pdf-lib";

export type CertInput = {
  recipient: string;
  title: string;
  details?: string;
  tournamentName: string;
  issuedAt?: string | Date;
  qrTargetUrl?: string; // e.g. https://.../players/<slug>
  photoUrl?: string;
};

async function fetchImageDataUrl(url: string): Promise<{ dataUrl: string; format: "PNG" | "JPEG" } | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const format = blob.type.includes("png") ? "PNG" : "JPEG";
    return await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve({ dataUrl: fr.result as string, format });
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function makeCertificatePdf(input: CertInput): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setFillColor(11, 18, 32); doc.rect(0, 0, w, h, "F");
  doc.setDrawColor(212, 175, 55); doc.setLineWidth(4); doc.rect(24, 24, w - 48, h - 48);
  doc.setDrawColor(212, 175, 55); doc.setLineWidth(1); doc.rect(36, 36, w - 72, h - 72);
  doc.setTextColor(212, 175, 55); doc.setFont("times", "bold"); doc.setFontSize(14);
  doc.text("64 SQUARES SOCIETY", w / 2, 90, { align: "center" });
  doc.setFontSize(10); doc.setFont("times", "italic");
  doc.text("Every Move Matters", w / 2, 108, { align: "center" });

  if (input.photoUrl) {
    const img = await fetchImageDataUrl(input.photoUrl);
    if (img) {
      const size = 80;
      const cx = 90;
      const cy = 90;
      doc.setFillColor(212, 175, 55);
      doc.circle(cx, cy, size / 2 + 4, "F");
      doc.setFillColor(11, 18, 32);
      doc.circle(cx, cy, size / 2 + 2, "F");
      try {
        doc.addImage(img.dataUrl, img.format, cx - size / 2, cy - size / 2, size, size);
      } catch {
        // ignore image errors
      }
    }
  }
  doc.setTextColor(255, 255, 255); doc.setFont("times", "bold"); doc.setFontSize(36);
  doc.text(input.title, w / 2, 180, { align: "center" });
  doc.setFont("times", "normal"); doc.setFontSize(14);
  doc.text("This certificate is presented to", w / 2, 220, { align: "center" });
  doc.setFont("times", "bold"); doc.setFontSize(46); doc.setTextColor(212, 175, 55);
  doc.text(input.recipient, w / 2, 285, { align: "center" });
  doc.setTextColor(255, 255, 255); doc.setFont("times", "normal"); doc.setFontSize(14);
  doc.text(`for outstanding participation in ${input.tournamentName}.`, w / 2, 325, { align: "center" });
  if (input.details) doc.text(input.details, w / 2, 355, { align: "center" });

  const issued = input.issuedAt ? new Date(input.issuedAt) : new Date();
  doc.setFontSize(10); doc.setTextColor(180, 180, 180);
  doc.text(issued.toLocaleDateString(), 100, h - 70);
  doc.text("Chief Arbiter", w - 100, h - 70, { align: "right" });

  if (input.qrTargetUrl) {
    try {
      const qrDataUrl = await QRCode.toDataURL(input.qrTargetUrl, {
        margin: 0,
        width: 240,
        color: { dark: "#0b1220", light: "#ffffff" },
      });
      const size = 90;
      const x = w - 36 - size - 20;
      const y = h - 36 - size - 20;
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x - 6, y - 6, size + 12, size + 12, 6, 6, "F");
      doc.addImage(qrDataUrl, "PNG", x, y, size, size);
      doc.setFontSize(8); doc.setTextColor(180, 180, 180);
      doc.text("Scan for live player profile", x + size / 2, y + size + 16, { align: "center" });
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
