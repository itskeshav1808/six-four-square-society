/**
 * Move feedback layer: synthesized Web Audio cues + optional haptics.
 *
 * Deliberately independent from the anthem player so muting one never affects
 * the other. Nothing plays before the first user gesture (autoplay policy).
 */

const MUTE_KEY = "64s-sfx-muted";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let gestured = false;
let muted = false;

export function isSfxMuted() {
  return muted;
}

export function initSfx() {
  if (typeof window === "undefined") return;
  muted = sessionStorage.getItem(MUTE_KEY) === "1";
  const onGesture = () => {
    gestured = true;
    ensureCtx()?.resume().catch(() => {});
  };
  window.addEventListener("pointerdown", onGesture, { passive: true, once: true });
  window.addEventListener("keydown", onGesture, { once: true });
  window.addEventListener("touchstart", onGesture, { passive: true, once: true });
  window.addEventListener("wheel", onGesture, { passive: true, once: true });
  window.addEventListener("scroll", onGesture, { passive: true, once: true });
}

export function setSfxMuted(next: boolean) {
  muted = next;
  if (typeof window !== "undefined") sessionStorage.setItem(MUTE_KEY, next ? "1" : "0");
  if (master) master.gain.value = next ? 0 : 0.5;
}

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  }
  return ctx;
}

/** Dry percussive wooden click: short noise burst through a band-pass. */
function click(freq: number, dur: number, gain: number, delay = 0) {
  const ac = ensureCtx();
  if (!ac || !master) return;
  const t0 = ac.currentTime + delay;
  const len = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const decay = Math.pow(1 - i / len, 3);
    data[i] = (Math.random() * 2 - 1) * decay;
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = freq;
  bp.Q.value = 1.6;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(bp).connect(g).connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

function tone(freq: number, dur: number, gain: number, delay = 0, type: OscillatorType = "sine") {
  const ac = ensureCtx();
  if (!ac || !master) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator === "undefined") return;
  const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  if (typeof nav.vibrate !== "function") return;
  try {
    nav.vibrate(pattern);
  } catch {
    /* progressive enhancement only */
  }
}

export type MoveKind = "move" | "capture" | "mate";

export function playMoveFeedback(kind: MoveKind) {
  if (!gestured) return;
  if (!muted) {
    if (kind === "move") {
      click(760, 0.09, 0.5);
      tone(150, 0.07, 0.12, 0, "triangle");
    } else if (kind === "capture") {
      click(620, 0.1, 0.6);
      click(240, 0.14, 0.45, 0.045);
      tone(95, 0.16, 0.2, 0.04, "sine");
    } else {
      tone(392, 0.55, 0.16);
      tone(523.25, 0.6, 0.14, 0.09);
      tone(659.25, 0.7, 0.12, 0.18);
    }
  }
  vibrate(kind === "move" ? 12 : kind === "capture" ? [12, 18, 12] : 45);
}

/** Almost subliminal tick used when the gallery stage changes. */
export function playTick() {
  if (!gestured || muted) return;
  click(1400, 0.05, 0.14);
}
