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
  MessageSquare,
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

// Brand palette
const GREEN = "#31EC56"; // malachite
const PINK = "#EF036C"; // razzmatazz
const PURPLE = "#EE72F8"; // heliotrope

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

const BAR_COLORS = [PINK, "#000000", PURPLE, GREEN, PINK];

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
    <div className="ring-bg relative min-h-screen overflow-clip text-black">
      {/* Decorative capsules */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -left-40 top-16 h-28 w-[680px] -rotate-[34deg] rounded-full border-b-[12px] border-[#EE72F8] bg-[#EF036C]" />
        <div className="absolute -left-32 top-[300px] h-24 w-[520px] -rotate-[34deg] rounded-full border-b-[10px] border-[#EE72F8] bg-[#EF036C]" />
        <div className="absolute -right-48 top-[420px] h-28 w-[560px] -rotate-[34deg] rounded-full border-b-[12px] border-[#EE72F8] bg-[#EF036C]" />
        <div className="absolute -right-10 -top-10 size-44 rounded-full bg-[#EF036C]" />
      </div>

      <div className="relative z-10">
        {/* Ticker */}
        <div className="overflow-hidden border-b-[3px] border-black bg-black py-2 text-white" aria-hidden="true">
          <div className="marquee-track font-label text-xs font-bold uppercase tracking-widest">
            {[...TICKER, ...TICKER, ...TICKER, ...TICKER].map((t, i) => (
              <span key={i} className="mx-4 whitespace-nowrap">
                {t} <span className="mx-2 text-[#EF036C]">✦</span>
              </span>
            ))}
          </div>
        </div>

        <header className="mx-auto max-w-6xl px-4 pb-4 pt-12 sm:px-6">
          <p className="inline-block max-w-xl bg-black px-4 py-3 font-label text-sm font-bold uppercase leading-snug tracking-wide text-white sm:text-base">
            Trend Radar is a weekly YouTube strategy brief for creators who post loud
          </p>
          <h1 className="mt-0 block w-fit max-w-full border-[3px] border-black bg-white px-5 py-4 font-display text-4xl font-black uppercase leading-[1.05] tracking-tight shadow-[8px_8px_0_#000] sm:px-8 sm:py-6 sm:text-7xl">
            We find what
            <br />
            goes viral
            <br />
            <span className="text-[#EF036C]">next</span>
          </h1>
        </header>

        <main className="mx-auto max-w-6xl space-y-8 px-4 pb-16 pt-6 sm:px-6">
          {/* Control bar */}
          <section className="space-y-4 border-[3px] border-black bg-white p-4 shadow-[8px_8px_0_#000] sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <select
                aria-label="Region"
                value={regionCode}
                onChange={(e) => setRegionCode(e.target.value)}
                className="h-12 border-[3px] border-black bg-white px-3 font-label text-sm font-bold uppercase focus:outline-none focus:ring-4 focus:ring-[#EE72F8]"
              >
                {REGIONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </select>

              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !loading && generate()}
                  placeholder="Search a topic, e.g. Cursor IDE"
                  className="h-12 w-full border-[3px] border-black bg-white pl-10 pr-3 text-base placeholder:text-zinc-500 focus:outline-none focus:ring-4 focus:ring-[#EE72F8]"
                />
              </div>

              <button
                type="button"
                onClick={generate}
                disabled={loading}
                className="inline-flex h-12 items-center justify-center gap-2 border-[3px] border-black bg-black px-5 font-display text-sm font-extrabold uppercase tracking-wide text-white shadow-[5px_5px_0_#31EC56] transition hover:-translate-y-0.5 hover:shadow-[7px_7px_0_#31EC56] active:translate-y-0.5 active:shadow-[2px_2px_0_#31EC56] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {loading ? "Cooking…" : "Generate Sunday Brief"}
                {!loading && <MessageSquare className="size-4" />}
              </button>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div
                role="radiogroup"
                aria-label="Video format"
                className="inline-flex shrink-0 border-[3px] border-black"
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
                        "border-r-[3px] border-black px-3.5 py-2.5 font-label text-xs font-bold uppercase tracking-wide transition last:border-r-0 " +
                        (active ? "bg-[#EF036C] text-white" : "bg-white text-black hover:bg-[#EE72F8]")
                      }
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>

              <div className="relative flex-1">
                <Users className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2" />
                <input
                  type="text"
                  value={competitorHandles}
                  onChange={(e) => setCompetitorHandles(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !loading && generate()}
                  placeholder="Competitor Handles (e.g., @TechBurner, @MKBHD)"
                  aria-label="Competitor handles"
                  className="h-11 w-full border-[3px] border-black bg-white pl-10 pr-3 text-base placeholder:text-zinc-500 focus:outline-none focus:ring-4 focus:ring-[#EE72F8]"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="font-label text-xs font-bold uppercase tracking-widest">Quick picks</span>
              {PRESETS.map((p) => {
                const active = query.trim().toLowerCase() === p.query.toLowerCase();
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setQuery(p.query)}
                    className={
                      "rounded-full border-[3px] border-black px-3.5 py-1 text-sm font-semibold transition " +
                      (active ? "bg-[#EF036C] text-white" : "bg-white hover:bg-[#EE72F8]")
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
            <div role="status" className="flex items-start gap-3 border-[3px] border-black bg-black p-3 font-label text-sm font-bold uppercase text-[#EE72F8] shadow-[5px_5px_0_#EE72F8]">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>Running on fallback/sample dataset</span>
            </div>
          )}
          {error && (
            <div role="alert" className="flex items-start gap-3 border-[3px] border-black bg-[#EF036C] p-3 text-sm font-semibold text-white shadow-[5px_5px_0_#000]">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>Couldn&apos;t generate the brief: {error}</span>
            </div>
          )}

          {!brief && !loading && !error && (
            <div className="border-[3px] border-dashed border-black bg-white/80 p-12 text-center">
              <Clapperboard className="mx-auto mb-3 size-10" />
              <p className="font-display text-xl font-black uppercase">Nothing cooking yet</p>
              <p className="mt-1 font-light">
                Pick a region and topic, then hit <span className="font-bold">Generate Sunday Brief</span>.
              </p>
            </div>
          )}

          {loading && !brief && (
            <div className="flex items-center justify-center gap-3 border-[3px] border-black bg-white p-12 font-display text-sm font-extrabold uppercase tracking-wide shadow-[8px_8px_0_#000]">
              <Loader2 className="size-5 animate-spin" /> Scanning the algorithm…
            </div>
          )}

          {brief && (
            <div className={"space-y-8 transition-opacity " + (loading ? "opacity-60" : "")}>
              {/* Executive summary */}
              <section>
                <p className="inline-flex items-center gap-2 bg-black px-3 py-2 font-label text-xs font-bold uppercase tracking-widest text-white">
                  <Lightbulb className="size-3.5" /> The Tea
                </p>
                <div className="border-[3px] border-black bg-white p-6 shadow-[8px_8px_0_#EF036C] sm:p-8">
                  <p className="text-xl font-medium leading-relaxed sm:text-2xl">{brief.executiveSummary}</p>
                  <div className="mt-5 flex flex-wrap gap-2.5">
                    {brief.winningFormats.map((f, i) => (
                      <span
                        key={f}
                        className={
                          "border-[3px] border-black px-3.5 py-1 font-label text-xs font-bold uppercase tracking-wide shadow-[3px_3px_0_#000] " +
                          (i % 2 ? "bg-[#EE72F8]" : "bg-[#31EC56]")
                        }
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </section>

              {/* KPI cards */}
              <section className="grid gap-5 sm:grid-cols-3">
                <Kpi tone="pink" icon={<Clock className="size-5" />} label="Peak Duration" value={brief.durationSweetSpot} small />
                <Kpi tone="purple" icon={<Flame className="size-5" />} label="Top Emerging Cluster" value={topCluster?.clusterName ?? "—"} small />
                <Kpi tone="black" icon={<Video className="size-5" />} label="Videos Analyzed" value={String(videoCount)} />
              </section>

              {/* Unclaimed gaps */}
              {brief.unclaimedGaps?.length > 0 && (
                <section className="border-[3px] border-black bg-black p-5 text-white shadow-[8px_8px_0_#EE72F8] sm:p-7">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="flex items-center gap-2 font-display text-xl font-black uppercase tracking-tight text-[#31EC56] sm:text-2xl">
                      <Target className="size-5" /> Unclaimed Content Gaps
                    </h2>
                    <span className="bg-[#31EC56] px-3 py-1 font-label text-xs font-bold uppercase tracking-wider text-black">
                      {competitorsMock ? "Vs sample competitors" : "Vs your competitors"}
                    </span>
                  </div>
                  <p className="mb-5 max-w-3xl font-light leading-snug">
                    High-demand topics your competitors haven&apos;t covered yet. Be first.
                  </p>
                  <div className="grid gap-5 md:grid-cols-3">
                    {brief.unclaimedGaps.map((g) => (
                      <article key={g.topic} className="flex flex-col gap-3 border-[3px] border-white bg-[#EE72F8] p-4 text-black">
                        <span className="w-fit bg-black px-3 py-1 font-label text-xs font-bold uppercase leading-tight tracking-wide text-[#31EC56]">
                          {g.topic}
                        </span>
                        <p className="text-sm leading-relaxed">{g.reason}</p>
                        <div className="mt-auto border-[3px] border-black bg-white p-3">
                          <h3 className="mb-1 font-label text-[11px] font-bold uppercase tracking-widest text-[#EF036C]">
                            Suggested angle
                          </h3>
                          <p className="text-sm font-semibold leading-snug">{g.suggestedAngle}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {/* Chart */}
              <section className="border-[3px] border-black bg-white p-4 shadow-[8px_8px_0_#000] sm:p-6">
                <h2 className="mb-4 font-display text-xl font-black uppercase tracking-tight">
                  Who&apos;s winning <span className="font-light normal-case text-zinc-600">/ videos per cluster</span>
                </h2>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={brief.themeClusters} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d4d4d8" />
                      <XAxis
                        dataKey="clusterName"
                        tick={{ fontSize: 12, fill: "#000" }}
                        stroke="#000"
                        interval={0}
                        tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 17)}…` : v)}
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#000" }} stroke="#000" />
                      <Tooltip
                        cursor={{ fill: "rgba(238,114,248,0.25)" }}
                        contentStyle={{ background: "#fff", border: "3px solid #000", borderRadius: 0, color: "#000" }}
                        labelStyle={{ color: "#EF036C", fontWeight: 700 }}
                        itemStyle={{ color: "#000" }}
                      />
                      <Bar dataKey="videoCount" name="Videos" stroke="#000" strokeWidth={3}>
                        {brief.themeClusters.map((c, i) => (
                          <Cell key={c.clusterName} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* Cluster cards */}
              <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {brief.themeClusters.map((c) => (
                  <article
                    key={c.clusterName}
                    className="flex flex-col gap-4 border-[3px] border-black bg-white p-5 shadow-[6px_6px_0_#000] transition hover:-translate-y-0.5 hover:shadow-[9px_9px_0_#000]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-base font-extrabold uppercase leading-tight tracking-tight">
                        {c.clusterName}
                      </h3>
                      <span className="shrink-0 bg-[#EF036C] px-2.5 py-1 font-label text-xs font-bold uppercase text-white">
                        {c.videoCount} {c.videoCount === 1 ? "video" : "videos"}
                      </span>
                    </div>

                    <div>
                      <h4 className="mb-1 font-label text-[11px] font-bold uppercase tracking-widest text-[#EF036C]">
                        Why it&apos;s trending
                      </h4>
                      <p className="font-light leading-relaxed">{c.whyItIsTrending}</p>
                    </div>

                    <div className="border-[3px] border-black bg-[#EE72F8] p-3.5 shadow-[4px_4px_0_#000]">
                      <h4 className="mb-1 flex items-center gap-1.5 font-label text-[11px] font-bold uppercase tracking-widest">
                        <Lightbulb className="size-3.5" /> The Pitch
                      </h4>
                      <p className="font-display text-sm font-bold leading-snug">{c.suggestedVideoTitle}</p>
                      <p className="mt-1.5 text-sm leading-snug">{c.angleOrHook}</p>
                    </div>

                    <div className="mt-auto flex flex-col items-start gap-3">
                      <span className="inline-flex items-center gap-1.5 bg-black px-3 py-1 font-label text-xs font-bold uppercase tracking-wide text-white">
                        <Clock className="size-3.5" /> {c.recommendedDuration}
                      </span>
                      <button
                        type="button"
                        onClick={() => openScript(c)}
                        className="inline-flex w-full items-center justify-center gap-2 border-[3px] border-black bg-[#31EC56] px-3 py-2.5 font-display text-xs font-extrabold uppercase tracking-wide shadow-[4px_4px_0_#000] transition hover:-translate-y-0.5 hover:bg-[#EF036C] hover:text-white active:translate-y-0.5 active:shadow-[1px_1px_0_#000]"
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
      </div>

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
        "inline-flex items-center gap-1.5 border-[3px] border-black px-3 py-1.5 font-label text-xs font-bold uppercase tracking-wider transition active:translate-y-0.5 " +
        (copied ? "bg-white text-black" : "bg-[#31EC56] text-black hover:bg-[#EE72F8]") +
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
        { n: "01", label: "Hook line", text: script.hook.hookLine, tone: "bg-[#31EC56] text-black" },
        { n: "02", label: "Problem setup", text: script.hook.problemSetup, tone: "bg-[#EE72F8] text-black" },
        { n: "03", label: "Payoff", text: script.hook.payoff, tone: "bg-[#EF036C] text-white" },
      ]
    : [];

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Script and thumbnail prompts"
        onClick={(e) => e.stopPropagation()}
        className="mx-auto max-w-3xl border-[3px] border-black bg-white p-5 text-black shadow-[10px_10px_0_#EF036C] sm:p-7"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <span className="inline-block bg-black px-2.5 py-1 font-label text-[11px] font-bold uppercase tracking-widest text-white">
              Script &amp; thumbnails
            </span>
            <h2 className="mt-2 font-display text-xl font-black uppercase leading-tight tracking-tight sm:text-2xl">
              {cluster.clusterName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 border-[3px] border-black p-1.5 transition hover:bg-[#EF036C] hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-3 py-16 font-display text-sm font-extrabold uppercase tracking-wide">
            <Loader2 className="size-5 animate-spin" /> Writing your script…
          </div>
        )}

        {error && !loading && (
          <div role="alert" className="space-y-3 border-[3px] border-black bg-[#EF036C] p-4 text-sm font-semibold text-white">
            <p>Couldn&apos;t generate the script: {error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="border-[3px] border-black bg-white px-3 py-1.5 font-label text-xs font-bold uppercase tracking-wider text-black hover:bg-[#31EC56]"
            >
              Try again
            </button>
          </div>
        )}

        {script && !loading && (
          <div className="space-y-7">
            <section>
              <h3 className="mb-3 font-label text-xs font-bold uppercase tracking-widest">3-part hook</h3>
              <div className="space-y-3">
                {hookSteps.map((h) => (
                  <div key={h.n} className={"border-[3px] border-black p-4 shadow-[4px_4px_0_#000] " + h.tone}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="font-label text-[11px] font-bold uppercase tracking-widest">
                        {h.n} · {h.label}
                      </span>
                      <CopyButton text={h.text} label="Copy" className="!bg-black !text-white hover:!bg-white hover:!text-black" />
                    </div>
                    <p className="text-base font-medium leading-snug">{h.text}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-3 font-label text-xs font-bold uppercase tracking-widest">
                Title ideas <span className="font-normal normal-case text-zinc-600">(click to copy)</span>
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
              <h3 className="mb-3 font-label text-xs font-bold uppercase tracking-widest">Thumbnail concepts</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {script.thumbnailConcepts.map((t, i) => (
                  <article key={i} className="flex flex-col gap-3 border-[3px] border-black bg-white p-4 shadow-[4px_4px_0_#EE72F8]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-label text-[11px] font-bold uppercase tracking-widest text-[#EF036C]">
                        Concept {i + 1}
                      </span>
                      <span className="bg-[#31EC56] px-2 py-0.5 font-label text-xs font-bold uppercase">
                        {t.overlayText}
                      </span>
                    </div>
                    <p className="text-sm font-light leading-relaxed">{t.visualDescription}</p>
                    <div className="mt-auto space-y-2 bg-black p-3 text-white">
                      <h4 className="font-label text-[11px] font-bold uppercase tracking-widest text-[#EE72F8]">
                        Midjourney / Ideogram prompt
                      </h4>
                      <p className="font-label text-xs leading-relaxed text-[#31EC56]">{t.aiPrompt}</p>
                      <CopyButton text={t.aiPrompt} label="Copy Prompt" className="!border-white" />
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
      className="flex w-full items-center justify-between gap-3 border-[3px] border-black bg-white px-4 py-3 text-left text-base font-semibold shadow-[3px_3px_0_#000] transition hover:bg-[#EE72F8]"
    >
      <span>{title}</span>
      <span className="inline-flex shrink-0 items-center gap-1 font-label text-xs font-bold uppercase tracking-wider text-[#EF036C]">
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? "Copied!" : "Copy"}
      </span>
    </button>
  );
}

const KPI_TONES = {
  pink: "bg-[#EF036C] text-white",
  purple: "bg-[#EE72F8] text-black",
  black: "bg-black text-[#31EC56]",
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
    <div className={"border-[3px] border-black p-4 shadow-[6px_6px_0_#000] " + KPI_TONES[tone]}>
      <div className="mb-2 flex items-center gap-2 font-label text-xs font-bold uppercase tracking-widest">
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
