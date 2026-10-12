import { GoogleGenAI, Type } from "@google/genai";
import type { TrendingVideo } from "@/lib/youtube";

export interface ThemeCluster {
  clusterName: string;
  videoCount: number;
  whyItIsTrending: string;
  suggestedVideoTitle: string;
  angleOrHook: string;
  recommendedDuration: string;
}

export interface UnclaimedGap {
  topic: string;
  reason: string;
  suggestedAngle: string;
}

export interface SundayBrief {
  executiveSummary: string;
  winningFormats: string[];
  durationSweetSpot: string;
  themeClusters: ThemeCluster[];
  unclaimedGaps: UnclaimedGap[];
}

const DEFAULT_MODEL = "gemini-3.5-flash";
const MAX_DESCRIPTION_CHARS = 150;

const BRIEF_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    executiveSummary: { type: Type.STRING },
    winningFormats: { type: Type.ARRAY, items: { type: Type.STRING } },
    durationSweetSpot: { type: Type.STRING },
    themeClusters: {
      type: Type.ARRAY,
      minItems: "3",
      maxItems: "5",
      items: {
        type: Type.OBJECT,
        properties: {
          clusterName: { type: Type.STRING },
          videoCount: { type: Type.INTEGER },
          whyItIsTrending: { type: Type.STRING },
          suggestedVideoTitle: { type: Type.STRING },
          angleOrHook: { type: Type.STRING },
          recommendedDuration: { type: Type.STRING },
        },
        required: [
          "clusterName",
          "videoCount",
          "whyItIsTrending",
          "suggestedVideoTitle",
          "angleOrHook",
          "recommendedDuration",
        ],
      },
    },
    unclaimedGaps: {
      type: Type.ARRAY,
      minItems: "2",
      maxItems: "3",
      items: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          reason: { type: Type.STRING },
          suggestedAngle: { type: Type.STRING },
        },
        required: ["topic", "reason", "suggestedAngle"],
      },
    },
  },
  required: ["executiveSummary", "winningFormats", "durationSweetSpot", "themeClusters", "unclaimedGaps"],
};

const SYSTEM_INSTRUCTION =
  "You are a YouTube content strategist for Indian tech and AI creators. " +
  "Analyse the provided trending videos and write a concise weekly 'Sunday Brief' " +
  "that tells a creator what to make next. Base every claim on the data provided " +
  "(views, likes, comments, duration, publish date). Group videos into 3 to 5 theme " +
  "clusters, and make videoCount reflect how many of the provided videos fit each cluster. " +
  "You are also given recent competitor uploads. Cross-reference the trending topics against " +
  "those competitor uploads and output 2 to 3 unclaimedGaps: high-demand topics from the trending " +
  "videos that the competitors have NOT covered recently. For each, give the topic, the reason " +
  "it is a gap (cite the demand evidence and what competitors posted instead), and a suggestedAngle.";

