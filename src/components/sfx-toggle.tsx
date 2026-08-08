import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { isSfxMuted, setSfxMuted } from "@/lib/move-sfx";

/** Mute control for move sound effects — independent of the anthem volume. */
export function SfxToggle() {
  const [muted, setMuted] = useState(false);
  useEffect(() => setMuted(isSfxMuted()), []);

  return (
    <button
      onClick={() => {
        const next = !muted;
        setSfxMuted(next);
        setMuted(next);
      }}
      aria-label={muted ? "Unmute move sounds" : "Mute move sounds"}
      title={muted ? "Unmute move sounds" : "Mute move sounds"}
      className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/70 hover:text-foreground"
    >
      {muted ? <BellOff size={14} /> : <Bell size={14} />}
    </button>
  );
}
