"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Clapperboard,
  Clock,
  Copy,
  FileText,
  Flame,
  Lightbulb,
  Loader2,
  Radar,
  Search,
  Sparkles,
  Target,
  Users,
  Video,
  X,
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
import type { ScriptPackage, SundayBrief, ThemeCluster } from "@/lib/gemini";

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

const FORMATS = [
  { value: "any", label: "All Formats" },
  { value: "short", label: "Shorts (<60s)" },
  { value: "long", label: "Long-Form (>5m)" },
] as const;

type Format = (typeof FORMATS)[number]["value"];

const BAR_COLORS = ["#39ff14", "#a64dff", "#d6d9e4", "#39ff14", "#a64dff"];

const TICKER = ["GO VIRAL", "SUNDAY BRIEF", "TREND RADAR", "MAKE NOISE", "STEAL THE ALGORITHM", "POST LOUD"];

interface BriefResponse {
  success: boolean;
  brief?: SundayBrief;
  videoCount?: number;
  isMock?: boolean;
  competitorsMock?: boolean;
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
  const [competitorsMock, setCompetitorsMock] = useState(false);
  const [format, setFormat] = useState<Format>("any");
  const [competitorHandles, setCompetitorHandles] = useState("");

  const [scriptFor, setScriptFor] = useState<ThemeCluster | null>(null);
  const [script, setScript] = useState<ScriptPackage | null>(null);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const scriptReq = useRef(0);

