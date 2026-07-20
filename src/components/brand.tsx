import logo from "@/assets/logo.webp.asset.json";

export function Brand({ size = 40, showText = true }: { size?: number; showText?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <img src={logo.url} alt="64 Squares Society" width={size} height={size} className="rounded-full ring-1 ring-border" />
      {showText && (
        <div className="leading-tight">
          <div className="font-display text-base font-semibold">64 Squares</div>
          <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Society</div>
        </div>
      )}
    </div>
  );
}