function truncate(text: unknown, max: number): string {
  const s = typeof text === "string" ? text.replace(/\s+/g, " ").trim() : "";
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPromptVideos(videos: any[]) {
  return videos.map((v) => ({
    ...(v?.competitorHandle ? { competitor: v.competitorHandle } : {}),
    title: v?.title ?? "",
    channel: v?.channelTitle ?? "",
    publishedAt: v?.publishedAt ?? "",
    views: Number(v?.viewCount ?? 0),
    likes: Number(v?.likeCount ?? 0),
    comments: Number(v?.commentCount ?? 0),
    durationSeconds: Number(v?.durationSeconds ?? 0),
    description: truncate(v?.description, MAX_DESCRIPTION_CHARS),
  }));
}

function isNonEmptyString(x: unknown): x is string {
  return typeof x === "string" && x.trim().length > 0;
}

/** Returns a cleaned brief, or null if the shape does not match the schema. */
function validateBrief(raw: unknown, fallbackGaps: UnclaimedGap[]): SundayBrief | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  if (!isNonEmptyString(r.executiveSummary)) return null;
  if (!isNonEmptyString(r.durationSweetSpot)) return null;
  if (!Array.isArray(r.winningFormats) || !r.winningFormats.every(isNonEmptyString)) return null;
  if (!Array.isArray(r.themeClusters)) return null;
  if (r.themeClusters.length < 3 || r.themeClusters.length > 5) return null;

  const clusters: ThemeCluster[] = [];
  for (const c of r.themeClusters) {
    if (!c || typeof c !== "object") return null;
    const o = c as Record<string, unknown>;
    const videoCount = Number(o.videoCount);
    if (
      !isNonEmptyString(o.clusterName) ||
      !Number.isFinite(videoCount) ||
      !isNonEmptyString(o.whyItIsTrending) ||
      !isNonEmptyString(o.suggestedVideoTitle) ||
      !isNonEmptyString(o.angleOrHook) ||
      !isNonEmptyString(o.recommendedDuration)
    ) {
      return null;
    }
    clusters.push({
      clusterName: o.clusterName,
      videoCount: Math.max(0, Math.round(videoCount)),
      whyItIsTrending: o.whyItIsTrending,
      suggestedVideoTitle: o.suggestedVideoTitle,
      angleOrHook: o.angleOrHook,
      recommendedDuration: o.recommendedDuration,
    });
  }

  // Gaps are a secondary section: if Gemini's are malformed, swap in heuristic
  // ones instead of discarding an otherwise valid brief.
  const gaps: UnclaimedGap[] = [];
  if (Array.isArray(r.unclaimedGaps)) {
    for (const g of r.unclaimedGaps) {
      const o = (g && typeof g === "object" ? g : {}) as Record<string, unknown>;
      if (isNonEmptyString(o.topic) && isNonEmptyString(o.reason) && isNonEmptyString(o.suggestedAngle)) {
        gaps.push({ topic: o.topic, reason: o.reason, suggestedAngle: o.suggestedAngle });
      }
    }
  }

  return {
    executiveSummary: r.executiveSummary,
    winningFormats: r.winningFormats as string[],
    durationSweetSpot: r.durationSweetSpot,
    themeClusters: clusters,
    unclaimedGaps: gaps.length >= 2 ? gaps.slice(0, 3) : fallbackGaps,
  };
}

/** Strips ```json fences in case the model wraps its output despite JSON mode. */
function parseJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function generateSundayBrief(
  videos: any[],
  competitorVideos: any[] = [],
): Promise<SundayBrief> {
  /* eslint-enable @typescript-eslint/no-explicit-any */
  const list = Array.isArray(videos) ? videos : [];
  const competitors = Array.isArray(competitorVideos) ? competitorVideos : [];

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    if (list.length === 0) throw new Error("No videos supplied");

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
      contents:
        "Here are this week's trending YouTube videos and recent competitor uploads (JSON). " +
        "Produce the Sunday Brief, including unclaimedGaps.\n\n" +
        JSON.stringify({
          trendingVideos: toPromptVideos(list),
          competitorUploads: toPromptVideos(competitors),
        }),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: BRIEF_SCHEMA,
        temperature: 0.6,
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini");

    const brief = validateBrief(parseJson(text), buildFallbackGaps(list, competitors));
    if (!brief) throw new Error("Gemini response did not match the brief schema");
    return brief;
  } catch (err) {
    console.warn("[gemini] Falling back to generated brief:", err);
    return buildFallbackBrief(list, competitors);
  }
}

// ---------------------------------------------------------------------------
// Fallback
// ---------------------------------------------------------------------------

