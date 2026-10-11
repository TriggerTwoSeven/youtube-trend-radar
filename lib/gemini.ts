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

export interface SundayBrief {
  executiveSummary: string;
  winningFormats: string[];
  durationSweetSpot: string;
  themeClusters: ThemeCluster[];
}

const DEFAULT_MODEL = "gemini-2.5-flash";
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
  },
  required: ["executiveSummary", "winningFormats", "durationSweetSpot", "themeClusters"],
};

const SYSTEM_INSTRUCTION =
  "You are a YouTube content strategist for Indian tech and AI creators. " +
  "Analyse the provided trending videos and write a concise weekly 'Sunday Brief' " +
  "that tells a creator what to make next. Base every claim on the data provided " +
  "(views, likes, comments, duration, publish date). Group videos into 3 to 5 theme " +
  "clusters, and make videoCount reflect how many of the provided videos fit each cluster.";

function truncate(text: unknown, max: number): string {
  const s = typeof text === "string" ? text.replace(/\s+/g, " ").trim() : "";
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function toPromptVideos(videos: any[]) {
  return videos.map((v) => ({
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
function validateBrief(raw: unknown): SundayBrief | null {
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

  return {
    executiveSummary: r.executiveSummary,
    winningFormats: r.winningFormats as string[],
    durationSweetSpot: r.durationSweetSpot,
    themeClusters: clusters,
  };
}

/** Strips ```json fences in case the model wraps its output despite JSON mode. */
function parseJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

export async function generateSundayBrief(videos: any[]): Promise<SundayBrief> {
  const list = Array.isArray(videos) ? videos : [];

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    if (list.length === 0) throw new Error("No videos supplied");

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
      contents:
        "Here are this week's trending YouTube videos (JSON). " +
        "Produce the Sunday Brief.\n\n" +
        JSON.stringify(toPromptVideos(list)),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: BRIEF_SCHEMA,
        temperature: 0.6,
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini");

    const brief = validateBrief(parseJson(text));
    if (!brief) throw new Error("Gemini response did not match the brief schema");
    return brief;
  } catch (err) {
    console.warn("[gemini] Falling back to generated brief:", err);
    return buildFallbackBrief(list);
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

function buildFallbackBrief(videos: Partial<TrendingVideo>[]): SundayBrief {
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
  };
}
