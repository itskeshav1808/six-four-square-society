// Face-aware square crop. Loads face-api.js tinyFaceDetector model once,
// detects the largest face in the image, and returns a square Blob centered
// on the face. If detection fails or no face is found, falls back to a
// center-crop of the shortest side. Output is a 512×512 JPEG.
//
// Displaying the returned Blob (uploaded and served back as an <img>) with
// `object-cover` + `rounded-full` yields a perfect circular headshot with
// the face centered.

import * as faceapi from "face-api.js";

const MODEL_URL = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights";
const TARGET = 512;

let modelLoadPromise: Promise<void> | null = null;

function loadModel(): Promise<void> {
  if (!modelLoadPromise) {
    modelLoadPromise = faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL).catch((err) => {
      modelLoadPromise = null; // allow retry on next upload
      throw err;
    });
  }
  return modelLoadPromise;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

/**
 * Detect the largest face and return a square crop centered on it.
 * Never throws: falls back to center-crop.
 */
export async function cropFaceSquare(file: File): Promise<Blob> {
  const img = await loadImage(file);
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  // Default: center-crop of shortest side
  let side = Math.min(w, h);
  let sx = (w - side) / 2;
  let sy = (h - side) / 2;

  try {
    await loadModel();
    const detection = await faceapi.detectSingleFace(
      img,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 }),
    );
    if (detection) {
      const b = detection.box;
      // Expand the face box by ~60% to include hair/shoulders, then square it.
      const pad = 0.6;
      const cx = b.x + b.width / 2;
      const cy = b.y + b.height / 2;
      const faceSize = Math.max(b.width, b.height) * (1 + pad);
      side = Math.min(faceSize, w, h);
      sx = Math.max(0, Math.min(w - side, cx - side / 2));
      sy = Math.max(0, Math.min(h - side, cy - side / 2));
    }
  } catch (err) {
    // face-api failed to load or run — silently fall back to center crop
    console.warn("[face-crop] falling back to center crop:", err);
  }

  const canvas = document.createElement("canvas");
  canvas.width = TARGET;
  canvas.height = TARGET;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, side, side, 0, 0, TARGET, TARGET);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/jpeg",
      0.9,
    );
  });
}

/**
 * Convert an already-square image URL into a circular PNG data URL suitable
 * for embedding in a PDF (jsPDF doesn't have clipping primitives).
 */
export async function circleMaskDataUrl(imgUrl: string, size = 400): Promise<string | null> {
  try {
    const res = await fetch(imgUrl, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const i = new Image();
      i.onload = () => { URL.revokeObjectURL(url); resolve(i); };
      i.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
      i.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    // The source image should already be square; cover-fit just in case.
    const s = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - s) / 2;
    const sy = (img.naturalHeight - s) / 2;
    ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
    ctx.restore();
    return canvas.toDataURL("image/png");
  } catch (err) {
    console.warn("[circleMaskDataUrl] failed:", err);
    return null;
  }
}