const FALLBACK_THEMES: {
  name: string;
  keywords: string[];
  why: string;
  title: string;
  hook: string;
  duration: string;
}[] = [
  {
    name: "AI Coding Tools (Cursor, Copilot, Windsurf)",
    keywords: ["cursor", "copilot", "windsurf", "vibe", "claude code", "ide", "vs code", "coding"],
    why: "Indian students and early-career developers are racing to adopt AI editors, and comparison and review videos earn strong comments.",
    title: "I Built a Full App with Cursor in 30 Minutes (Honest Review for Indian Devs)",
    hook: "Show the real build live, including where the AI failed, and end with a clear verdict on pricing in INR.",
    duration: "15-25 minutes",
  },
  {
    name: "AI Productivity Hacks & Study Workflows",
    keywords: ["productivity", "hack", "notion", "study", "notebooklm", "workflow", "automate", "n8n", "agent"],
    why: "Practical, immediately repeatable workflows are saved and shared, especially by students preparing for exams.",
    title: "5 AI Workflows That Saved Me 10 Hours a Week (Free Tools Only)",
    hook: "Open with the time saved, then demo each workflow on screen with a downloadable template.",
    duration: "8-12 minutes",
  },
  {
    name: "AI Video & Creative Generators",
    keywords: ["video", "veo", "sora", "runway", "kling", "pika", "shorts", "reels", "voice", "edit"],
    why: "Creators want cheaper, faster production, and visual before/after results make these videos highly clickable.",
    title: "I Tested Every AI Video Generator So You Don't Have To (Veo vs Runway vs Kling)",
    hook: "Run the same prompt through each tool in a split-screen and rank the results.",
    duration: "10-16 minutes",
  },
  {
    name: "AI Model Showdowns (Gemini, ChatGPT, Perplexity)",
    keywords: ["gemini", "chatgpt", "perplexity", "gpt", "vs", "llm", "chatbot"],
    why: "Head-to-head comparisons capture high-intent search traffic whenever a new model launches.",
    title: "Gemini vs ChatGPT vs Perplexity: Which One Should Indians Actually Pay For?",
    hook: "Score each model on five everyday Indian use cases: exams, coding, Hindi, shopping and research.",
    duration: "12-18 minutes",
  },
  {
    name: "Tech Gear & Careers in the AI Era",
    keywords: ["laptop", "phone", "iphone", "pixel", "career", "jobs", "earn", "budget", "salary"],
    why: "Audiences pair AI curiosity with purchase and career decisions, and budget-in-rupees framing performs well.",
    title: "Best Laptops for AI & Coding Under ₹60,000 in 2026",
    hook: "Benchmark local AI workloads on each laptop and show the real cost-per-performance.",
    duration: "12-17 minutes",
  },
];

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function countMatching(items: Partial<TrendingVideo>[], keywords: string[]): number {
  return items.filter((v) => {
    const hay = `${v.title ?? ""} ${truncate(v.description, MAX_DESCRIPTION_CHARS)}`.toLowerCase();
    return keywords.some((k) => hay.includes(k));
  }).length;
}

/** Themes with trending demand but the fewest competitor uploads. */
function buildFallbackGaps(
  videos: Partial<TrendingVideo>[],
  competitors: Partial<TrendingVideo>[],
): UnclaimedGap[] {
  let rows = FALLBACK_THEMES.map((t) => ({
    t,
    trending: countMatching(videos, t.keywords),
    competitor: countMatching(competitors, t.keywords),
  }));
  const withDemand = rows.filter((r) => r.trending > 0);
  if (withDemand.length >= 2) rows = withDemand;

  return rows
    .sort((a, b) => a.competitor - b.competitor || b.trending - a.trending)
    .slice(0, 3)
    .map(({ t, trending, competitor }) => ({
      topic: t.name,
      reason:
        `${trending} trending video${trending === 1 ? "" : "s"} this week, but ` +
        `${competitor === 0 ? "no" : `only ${competitor}`} recent competitor upload${competitor === 1 ? "" : "s"} cover it. ${t.why}`,
      suggestedAngle: t.hook,
    }));
}

