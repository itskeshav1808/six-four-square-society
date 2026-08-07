import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ContentRow = { title: string | null; body: string | null };
export type ContentMap = Record<string, ContentRow>;

/**
 * Every homepage string lives in `site_content` and is editable from the
 * Content Manager. The admin edits the `title` field (the visible text);
 * `body` is used as an editor hint / long-form text.
 */
export const siteContentAllQuery = queryOptions({
  queryKey: ["site_content", "all"],
  queryFn: async () => {
    const { data } = await supabase.from("site_content").select("key,title,body");
    const map: ContentMap = {};
    for (const r of data ?? []) map[r.key] = { title: r.title, body: r.body };
    return map;
  },
});

export type Cms = {
  /** Visible text for a key, with a fallback used only when the key is empty. */
  t: (key: string, fallback?: string) => string;
  /** Long-form/secondary text for a key. */
  b: (key: string, fallback?: string) => string;
  /** Multi-line text split into lines. */
  lines: (key: string, fallback?: string[]) => string[];
  /** Multi-line "left|right" text split into tuples. */
  pairs: (key: string, fallback?: [string, string][]) => [string, string][];
};

export function makeCms(map: ContentMap): Cms {
  const t = (key: string, fallback = "") => map[key]?.title?.trim() || fallback;
  const b = (key: string, fallback = "") => map[key]?.body?.trim() || fallback;

  const lines = (key: string, fallback: string[] = []) => {
    const raw = t(key);
    const out = raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    return out.length ? out : fallback;
  };

  const pairs = (key: string, fallback: [string, string][] = []) => {
    const out = lines(key).map((l) => {
      const [left, ...rest] = l.split("|");
      return [left.trim(), rest.join("|").trim()] as [string, string];
    });
    return out.length ? out : fallback;
  };

  return { t, b, lines, pairs };
}
