import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import anthemAsset from "@/assets/anthem.mp3.asset.json";

const KEY = "64s-anthem-played";

export function AnthemPlayer() {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(KEY) === "1") return;
    const audio = ref.current;
    if (!audio) return;
    audio.volume = 0.25;
    audio.muted = true;
    audio.play().then(() => setPlaying(true)).catch(() => {});
    const unmuteOnClick = () => {
      if (!audio.muted) return;
      audio.muted = false;
      setMuted(false);
      sessionStorage.setItem(KEY, "1");
      window.removeEventListener("click", unmuteOnClick);
      window.removeEventListener("touchstart", unmuteOnClick);
    };
    window.addEventListener("click", unmuteOnClick, { passive: true });
    window.addEventListener("touchstart", unmuteOnClick, { passive: true });
    return () => {
      window.removeEventListener("click", unmuteOnClick);
      window.removeEventListener("touchstart", unmuteOnClick);
    };
  }, []);

  const togglePlay = () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) { a.play(); setPlaying(true); }
    else { a.pause(); setPlaying(false); }
  };
  const toggleMute = () => {
    const a = ref.current;
    if (!a) return;
    a.muted = !a.muted;
    setMuted(a.muted);
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-1 rounded-full glass shadow-lg px-2 py-1.5">
      <audio ref={ref} src={anthemAsset.url} preload="metadata" loop={false} />
      <button
        onClick={togglePlay}
        aria-label={playing ? "Pause anthem" : "Play anthem"}
        className="h-8 w-8 rounded-full bg-gold text-gold-foreground flex items-center justify-center hover:opacity-90"
      >
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <button
        onClick={toggleMute}
        aria-label={muted ? "Unmute anthem" : "Mute anthem"}
        className="h-8 w-8 rounded-full text-foreground/70 hover:text-foreground flex items-center justify-center"
      >
        {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </button>
    </div>
  );
}
