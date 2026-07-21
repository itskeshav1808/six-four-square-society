import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Sparkles, Upload, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/media")({
  component: MediaAdmin,
});

const SIGNED_URL_TTL = 60 * 60 * 24 * 365; // 1 year

function MediaAdmin() {
  const [items, setItems] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [form, setForm] = useState({ url: "", caption: "", album: "", tournament_id: "" });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase.from("media_assets").select("*, tournament:tournaments(name)").order("created_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); supabase.from("tournaments").select("id,name").then(({ data }) => setTournaments(data ?? [])); }, []);

  const add = async () => {
    if (!form.url) return toast.error("URL required");
    const { error } = await supabase.from("media_assets").insert({ ...form, tournament_id: form.tournament_id || null });
    if (error) toast.error(error.message); else { toast.success("Added"); setForm({ url: "", caption: "", album: "", tournament_id: "" }); load(); }
  };
  const suggest = () => {
    const stock = ["Focused concentration at Board 1.", "A quiet moment before the storm.", "Champions in the making.", "Every move matters.", "Grit and grace on 64 squares."];
    setForm({ ...form, caption: stock[Math.floor(Math.random() * stock.length)] });
  };
  const del = async (id: string) => { await supabase.from("media_assets").delete().eq("id", id); load(); };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return toast.error("Please choose image files");

    setUploading(true);
    setProgress({ done: 0, total: list.length });
    let ok = 0;
    for (const file of list) {
      try {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${form.album || "gallery"}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("media").upload(path, file, {
          cacheControl: "31536000",
          upsert: false,
          contentType: file.type,
        });
        if (upErr) throw upErr;
        const { data: signed, error: sErr } = await supabase.storage.from("media").createSignedUrl(path, SIGNED_URL_TTL);
        if (sErr || !signed) throw sErr ?? new Error("Failed to sign URL");
        const { error: insErr } = await supabase.from("media_assets").insert({
          url: signed.signedUrl,
          caption: form.caption || null,
          album: form.album || null,
          tournament_id: form.tournament_id || null,
        });
        if (insErr) throw insErr;
        ok++;
      } catch (e: any) {
        toast.error(`${file.name}: ${e.message ?? "upload failed"}`);
      }
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }
    setUploading(false);
    setProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (ok > 0) toast.success(`Uploaded ${ok} image${ok > 1 ? "s" : ""}`);
    load();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="p-8">
      <h1 className="font-display text-3xl font-semibold mb-6">Media Library</h1>

      {/* Upload zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="rounded-2xl border-2 border-dashed border-border bg-card p-6 mb-4 text-center"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-2">
          <Upload size={24} className="text-muted-foreground" />
          <div className="text-sm">Drag & drop images here, or</div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm inline-flex items-center gap-2 disabled:opacity-50"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? `Uploading ${progress?.done}/${progress?.total}…` : "Choose images"}
          </button>
          <div className="text-xs text-muted-foreground">Multiple selection supported. Caption/album/tournament below apply to this batch.</div>
        </div>
      </div>

      {/* Metadata + URL add */}
      <div className="rounded-2xl border border-border bg-card p-4 grid gap-2 md:grid-cols-6 mb-6">
        <input placeholder="Or paste image URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm md:col-span-2" />
        <input placeholder="Caption" value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        <input placeholder="Album" value={form.album} onChange={(e) => setForm({ ...form, album: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        <select value={form.tournament_id} onChange={(e) => setForm({ ...form, tournament_id: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option value="">No tournament</option>
          {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <div className="flex gap-2">
          <button onClick={suggest} title="AI caption" className="px-2 rounded-lg border border-border"><Sparkles size={14} /></button>
          <button onClick={add} className="flex-1 rounded-lg bg-primary text-primary-foreground text-sm inline-flex items-center justify-center gap-1"><Plus size={14} />Add URL</button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {items.map((m) => (
          <div key={m.id} className="group relative rounded-xl overflow-hidden border border-border bg-card">
            <img src={m.url} alt={m.caption ?? ""} className="w-full aspect-square object-cover" />
            <div className="p-2 text-xs">
              <div className="truncate">{m.caption ?? "—"}</div>
              <div className="text-muted-foreground text-[10px]">{m.tournament?.name ?? m.album ?? ""}</div>
            </div>
            <button onClick={() => del(m.id)} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"><Trash2 size={12} /></button>
          </div>
        ))}
        {items.length === 0 && <div className="col-span-full text-center text-muted-foreground py-12">No media yet.</div>}
      </div>
    </div>
  );
}
