"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Clapperboard,
  Clock,
  Flame,
  Lightbulb,
  Loader2,
  Radar,
  Search,
  Sparkles,
  Video,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SundayBrief } from "@/lib/gemini";

const REGIONS = [
  { code: "IN", label: "India (IN)" },
  { code: "US", label: "United States (US)" },
  { code: "GB", label: "United Kingdom (GB)" },
];

const PRESETS = [
  { label: "AI Tools", query: "AI tools" },
  { label: "Productivity Apps", query: "productivity apps" },
  { label: "Tech Reviews", query: "tech reviews" },
];

const BAR_COLORS = ["#4f46e5", "#7c3aed", "#0891b2", "#059669", "#d97706"];

interface BriefResponse {
  success: boolean;
  brief?: SundayBrief;
  videoCount?: number;
  isMock?: boolean;
  error?: string;
}

export default function Home() {
  const [regionCode, setRegionCode] = useState("IN");
  const [query, setQuery] = useState("AI tools");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<SundayBrief | null>(null);
  const [videoCount, setVideoCount] = useState(0);
  const [isMock, setIsMock] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() || undefined, regionCode }),
      });
      const data = (await res.json()) as BriefResponse;
      if (!res.ok || !data.success || !data.brief) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      setBrief(data.brief);
      setVideoCount(data.videoCount ?? 0);
      setIsMock(Boolean(data.isMock));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const topCluster = brief?.themeClusters.reduce((a, b) =>
    b.videoCount > a.videoCount ? b : a,
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
          <div className="rounded-lg bg-red-600 p-2 text-white">
            <Radar className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">YouTube Trend Radar</h1>
            <p className="text-sm text-slate-500">Your weekly Sunday Brief on what to make next</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        {/* Control bar */}
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <select
              aria-label="Region"
              value={regionCode}
              onChange={(e) => setRegionCode(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {REGIONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>

            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !loading && generate()}
                placeholder="Search a custom topic, e.g. Cursor IDE"
                className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="button"
              onClick={generate}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {loading ? "Generating…" : "Generate Sunday Brief"}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Quick picks</span>
            {PRESETS.map((p) => {
              const active = query.trim().toLowerCase() === p.query.toLowerCase();
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setQuery(p.query)}
                  className={
                    "rounded-full border px-3 py-1 text-sm transition " +
                    (active
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100")
                  }
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Banners */}
        {isMock && brief && (
          <div role="status" className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>Running on fallback/sample dataset</span>
          </div>
        )}
        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>Couldn&apos;t generate the brief: {error}</span>
          </div>
        )}

        {!brief && !loading && !error && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
            <Clapperboard className="mx-auto mb-3 size-8 text-slate-400" />
            Pick a region and topic, then press <strong>Generate Sunday Brief</strong>.
          </div>
        )}

        {loading && !brief && (
          <div className="flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-12 text-slate-600">
            <Loader2 className="size-5 animate-spin" /> Analysing trending videos…
          </div>
        )}

        {brief && (
          <div className={"space-y-6 transition-opacity " + (loading ? "opacity-60" : "")}>
            {/* Executive summary */}
            <section className="rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white shadow-sm">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-indigo-100">
                <Lightbulb className="size-4" /> Executive Summary
              </h2>
              <p className="text-lg leading-relaxed sm:text-xl">{brief.executiveSummary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {brief.winningFormats.map((f) => (
                  <span key={f} className="rounded-full bg-white/20 px-3 py-1 text-sm font-medium backdrop-blur">
                    {f}
                  </span>
                ))}
              </div>
            </section>

            {/* KPI cards */}
            <section className="grid gap-4 sm:grid-cols-3">
              <Kpi icon={<Clock className="size-5" />} label="Peak Duration" value={brief.durationSweetSpot} />
              <Kpi icon={<Flame className="size-5" />} label="Top Emerging Cluster" value={topCluster?.clusterName ?? "—"} />
              <Kpi icon={<Video className="size-5" />} label="Total Videos Analyzed" value={String(videoCount)} />
            </section>

            {/* Chart */}
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <h2 className="mb-4 text-base font-semibold">Video count by theme cluster</h2>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={brief.themeClusters} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="clusterName"
                      tick={{ fontSize: 12, fill: "#475569" }}
                      interval={0}
                      tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 17)}…` : v)}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#475569" }} />
                    <Tooltip cursor={{ fill: "#f1f5f9" }} />
                    <Bar dataKey="videoCount" name="Videos" radius={[6, 6, 0, 0]}>
                      {brief.themeClusters.map((c, i) => (
                        <Cell key={c.clusterName} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Cluster cards */}
            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {brief.themeClusters.map((c) => (
                <article key={c.clusterName} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold leading-snug">{c.clusterName}</h3>
                    <span className="shrink-0 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                      {c.videoCount} {c.videoCount === 1 ? "video" : "videos"}
                    </span>
                  </div>

                  <div>
                    <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Why it&apos;s trending</h4>
                    <p className="text-sm leading-relaxed text-slate-700">{c.whyItIsTrending}</p>
                  </div>

                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <h4 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-800">
                      <Lightbulb className="size-3.5" /> Pitch
                    </h4>
                    <p className="text-sm font-semibold text-slate-900">{c.suggestedVideoTitle}</p>
                    <p className="mt-1 text-sm text-slate-700">{c.angleOrHook}</p>
                  </div>

                  <div className="mt-auto">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      <Clock className="size-3.5" /> {c.recommendedDuration}
                    </span>
                  </div>
                </article>
              ))}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
        <span className="text-indigo-600">{icon}</span>
        {label}
      </div>
      <p className="text-lg font-semibold leading-snug">{value}</p>
    </div>
  );
}
