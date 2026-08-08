/**
 * Configuration + snapshot engine for the scroll-driven chess board layer.
 *
 * Everything here is data-driven: themes, the scripted game and the per-section
 * disable list all come from `site_content` rows so the Content Manager can
 * change them with no deploy.
 */

export type Rgb = [number, number, number];

export type BoardTheme = {
  light: Rgb;
  dark: Rgb;
  pieceLight: Rgb;
  pieceDark: Rgb;
};

export type BoardThemes = Record<string, BoardTheme>;

export const DEFAULT_THEMES: BoardThemes = {
  dark: {
    light: [42, 34, 22],
    dark: [24, 19, 9],
    pieceLight: [242, 233, 216],
    pieceDark: [138, 113, 71],
  },
  green: {
    light: [220, 211, 180],
    dark: [32, 64, 47],
    pieceLight: [244, 239, 221],
    pieceDark: [47, 78, 58],
  },
  cream: {
    light: [255, 253, 248],
    dark: [228, 219, 196],
    pieceLight: [36, 31, 22],
    pieceDark: [138, 106, 59],
  },
};

/** Which theme each homepage section blends toward, keyed by section id. */
export const DEFAULT_SECTION_THEMES: Record<string, string> = {
  hero: "dark",
  about: "cream",
  pillars: "green",
  journey: "green",
  puzzle: "cream",
  prizes: "dark",
  gallery: "dark",
  sponsors: "cream",
  closing: "dark",
};

export type ScriptMove = {
  pieceId: string;
  targetRow: number;
  targetCol: number;
  capturesPieceId?: string;
  /** Marks the resolving event so feedback can be distinct. */
  mate?: boolean;
};

/** Seed script — Scholar's Mate: 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6 4.Qxf7# */
export const DEFAULT_SCRIPT: ScriptMove[] = [
  { pieceId: "wpe", targetRow: 4, targetCol: 4 },
  { pieceId: "bpe", targetRow: 3, targetCol: 4 },
  { pieceId: "wbf", targetRow: 4, targetCol: 2 },
  { pieceId: "bnb", targetRow: 2, targetCol: 2 },
  { pieceId: "wq", targetRow: 3, targetCol: 7 },
  { pieceId: "bng", targetRow: 2, targetCol: 5 },
  { pieceId: "wq", targetRow: 1, targetCol: 5, capturesPieceId: "bpf", mate: true },
];

export type Piece = {
  id: string;
  glyph: string;
  side: "w" | "b";
  row: number;
  col: number;
  captured: boolean;
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const BACK: [string, string][] = [
  ["r", "♜"],
  ["n", "♞"],
  ["b", "♝"],
  ["q", "♛"],
  ["k", "♚"],
  ["b", "♝"],
  ["n", "♞"],
  ["r", "♜"],
];

/** Standard starting position with stable, human-readable piece ids. */
export function startingPosition(): Piece[] {
  const pieces: Piece[] = [];
  for (const side of ["b", "w"] as const) {
    const backRow = side === "b" ? 0 : 7;
    const pawnRow = side === "b" ? 1 : 6;
    BACK.forEach(([kind, glyph], col) => {
      const unique = kind === "q" || kind === "k";
      pieces.push({
        id: `${side}${kind}${unique ? "" : FILES[col]}`,
        glyph,
        side,
        row: backRow,
        col,
        captured: false,
      });
    });
    FILES.forEach((f, col) => {
      pieces.push({ id: `${side}p${f}`, glyph: "♟", side, row: pawnRow, col, captured: false });
    });
  }
  return pieces;
}

/** Precomputed board states: index 0 is the start, index N the final position. */
export function buildSnapshots(script: ScriptMove[]): Piece[][] {
  const snapshots: Piece[][] = [startingPosition()];
  for (const move of script) {
    const prev = snapshots[snapshots.length - 1]!;
    const next = prev.map((p) => ({ ...p }));
    const mover = next.find((p) => p.id === move.pieceId);
    if (mover) {
      mover.row = move.targetRow;
      mover.col = move.targetCol;
    }
    if (move.capturesPieceId) {
      const victim = next.find((p) => p.id === move.capturesPieceId);
      if (victim) victim.captured = true;
    }
    snapshots.push(next);
  }
  return snapshots;
}

function isRgb(v: unknown): v is Rgb {
  return Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === "number");
}

export function parseThemes(raw?: string | null): BoardThemes {
  if (!raw?.trim()) return DEFAULT_THEMES;
  try {
    const parsed = JSON.parse(raw) as Record<string, Partial<BoardTheme>>;
    const out: BoardThemes = { ...DEFAULT_THEMES };
    for (const [key, t] of Object.entries(parsed)) {
      const base = DEFAULT_THEMES[key] ?? DEFAULT_THEMES.dark!;
      out[key] = {
        light: isRgb(t.light) ? t.light : base.light,
        dark: isRgb(t.dark) ? t.dark : base.dark,
        pieceLight: isRgb(t.pieceLight) ? t.pieceLight : base.pieceLight,
        pieceDark: isRgb(t.pieceDark) ? t.pieceDark : base.pieceDark,
      };
    }
    return out;
  } catch {
    return DEFAULT_THEMES;
  }
}

export function parseScript(raw?: string | null): ScriptMove[] {
  if (!raw?.trim()) return DEFAULT_SCRIPT;
  try {
    const parsed = JSON.parse(raw) as ScriptMove[];
    const clean = parsed.filter(
      (m) =>
        m &&
        typeof m.pieceId === "string" &&
        Number.isFinite(m.targetRow) &&
        Number.isFinite(m.targetCol),
    );
    return clean.length ? clean : DEFAULT_SCRIPT;
  } catch {
    return DEFAULT_SCRIPT;
  }
}

/** Comma or newline separated list of section ids where the board is hidden. */
export function parseDisabledSections(raw?: string | null): Set<string> {
  return new Set(
    (raw ?? "")
      .split(/[\n,]/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}
