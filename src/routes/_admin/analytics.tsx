import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_admin/analytics")({
  component: Analytics,
});

function Analytics() {
  const [byCity, setByCity] = useState<any[]>([]);
  const [byMonth, setByMonth] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("players").select("city, rating, created_at");
      const cityMap: any = {}, monthMap: any = {}, ratingBuckets: any = { "<1000": 0, "1000-1400": 0, "1400-1800": 0, "1800-2200": 0, "2200+": 0 };
      (p ?? []).forEach((pl: any) => {
        if (pl.city) cityMap[pl.city] = (cityMap[pl.city] ?? 0) + 1;
        const m = new Date(pl.created_at).toISOString().slice(0, 7);
        monthMap[m] = (monthMap[m] ?? 0) + 1;
        const r = pl.rating ?? 0;
        if (r < 1000) ratingBuckets["<1000"]++;
        else if (r < 1400) ratingBuckets["1000-1400"]++;
        else if (r < 1800) ratingBuckets["1400-1800"]++;
        else if (r < 2200) ratingBuckets["1800-2200"]++;
        else ratingBuckets["2200+"]++;
      });
      setByCity(Object.entries(cityMap).map(([name, value]) => ({ name, value })).sort((a: any, b: any) => b.value - a.value).slice(0, 10));
      setByMonth(Object.entries(monthMap).map(([name, value]) => ({ name, value })).sort((a: any, b: any) => a.name.localeCompare(b.name)));
      setRatings(Object.entries(ratingBuckets).map(([name, value]) => ({ name, value })));
    })();
  }, []);

  return (
    <div className="p-8">
      <h1 className="font-display text-3xl font-semibold mb-6">Analytics</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Chart title="Players by city (top 10)"><BarChart data={byCity}><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="value" fill="#d4af37" radius={[6, 6, 0, 0]} /></BarChart></Chart>
        <Chart title="Rating distribution"><BarChart data={ratings}><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} /></BarChart></Chart>
        <div className="md:col-span-2"><Chart title="Registrations over time"><LineChart data={byMonth}><CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Line type="monotone" dataKey="value" stroke="#d4af37" strokeWidth={2} /></LineChart></Chart></div>
      </div>
    </div>
  );
}

function Chart({ title, children }: { title: string; children: any }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-display text-lg font-semibold mb-3">{title}</h3>
      <div style={{ width: "100%", height: 260 }}><ResponsiveContainer>{children}</ResponsiveContainer></div>
    </div>
  );
}