function buildFallbackBrief(
  videos: Partial<TrendingVideo>[],
  competitors: Partial<TrendingVideo>[] = [],
): SundayBrief {
  const haystacks = videos.map((v) => `${v.title ?? ""} ${truncate(v.description, MAX_DESCRIPTION_CHARS)}`.toLowerCase());

  // Score each theme by how many videos match it; keep the top 3-5 (always at least 3).
  const scored = FALLBACK_THEMES.map((t) => ({
    t,
    count: haystacks.filter((h) => t.keywords.some((k) => h.includes(k))).length,
  })).sort((a, b) => b.count - a.count);

  const clusters: ThemeCluster[] = scored.slice(0, Math.max(3, Math.min(5, scored.filter((s) => s.count > 0).length))).map(({ t, count }) => ({
    clusterName: t.name,
    videoCount: count,
    whyItIsTrending: t.why,
    suggestedVideoTitle: t.title,
    angleOrHook: t.hook,
    recommendedDuration: t.duration,
  }));

  const durations = videos.map((v) => Number(v.durationSeconds ?? 0)).filter((d) => d > 0);
  const medMin = Math.round(median(durations) / 60);
  const durationSweetSpot = medMin
    ? `Around ${Math.max(medMin - 3, 5)}-${medMin + 4} minutes (median of this week's trending videos is about ${medMin} minutes)`
    : "10-15 minutes works best for tutorials and comparisons; keep reviews tight at 8-12 minutes";

  const total = videos.length;
  const views = videos.map((v) => Number(v.viewCount ?? 0));
  const medViews = median(views);
  const summaryData = total
    ? ` This week's ${total} sampled videos have a median of ${Math.round(medViews).toLocaleString("en-IN")} views.`
    : "";

  return {
    executiveSummary:
      "AI-powered tooling dominates Indian tech YouTube right now: coding assistants like Cursor, AI productivity workflows and AI video generators are drawing the strongest engagement. Practical, hands-on videos with clear verdicts and rupee-based pricing outperform generic news recaps." +
      summaryData +
      " (This brief was generated from heuristics because live AI analysis was unavailable.)",
    winningFormats: [
      "Head-to-head tool comparisons with a clear winner",
      "Build-along tutorials that ship a working project",
      "Listicles of free AI tools for students and creators",
      "Honest reviews that show failures as well as wins",
    ],
    durationSweetSpot,
    themeClusters: clusters,
    unclaimedGaps: buildFallbackGaps(videos, competitors),
  };
}

// ---------------------------------------------------------------------------
// Script outline & thumbnail concepts
// ---------------------------------------------------------------------------

export interface ThumbnailConcept {
  visualDescription: string;
  overlayText: string;
  aiPrompt: string;
}

export interface ScriptPackage {
  hook: {
    hookLine: string;
    problemSetup: string;
    payoff: string;
  };
  titleVariations: string[];
  thumbnailConcepts: ThumbnailConcept[];
}

const SCRIPT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    hook: {
      type: Type.OBJECT,
      properties: {
        hookLine: { type: Type.STRING },
        problemSetup: { type: Type.STRING },
        payoff: { type: Type.STRING },
      },
      required: ["hookLine", "problemSetup", "payoff"],
    },
    titleVariations: {
      type: Type.ARRAY,
      minItems: "3",
      maxItems: "3",
      items: { type: Type.STRING },
    },
    thumbnailConcepts: {
      type: Type.ARRAY,
      minItems: "2",
      maxItems: "2",
      items: {
        type: Type.OBJECT,
        properties: {
          visualDescription: { type: Type.STRING },
          overlayText: { type: Type.STRING },
          aiPrompt: { type: Type.STRING },
        },
        required: ["visualDescription", "overlayText", "aiPrompt"],
      },
    },
  },
  required: ["hook", "titleVariations", "thumbnailConcepts"],
};

const SCRIPT_SYSTEM_INSTRUCTION =
  "You are a YouTube scriptwriter and thumbnail designer for Indian tech and AI creators. " +
  "Given a content cluster and an angle, write the opening of the video as a 3-part hook " +
  "(hookLine: the first spoken sentence; problemSetup: the pain or curiosity gap the viewer has; " +
  "payoff: what they will get by the end). Write exactly 3 click-optimised title variations " +
  "(under 70 characters, no clickbait lies). Write exactly 2 thumbnail concepts. For each, " +
  "overlayText is 2 to 4 punchy words, and aiPrompt is a ready-to-paste Midjourney/Ideogram prompt " +
  "(subject, composition, lighting, colours, style, and the overlay text spelled out) ending with " +
  "'--ar 16:9'.";