  async function openScript(c: ThemeCluster) {
    const id = ++scriptReq.current;
    setScriptFor(c);
    setScript(null);
    setScriptError(null);
    setScriptLoading(true);
    try {
      const res = await fetch("/api/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clusterName: c.clusterName, angleOrHook: c.angleOrHook }),
      });
      const data = (await res.json()) as { success: boolean; script?: ScriptPackage; error?: string };
      if (id !== scriptReq.current) return; // modal closed or reopened meanwhile
      if (!res.ok || !data.success || !data.script) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      setScript(data.script);
    } catch (e) {
      if (id !== scriptReq.current) return;
      setScriptError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      if (id === scriptReq.current) setScriptLoading(false);
    }
  }

  function closeScript() {
    scriptReq.current++;
    setScriptFor(null);
    setScriptLoading(false);
  }

  useEffect(() => {
    if (!scriptFor) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeScript();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [scriptFor]);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim() || undefined,
          regionCode,
          duration: format,
          competitorHandles,
        }),
      });
      const data = (await res.json()) as BriefResponse;
      if (!res.ok || !data.success || !data.brief) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      setBrief(data.brief);
      setVideoCount(data.videoCount ?? 0);
      setIsMock(Boolean(data.isMock));
      setCompetitorsMock(Boolean(data.competitorsMock));
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
    <div className="grid-bg min-h-screen text-zinc-200">
      {/* Ticker */}
      <div className="overflow-hidden border-b-2 border-black bg-[#39ff14] py-1.5 text-black" aria-hidden="true">
        <div className="marquee-track font-display text-xs font-black uppercase tracking-widest">
          {[...TICKER, ...TICKER, ...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="mx-4 whitespace-nowrap">
              {t} <span className="mx-2 text-[#8b2dff]">✦</span>
            </span>
          ))}
        </div>
      </div>

      <header className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pb-2 pt-10 sm:px-6 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="wobble mb-4 inline-flex items-center gap-2 rounded-full border-2 border-black bg-[#39ff14] px-3 py-1 font-display text-[11px] font-black uppercase tracking-wider text-black shadow-[3px_3px_0_#8b2dff]">
            <Radar className="size-3.5" /> Weekly Trend Lab
          </span>
          <h1 className="font-display text-5xl font-black uppercase leading-[0.9] tracking-tighter sm:text-7xl">
            <span className="chrome-text">Trend</span>
            <br />
            <span className="text-[#39ff14]" style={{ textShadow: "4px 4px 0 #8b2dff" }}>
              Radar
            </span>
          </h1>
        </div>
        <p className="max-w-sm text-lg font-light leading-snug text-zinc-400 md:text-right">
          Your <span className="font-bold text-white">Sunday Brief</span>: what&apos;s blowing up on YouTube and exactly what to post next.
        </p>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 pb-16 pt-6 sm:px-6">
        {/* Control bar */}
        <section className="space-y-4 rounded-2xl border-2 border-[#8b2dff] bg-black/80 p-4 shadow-[6px_6px_0_#39ff14] backdrop-blur sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <select
              aria-label="Region"
              value={regionCode}
              onChange={(e) => setRegionCode(e.target.value)}
              className="h-12 rounded-xl border-2 border-zinc-700 bg-zinc-950 px-3 font-display text-xs font-bold uppercase tracking-wide text-white focus:border-[#39ff14] focus:outline-none"
            >
              {REGIONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>

            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#39ff14]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !loading && generate()}
                placeholder="Search a topic, e.g. Cursor IDE"
                className="h-12 w-full rounded-xl border-2 border-zinc-700 bg-zinc-950 pl-10 pr-3 text-base font-light text-white placeholder:text-zinc-500 focus:border-[#39ff14] focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={generate}
              disabled={loading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-black bg-[#39ff14] px-5 font-display text-xs font-black uppercase tracking-wider text-black shadow-[4px_4px_0_#8b2dff] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#8b2dff] active:translate-y-0.5 active:shadow-[2px_2px_0_#8b2dff] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {loading ? "Cooking…" : "Generate Sunday Brief"}
            </button>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div
              role="radiogroup"
              aria-label="Video format"
              className="inline-flex shrink-0 overflow-hidden rounded-xl border-2 border-zinc-700 bg-zinc-950"
            >
              {FORMATS.map((f) => {
                const active = format === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setFormat(f.value)}
                    className={
                      "px-3.5 py-2.5 font-display text-[10px] font-bold uppercase tracking-wide transition " +
                      (active ? "bg-[#a64dff] text-white" : "text-zinc-400 hover:text-white")
                    }
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            <div className="relative flex-1">
              <Users className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#a64dff]" />
              <input
                type="text"
                value={competitorHandles}
                onChange={(e) => setCompetitorHandles(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !loading && generate()}
                placeholder="Competitor Handles (e.g., @TechBurner, @MKBHD)"
                aria-label="Competitor handles"
                className="h-11 w-full rounded-xl border-2 border-zinc-700 bg-zinc-950 pl-10 pr-3 text-base font-light text-white placeholder:text-zinc-500 focus:border-[#a64dff] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-[10px] font-bold uppercase tracking-widest text-zinc-500">Quick picks</span>
            {PRESETS.map((p) => {
              const active = query.trim().toLowerCase() === p.query.toLowerCase();
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setQuery(p.query)}
                  className={
                    "rounded-full border-2 px-3.5 py-1 text-sm font-medium transition " +
                    (active
                      ? "border-[#39ff14] bg-[#39ff14] text-black"
                      : "border-zinc-600 text-zinc-200 hover:border-[#a64dff] hover:text-[#c9a0ff]")
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
          <div role="status" className="flex items-start gap-3 rounded-xl border-2 border-amber-400 bg-amber-400/10 p-3 text-sm font-medium text-amber-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>Running on fallback/sample dataset</span>
          </div>
        )}
        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border-2 border-red-500 bg-red-500/10 p-3 text-sm font-medium text-red-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>Couldn&apos;t generate the brief: {error}</span>
          </div>
        )}

        {!brief && !loading && !error && (
          <div className="rounded-2xl border-2 border-dashed border-zinc-700 bg-black/50 p-12 text-center">
            <Clapperboard className="mx-auto mb-3 size-10 text-[#a64dff]" />
            <p className="font-display text-lg font-black uppercase text-white">Nothing cooking yet</p>
            <p className="mt-1 font-light text-zinc-400">
              Pick a region and topic, then hit <span className="font-bold text-[#39ff14]">Generate Sunday Brief</span>.
            </p>
          </div>
        )}

        {loading && !brief && (
          <div className="flex items-center justify-center gap-3 rounded-2xl border-2 border-zinc-700 bg-black/50 p-12 font-display text-sm font-bold uppercase tracking-wide text-[#39ff14]">
            <Loader2 className="size-5 animate-spin" /> Scanning the algorithm…
          </div>
        )}

        {brief && (
          <div className={"space-y-8 transition-opacity " + (loading ? "opacity-60" : "")}>
            {/* Executive summary */}
            <section className="relative overflow-hidden rounded-3xl border-2 border-black bg-gradient-to-br from-[#8b2dff] via-[#6a1fd0] to-[#2a0a5e] p-6 shadow-[8px_8px_0_#d6d9e4] sm:p-8">
              <h2 className="mb-3 inline-flex items-center gap-2 rounded-full bg-black px-3 py-1 font-display text-[11px] font-black uppercase tracking-widest text-[#39ff14]">
                <Lightbulb className="size-3.5" /> The Tea
              </h2>
              <p className="text-xl font-light leading-relaxed text-white sm:text-2xl">{brief.executiveSummary}</p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                {brief.winningFormats.map((f, i) => (
                  <span
                    key={f}
                    className={
                      "rounded-full border-2 border-black bg-[#39ff14] px-3.5 py-1 font-display text-[11px] font-bold uppercase tracking-wide text-black shadow-[2px_2px_0_#000] " +
                      (i % 2 ? "rotate-1" : "-rotate-1")
                    }
                  >
                    {f}
                  </span>
                ))}
              </div>
            </section>

            {/* KPI cards */}
            <section className="grid gap-4 sm:grid-cols-3">
              <Kpi tone="green" icon={<Clock className="size-5" />} label="Peak Duration" value={brief.durationSweetSpot} small />
              <Kpi tone="purple" icon={<Flame className="size-5" />} label="Top Emerging Cluster" value={topCluster?.clusterName ?? "—"} small />
              <Kpi tone="chrome" icon={<Video className="size-5" />} label="Videos Analyzed" value={String(videoCount)} />
            </section>

            {/* Unclaimed gaps */}
            {brief.unclaimedGaps?.length > 0 && (
              <section className="rounded-3xl border-2 border-black bg-[#39ff14] p-5 text-black shadow-[8px_8px_0_#8b2dff] sm:p-7">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 font-display text-xl font-black uppercase tracking-tight">
                    <Target className="size-5" /> Unclaimed Content Gaps
                  </h2>
                  <span className="rounded-full bg-black px-3 py-1 font-display text-[10px] font-bold uppercase tracking-wider text-[#39ff14]">
                    {competitorsMock ? "Vs sample competitors" : "Vs your competitors"}
                  </span>
                </div>
                <p className="mb-5 max-w-3xl font-normal leading-snug">
                  High-demand topics your competitors haven&apos;t covered yet. Be first.
                </p>
                <div className="grid gap-4 md:grid-cols-3">
                  {brief.unclaimedGaps.map((g, i) => (
                    <article
                      key={g.topic}
                      className={
                        "flex flex-col gap-2.5 rounded-2xl border-2 border-black bg-black p-4 text-zinc-200 " +
                        (i % 2 ? "rotate-[0.5deg]" : "-rotate-[0.5deg]")
                      }
                    >
                      <span className="w-fit rounded-full bg-[#a64dff] px-3 py-1 font-display text-[11px] font-black uppercase leading-tight tracking-wide text-white">
                        {g.topic}
                      </span>
                      <p className="text-sm font-light leading-relaxed">{g.reason}</p>
                      <div className="mt-auto rounded-xl border-2 border-[#39ff14] p-3">
                        <h3 className="mb-1 font-display text-[10px] font-bold uppercase tracking-widest text-[#39ff14]">
                          Suggested angle
                        </h3>
                        <p className="text-sm font-medium leading-snug text-white">{g.suggestedAngle}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* Chart */}
            <section className="rounded-3xl border-2 border-zinc-700 bg-black/70 p-4 shadow-[6px_6px_0_#8b2dff] sm:p-6">
              <h2 className="mb-4 font-display text-lg font-black uppercase tracking-tight">
                <span className="chrome-text">Who&apos;s winning</span>{" "}
                <span className="font-light text-zinc-400">/ videos per cluster</span>
              </h2>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={brief.themeClusters} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2a2a35" />
                    <XAxis
                      dataKey="clusterName"
                      tick={{ fontSize: 12, fill: "#a1a1aa" }}
                      stroke="#3f3f46"
                      interval={0}
                      tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 17)}…` : v)}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#a1a1aa" }} stroke="#3f3f46" />
                    <Tooltip
                      cursor={{ fill: "rgba(166,77,255,0.15)" }}
                      contentStyle={{ background: "#000", border: "2px solid #39ff14", borderRadius: 12, color: "#fff" }}
                      labelStyle={{ color: "#39ff14", fontWeight: 700 }}
                      itemStyle={{ color: "#fff" }}
                    />
                    <Bar dataKey="videoCount" name="Videos" radius={[8, 8, 0, 0]}>
                      {brief.themeClusters.map((c, i) => (
                        <Cell key={c.clusterName} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Cluster cards */}
            <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {brief.themeClusters.map((c, i) => (
                <article
                  key={c.clusterName}
                  className={
                    "flex flex-col gap-4 rounded-2xl border-2 bg-zinc-950 p-5 transition hover:-translate-y-1 hover:rotate-0 " +
                    (i % 2 ? "rotate-[0.4deg] border-[#a64dff]" : "-rotate-[0.4deg] border-zinc-500")
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-base font-black uppercase leading-tight tracking-tight text-white">
                      {c.clusterName}
                    </h3>
                    <span className="shrink-0 rounded-full bg-[#8b2dff] px-2.5 py-1 font-display text-[10px] font-bold uppercase text-white">
                      {c.videoCount} {c.videoCount === 1 ? "video" : "videos"}
                    </span>
                  </div>

                  <div>
                    <h4 className="mb-1 font-display text-[10px] font-bold uppercase tracking-widest text-[#a64dff]">Why it&apos;s trending</h4>
                    <p className="font-light leading-relaxed text-zinc-300">{c.whyItIsTrending}</p>
                  </div>

                  <div className="rounded-xl border-2 border-black bg-[#39ff14] p-3.5 text-black shadow-[4px_4px_0_#8b2dff]">
                    <h4 className="mb-1 flex items-center gap-1.5 font-display text-[10px] font-black uppercase tracking-widest">
                      <Lightbulb className="size-3.5" /> The Pitch
                    </h4>
                    <p className="font-display text-sm font-bold leading-snug">{c.suggestedVideoTitle}</p>
                    <p className="mt-1.5 text-sm font-normal leading-snug">{c.angleOrHook}</p>
                  </div>

                  <div className="mt-auto flex flex-col items-start gap-3">
                    <span className="chrome-bg inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-display text-[10px] font-bold uppercase tracking-wide text-black">
                      <Clock className="size-3.5" /> {c.recommendedDuration}
                    </span>
                    <button
                      type="button"
                      onClick={() => openScript(c)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#a64dff] px-3 py-2.5 font-display text-[10px] font-black uppercase tracking-wider text-[#c9a0ff] transition hover:bg-[#a64dff] hover:text-white"
                    >
                      <FileText className="size-3.5" /> Generate Script &amp; Thumbnail Prompts
                    </button>
                  </div>
                </article>
              ))}
            </section>
          </div>
        )}
      </main>

      {scriptFor && (
        <ScriptModal
          cluster={scriptFor}
          script={script}
          loading={scriptLoading}
          error={scriptError}
          onClose={closeScript}
          onRetry={() => openScript(scriptFor)}
        />
      )}
    </div>
  );
}

function CopyButton({ text, label, className = "" }: { text: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be blocked (insecure context / permissions); fail quietly.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={
        "inline-flex items-center gap-1.5 rounded-lg border-2 border-black px-3 py-1.5 font-display text-[10px] font-black uppercase tracking-wider transition active:translate-y-0.5 " +
        (copied ? "bg-white text-black" : "bg-[#39ff14] text-black hover:bg-[#6bff4d]") +
        " " +
        className
      }
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied!" : label}
    </button>
  );
}

function ScriptModal({
  cluster,
  script,
  loading,
  error,
  onClose,
  onRetry,
}: {
  cluster: ThemeCluster;
  script: ScriptPackage | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
}) {
  const hookSteps = script
    ? [
        { n: "01", label: "Hook line", text: script.hook.hookLine, tone: "bg-[#39ff14] text-black" },
        { n: "02", label: "Problem setup", text: script.hook.problemSetup, tone: "bg-[#8b2dff] text-white" },
        { n: "03", label: "Payoff", text: script.hook.payoff, tone: "chrome-bg text-black" },
      ]
    : [];

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Script and thumbnail prompts"
        onClick={(e) => e.stopPropagation()}
        className="mx-auto max-w-3xl rounded-3xl border-2 border-[#39ff14] bg-[#0b0814] p-5 text-zinc-200 shadow-[8px_8px_0_#8b2dff] sm:p-7"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <span className="font-display text-[10px] font-bold uppercase tracking-widest text-[#a64dff]">
              Script &amp; thumbnails
            </span>
            <h2 className="font-display text-xl font-black uppercase leading-tight tracking-tight text-white">
              {cluster.clusterName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg border-2 border-zinc-600 p-1.5 text-zinc-300 transition hover:border-[#39ff14] hover:text-[#39ff14]"
          >
            <X className="size-4" />
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-3 py-16 font-display text-sm font-bold uppercase tracking-wide text-[#39ff14]">
            <Loader2 className="size-5 animate-spin" /> Writing your script…
          </div>
        )}

        {error && !loading && (
          <div role="alert" className="space-y-3 rounded-xl border-2 border-red-500 bg-red-500/10 p-4 text-sm font-medium text-red-200">
            <p>Couldn&apos;t generate the script: {error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="rounded-lg border-2 border-red-400 px-3 py-1.5 font-display text-[10px] font-black uppercase tracking-wider hover:bg-red-400 hover:text-black"
            >
              Try again
            </button>
          </div>
        )}

        {script && !loading && (
          <div className="space-y-7">
            <section>
              <h3 className="mb-3 font-display text-xs font-black uppercase tracking-widest text-[#39ff14]">
                3-part hook
              </h3>
              <div className="space-y-3">
                {hookSteps.map((h) => (
                  <div key={h.n} className={"rounded-xl border-2 border-black p-4 " + h.tone}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="font-display text-[10px] font-black uppercase tracking-widest opacity-80">
                        {h.n} · {h.label}
                      </span>
                      <CopyButton text={h.text} label="Copy" className="!border-black/60 !bg-black/80 !text-white hover:!bg-black" />
                    </div>
                    <p className="text-base font-medium leading-snug">{h.text}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-3 font-display text-xs font-black uppercase tracking-widest text-[#39ff14]">
                Title ideas <span className="font-light normal-case text-zinc-500">(click to copy)</span>
              </h3>
              <ul className="space-y-2">
                {script.titleVariations.map((t) => (
                  <li key={t}>
                    <TitleChip title={t} />
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="mb-3 font-display text-xs font-black uppercase tracking-widest text-[#39ff14]">
                Thumbnail concepts
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {script.thumbnailConcepts.map((t, i) => (
                  <article key={i} className="flex flex-col gap-3 rounded-2xl border-2 border-[#a64dff] bg-black p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-[10px] font-bold uppercase tracking-widest text-[#a64dff]">
                        Concept {i + 1}
                      </span>
                      <span className="rounded bg-[#39ff14] px-2 py-0.5 font-display text-[10px] font-black uppercase text-black">
                        {t.overlayText}
                      </span>
                    </div>
                    <p className="text-sm font-light leading-relaxed">{t.visualDescription}</p>
                    <div className="mt-auto space-y-2 rounded-xl border border-zinc-700 bg-zinc-950 p-3">
                      <h4 className="font-display text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        Midjourney / Ideogram prompt
                      </h4>
                      <p className="font-mono text-xs leading-relaxed text-zinc-300">{t.aiPrompt}</p>
                      <CopyButton text={t.aiPrompt} label="Copy Prompt" />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function TitleChip({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(title);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable; ignore.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="flex w-full items-center justify-between gap-3 rounded-xl border-2 border-zinc-600 bg-zinc-950 px-4 py-3 text-left text-base font-medium text-white transition hover:border-[#39ff14]"
    >
      <span>{title}</span>
      <span className="inline-flex shrink-0 items-center gap-1 font-display text-[10px] font-bold uppercase tracking-wider text-[#39ff14]">
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? "Copied!" : "Copy"}
      </span>
    </button>
  );
}

const KPI_TONES = {
  green: "bg-[#39ff14] text-black shadow-[5px_5px_0_#8b2dff]",
  purple: "bg-[#8b2dff] text-white shadow-[5px_5px_0_#39ff14]",
  chrome: "chrome-bg text-black shadow-[5px_5px_0_#8b2dff]",
} as const;

function Kpi({
  icon,
  label,
  value,
  tone,
  small,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: keyof typeof KPI_TONES;
  small?: boolean;
}) {
  return (
    <div className={"rounded-2xl border-2 border-black p-4 " + KPI_TONES[tone]}>
      <div className="mb-2 flex items-center gap-2 font-display text-[10px] font-bold uppercase tracking-widest opacity-80">
        {icon}
        {label}
      </div>
      <p
        className={
          "font-display font-black leading-tight tracking-tight " + (small ? "text-lg" : "text-5xl")
        }
      >
        {value}
      </p>
    </div>
  );
}
