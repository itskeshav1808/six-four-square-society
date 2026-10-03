import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type FidePlayer = {
  name: string;
  federation: string | null;
  title: string | null;
  standard: number | null;
  rapid: number | null;
  blitz: number | null;
};

/** Looks up a FIDE ID via Lichess's public FIDE mirror. Never throws; returns null when unknown/slow. */
export const lookupFide = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().regex(/^\d{4,10}$/) }).parse(d))
  .handler(async ({ data }): Promise<FidePlayer | null> => {
    try {
      const res = await fetch(`https://lichess.org/api/fide/player/${data.id}`, {
        signal: AbortSignal.timeout(5000),
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return null;
      const j: any = await res.json();
      if (!j?.name) return null;
      return {
        name: String(j.name),
        federation: j.federation ?? null,
        title: j.title ?? null,
        standard: typeof j.standard === "number" ? j.standard : null,
        rapid: typeof j.rapid === "number" ? j.rapid : null,
        blitz: typeof j.blitz === "number" ? j.blitz : null,
      };
    } catch {
      return null;
    }
  });