function validateScript(raw: unknown): ScriptPackage | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const h = r.hook as Record<string, unknown> | undefined;
  if (
    !h ||
    !isNonEmptyString(h.hookLine) ||
    !isNonEmptyString(h.problemSetup) ||
    !isNonEmptyString(h.payoff)
  ) {
    return null;
  }
  if (!Array.isArray(r.titleVariations) || r.titleVariations.filter(isNonEmptyString).length < 3) return null;
  if (!Array.isArray(r.thumbnailConcepts)) return null;

  const concepts: ThumbnailConcept[] = [];
  for (const c of r.thumbnailConcepts) {
    const o = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
    if (isNonEmptyString(o.visualDescription) && isNonEmptyString(o.overlayText) && isNonEmptyString(o.aiPrompt)) {
      concepts.push({
        visualDescription: o.visualDescription,
        overlayText: o.overlayText,
        aiPrompt: o.aiPrompt,
      });
    }
  }
  if (concepts.length < 2) return null;

  return {
    hook: { hookLine: h.hookLine, problemSetup: h.problemSetup, payoff: h.payoff },
    titleVariations: (r.titleVariations as string[]).filter(isNonEmptyString).slice(0, 3),
    thumbnailConcepts: concepts.slice(0, 2),
  };
}

export async function generateScriptAndThumbnails(
  clusterName: string,
  angleOrHook: string,
): Promise<ScriptPackage> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
      contents: JSON.stringify({ clusterName, angleOrHook }),
      config: {
        systemInstruction: SCRIPT_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: SCRIPT_SCHEMA,
        temperature: 0.8,
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini");

    const pkg = validateScript(parseJson(text));
    if (!pkg) throw new Error("Gemini response did not match the script schema");
    return pkg;
  } catch (err) {
    console.warn("[gemini] Script generation fell back:", err);
    return buildFallbackScript(clusterName, angleOrHook);
  }
}

function buildFallbackScript(clusterName: string, angleOrHook: string): ScriptPackage {
  const topic = clusterName.replace(/\s*\(.*?\)\s*/g, " ").trim() || "this trend";
  return {
    hook: {
      hookLine: `Everyone is talking about ${topic}, but almost nobody is showing you what actually works.`,
      problemSetup: `You have seen the hype, tried a few things and still don't know what is worth your time. ${angleOrHook}`,
      payoff: `By the end of this video you will have a clear, tested way to use ${topic} this week, with no fluff.`,
    },
    titleVariations: [
      `I Tested ${topic}: Here's What Actually Works`,
      `${topic}: The Honest Truth Nobody Tells You`,
      `Stop Wasting Time: ${topic} Done Right in 2026`,
    ],
    thumbnailConcepts: [
      {
        visualDescription: `Close-up of a shocked creator face on the left, glowing laptop on the right showing ${topic}, neon purple and green rim light on a black background.`,
        overlayText: "IT WORKS?!",
        aiPrompt: `Shocked young Indian creator pointing at a glowing laptop, neon purple and acid green rim lighting, black background, bold sticker-style text reading "IT WORKS?!", high contrast, YouTube thumbnail, cinematic, ultra sharp --ar 16:9`,
      },
      {
        visualDescription: `Split-screen before and after: messy desk with sticky notes versus a clean glowing AI-powered workspace, big arrow between them.`,
        overlayText: "BEFORE vs AFTER",
        aiPrompt: `Split-screen thumbnail, left side chaotic desk with sticky notes in grey tones, right side clean futuristic AI workspace in neon green and purple glow, thick white arrow in the middle, bold text "BEFORE vs AFTER", chrome silver accents, high contrast --ar 16:9`,
      },
    ],
  };
}
