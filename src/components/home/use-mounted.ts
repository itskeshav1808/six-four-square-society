import { useEffect, useState } from "react";

/**
 * True after hydration. Reveal animations use this so their hidden initial
 * state is never baked into server HTML — content stays visible even if a
 * subtree fails to hydrate.
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
