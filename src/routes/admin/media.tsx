import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Sparkles, Upload, Loader2, Search, Star, Pencil, X, CheckSquare, Square } from "lucide-react";
import { compressImage } from "@/lib/image-compress";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/admin/media")({
  component: MediaAdmin,
});

const SIGNED_URL_TTL = 60 * 60 * 24 * 365; // 1 year

type MediaRow = {
  id: string;
  url: string;
  storage_path: string | null;
  caption: string | null;
  title: string | null;
  description: string | null;
  category: string | null;
  album: string | null;
  is_featured: boolean;
  tournament_id: string | null;
  created_at: string;
  tournament?: { name: string } | null;
};

const CATEGORIES = ["Tournament", "Awards", "Training", "Team", "Venue", "Other"];

function MediaAdmin() {
  const { user } = useAuth();
  const [items, setItems] = useState<MediaRow[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [form, setForm] = useState({ url: "", caption: "", album: "", tournament_id: "", category: "", title: "", description: "" });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // filters
  const [q, setQ] = useState("");
  const [fTournament, setFTournament] = useState("");
  const [fCategory, setFCategory] = useState("");
  const [fFeatured, setFFeatured] = useState("");
  const [fDate, setFDate] = useState("");

  // selection + editing
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<MediaRow | null>(null);

  const log = async (action: string, entity_id?: string, metadata?: any) => {
    await supabase.from("audit_logs").insert({
      actor_id: user?.id ?? null,
      actor_email: user?.email ?? null,
      action,
      entity_type: "media_assets",
      entity_id: entity_id ?? null,
      metadata: metadata ?? null,
    });
  };

  const load = async () => {
    const { data } = await supabase
      .from("media_assets")
      .select("*, tournament:tournaments(name)")
      .order("created_at", { ascending: false });
    setItems((data ?? []) as unknown as MediaRow[]);
  };
  useEffect(() => {
    load();
    supabase.from("tournaments").select("id,name").then(({ data }) => setTournaments(data ?? []));
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((m) => {
      if (needle) {
        const hay = [m.title, m.caption, m.description, m.category, m.album, m.tournament?.name].join(" ").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (fTournament && m.tournament_id !== fTournament) return false;
      if (fCategory && (m.category ?? "") !== fCategory) return false;
      if (fFeatured === "yes" && !m.is_featured) return false;
      if (fFeatured === "no" && m.is_featured) return false;
      if (fDate && !m.created_at.startsWith(fDate)) return false;
      return true;
    });
  }, [items, q, fTournament, fCategory, fFeatured, fDate]);

  const add = async () => {
    if (!form.url) return toast.error("Please paste an image URL first");
    const { data, error } = await supabase
      .from("media_assets")
      .insert({
        url: form.url,
        caption: form.caption || null,
        title: form.title || null,
        description: form.description || null,
        category: form.category || null,
        album: form.album || null,
        tournament_id: form.tournament_id || null,
        uploaded_by: user?.id ?? null,
      })
      .select("id")
      .maybeSingle();
    if (error) toast.error(error.message);
    else {
      toast.success("Photo added");
      await log("media.create", data?.id, { source: "url" });
      setForm({ url: "", caption: "", album: "", tournament_id: "", category: "", title: "", description: "" });
      load();
    }
  };

  const suggest = () => {
    const stock = ["Focused concentration at Board 1.", "A quiet moment before the storm.", "Champions in the making.", "Every move matters.", "Grit and grace on 64 squares."];
    setForm({ ...form, caption: stock[Math.floor(Math.random() * stock.length)] });
  };

  const removeOne = async (m: MediaRow) => {
    if (m.storage_path) {
      const { error } = await supabase.storage.from("media").remove([m.storage_path]);
      if (error) console.warn("storage delete failed", error.message);
    }
    const { error } = await supabase.from("media_assets").delete().eq("id", m.id);
    if (error) throw error;
    await log("media.delete", m.id, { storage_path: m.storage_path });
  };

  const del = async (m: MediaRow) => {
    if (!window.confirm("Are you sure you want to delete this photo? This action cannot be undone.")) return;
    try {
      await removeOne(m);
      toast.success("Photo deleted");
      setSelected((s) => { const n = new Set(s); n.delete(m.id); return n; });
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Delete failed");
    }
  };

  const bulkDelete = async () => {
    const list = items.filter((m) => selected.has(m.id));
    if (list.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${list.length} photo(s)? This action cannot be undone.`)) return;
    let ok = 0;
    for (const m of list) {
      try { await removeOne(m); ok++; } catch (e: any) { toast.error(e.message ?? "Delete failed"); }
    }
    toast.success(`Deleted ${ok} photo(s)`);
    setSelected(new Set());
    load();
  };

  const bulkUpdate = async (patch: { is_featured?: boolean; category?: string }, label: string) => {
    const ids = [...selected];
    if (ids.length === 0) return;
    const { error } = await supabase.from("media_assets").update(patch).in("id", ids);
    if (error) return toast.error(error.message);
    await log("media.bulk_update", undefined, { ids, patch });
    toast.success(`${label} — ${ids.length} photo(s)`);
    setSelected(new Set());
    load();
  };

  const saveEdit = async () => {
    if (!editing) return;
    const { error } = await supabase
      .from("media_assets")
      .update({
        title: editing.title || null,
        caption: editing.caption || null,
        description: editing.description || null,
        category: editing.category || null,
        album: editing.album || null,
        tournament_id: editing.tournament_id || null,
        is_featured: editing.is_featured,
      })
      .eq("id", editing.id);
    if (error) return toast.error(error.message);
    await log("media.update", editing.id);
    toast.success("Photo updated");
    setEditing(null);
    load();
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return toast.error("Please choose image files");

    setUploading(true);
    setProgress({ done: 0, total: list.length });
    let ok = 0;
    for (const original of list) {
      try {
        const file = await compressImage(original);
        const path = `${form.album || "gallery"}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error: upErr } = await supabase.storage.from("media").upload(path, file, {
          cacheControl: "31536000",
          upsert: false,
          contentType: file.type,
        });
        if (upErr) throw upErr;
        const { data: signed, error: sErr } = await supabase.storage.from("media").createSignedUrl(path, SIGNED_URL_TTL);
        if (sErr || !signed) throw sErr ?? new Error("Failed to sign URL");
        const { data: row, error: insErr } = await supabase
          .from("media_assets")
          .insert({
            url: signed.signedUrl,
            storage_path: path,
            title: form.title || null,
            description: form.description || null,
            category: form.category || null,
            caption: form.caption || null,
            album: form.album || null,
            tournament_id: form.tournament_id || null,
            uploaded_by: user?.id ?? null,
          })
          .select("id")
          .maybeSingle();
        if (insErr) throw insErr;
        await log("media.upload", row?.id, { path, bytes: file.size });
        ok++;
      } catch (e: any) {
        toast.error(`${original.name}: ${e.message ?? "upload failed"}`);
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

  const toggle = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const pct = progress ? Math.round((progress.done / progress.total) * 100) : 0;

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
          {progress && (
            <div className="w-full max-w-sm h-1.5 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={pct}>
              <div className="h-full bg-gold transition-all" style={{ width: `${pct}%` }} />
            </div>
          )}
          <div className="text-xs text-muted-foreground">Multiple selection supported. Large images are compressed automatically. Metadata below applies to this batch.</div>
        </div>
      </div>

      {/* Metadata + URL add */}
      <div className="rounded-2xl border border-border bg-card p-4 grid gap-2 md:grid-cols-6 mb-4">
        <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        <input placeholder="Caption" value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option value="">No category</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input placeholder="Album" value={form.album} onChange={(e) => setForm({ ...form, album: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        <select value={form.tournament_id} onChange={(e) => setForm({ ...form, tournament_id: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option value="">No tournament</option>
          {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm md:col-span-3" />
        <input placeholder="Or paste image URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm md:col-span-2" />
        <div className="flex gap-2">
          <button onClick={suggest} title="Suggest caption" aria-label="Suggest caption" className="px-2 rounded-lg border border-border"><Sparkles size={14} /></button>
          <button onClick={add} className="flex-1 rounded-lg bg-primary text-primary-foreground text-sm inline-flex items-center justify-center gap-1"><Plus size={14} />Add URL</button>
        </div>
      </div>

      {/* Search + filters */}
      <div className="rounded-2xl border border-border bg-card p-4 grid gap-2 md:grid-cols-5 mb-4">
        <div className="relative md:col-span-2">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, caption, description…" aria-label="Search photos" className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm" />
        </div>
        <select value={fTournament} onChange={(e) => setFTournament(e.target.value)} aria-label="Filter by tournament" className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option value="">All tournaments</option>
          {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={fCategory} onChange={(e) => setFCategory(e.target.value)} aria-label="Filter by category" className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <select value={fFeatured} onChange={(e) => setFFeatured(e.target.value)} aria-label="Filter by featured" className="rounded-lg border border-input bg-background px-2 py-2 text-sm">
            <option value="">Featured: any</option>
            <option value="yes">Featured only</option>
            <option value="no">Not featured</option>
          </select>
          <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} aria-label="Filter by upload date" className="rounded-lg border border-input bg-background px-2 py-2 text-sm" />
        </div>
      </div>

      {/* Bulk actions */}
      <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
        <button
          onClick={() => setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((m) => m.id)))}
          className="px-3 py-1.5 rounded-lg border border-border inline-flex items-center gap-1.5"
        >
          {selected.size === filtered.length && filtered.length > 0 ? <CheckSquare size={14} /> : <Square size={14} />}
          Select all
        </button>
        <span className="text-muted-foreground">{selected.size} selected · {filtered.length} shown</span>
        {selected.size > 0 && (
          <>
            <button onClick={() => bulkUpdate({ is_featured: true }, "Marked featured")} className="px-3 py-1.5 rounded-lg border border-border">Mark featured</button>
            <button onClick={() => bulkUpdate({ is_featured: false }, "Removed featured")} className="px-3 py-1.5 rounded-lg border border-border">Remove featured</button>
            <select
              onChange={(e) => { if (e.target.value) { bulkUpdate({ category: e.target.value }, "Category changed"); e.target.value = ""; } }}
              defaultValue=""
              aria-label="Change category for selected"
              className="px-3 py-1.5 rounded-lg border border-input bg-background"
            >
              <option value="">Change category…</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={bulkDelete} className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground inline-flex items-center gap-1.5"><Trash2 size={14} />Delete</button>
          </>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filtered.map((m) => (
          <div key={m.id} className={`group relative rounded-xl overflow-hidden border bg-card transition ${selected.has(m.id) ? "border-gold ring-2 ring-gold/40" : "border-border"}`}>
            <img src={m.url} alt={m.title ?? m.caption ?? "Gallery photo"} loading="lazy" className="w-full aspect-square object-cover" />
            <div className="p-2 text-xs">
              <div className="truncate font-medium">{m.title ?? m.caption ?? "—"}</div>
              <div className="text-muted-foreground text-[10px] truncate">{[m.tournament?.name, m.category, m.album].filter(Boolean).join(" · ") || "—"}</div>
            </div>
            <label className="absolute top-2 left-2 h-6 w-6 rounded-md bg-black/60 flex items-center justify-center cursor-pointer">
              <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} aria-label="Select photo" className="accent-[color:var(--color-primary)]" />
            </label>
            <div className="absolute top-2 right-2 flex gap-1.5">
              <button
                onClick={async () => {
                  const { error } = await supabase.from("media_assets").update({ is_featured: !m.is_featured }).eq("id", m.id);
                  if (error) return toast.error(error.message);
                  await log("media.update", m.id, { is_featured: !m.is_featured });
                  load();
                }}
                title={m.is_featured ? "Remove featured" : "Mark featured"}
                aria-label="Toggle featured"
                className={`p-1.5 rounded-full ${m.is_featured ? "bg-gold text-black" : "bg-black/60 text-white opacity-0 group-hover:opacity-100"} transition`}
              >
                <Star size={12} />
              </button>
              <button onClick={() => setEditing(m)} title="Edit" aria-label="Edit photo" className="p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"><Pencil size={12} /></button>
              <button onClick={() => del(m)} title="Delete" aria-label="Delete photo" className="p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"><Trash2 size={12} /></button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="col-span-full text-center text-muted-foreground py-12">No media matches your filters.</div>}
      </div>

      {/* Edit dialog */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">Edit photo</h2>
              <button onClick={() => setEditing(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <img src={editing.url} alt={editing.title ?? "Photo"} className="w-full h-40 object-cover rounded-lg" />
            <input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Title" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            <input value={editing.caption ?? ""} onChange={(e) => setEditing({ ...editing, caption: e.target.value })} placeholder="Caption" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            <textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Description" rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <select value={editing.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="">No category</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={editing.tournament_id ?? ""} onChange={(e) => setEditing({ ...editing, tournament_id: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="">No tournament</option>
                {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <input value={editing.album ?? ""} onChange={(e) => setEditing({ ...editing, album: e.target.value })} placeholder="Album" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.is_featured} onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })} />
              Featured photo
            </label>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="flex-1 py-2 rounded-lg border border-border text-sm">Cancel</button>
              <button onClick={saveEdit} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Save changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
