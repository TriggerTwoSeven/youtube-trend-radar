const YT_BASE = "https://www.googleapis.com/youtube/v3";
const MAX_RESULTS = 50;

export interface TrendingVideo {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string; // ISO 8601
  thumbnailUrl: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string; // ISO 8601 duration, e.g. PT12M34S
  durationSeconds: number;
  url: string;
  /** Set only on competitor uploads. */
  competitorHandle?: string;
}

export type VideoFormat = "any" | "short" | "long";

export const SHORT_MAX_SECONDS = 60;
export const LONG_MIN_SECONDS = 300;

export function matchesFormat(durationSeconds: number, format: VideoFormat): boolean {
  if (format === "short") return durationSeconds > 0 && durationSeconds <= SHORT_MAX_SECONDS;
  if (format === "long") return durationSeconds >= LONG_MIN_SECONDS;
  return true;
}

interface SearchListResponse {
  items?: { id?: { videoId?: string } }[];
}

interface VideosListResponse {
  items?: {
    id: string;
    snippet: {
      title: string;
      description?: string;
      channelTitle: string;
      publishedAt: string;
      thumbnails?: Record<string, { url: string }>;
    };
    contentDetails: { duration: string };
    statistics?: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
    };
  }[];
}

type VideoItem = NonNullable<VideosListResponse["items"]>[number];

interface ChannelsListResponse {
  items?: { contentDetails?: { relatedPlaylists?: { uploads?: string } } }[];
}

interface PlaylistItemsResponse {
  items?: { contentDetails?: { videoId?: string } }[];
}

export function parseIsoDuration(iso: string): number {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return 0;
  const [, d = "0", h = "0", min = "0", s = "0"] = m;
  return +d * 86400 + +h * 3600 + +min * 60 + +s;
}

async function ytGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = `${YT_BASE}/${path}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`YouTube API ${path} failed with status ${res.status}`);
  }
  return (await res.json()) as T;
}

async function fetchFromYouTube(
  query: string,
  regionCode: string,
  apiKey: string,
  format: VideoFormat,
): Promise<TrendingVideo[]> {
  const searchParams: Record<string, string> = {
    part: "snippet",
    q: query,
    type: "video",
    order: "date",
    maxResults: String(MAX_RESULTS),
    regionCode,
    publishedAfter: new Date(Date.now() - 30 * 86400_000).toISOString(),
    key: apiKey,
  };
  // YouTube buckets: short < 4 min, medium 4-20 min, long > 20 min. Shorts map to
  // 'short'; long-form maps to 'medium' (where most 5+ min videos sit). Exact
  // cut-offs (<=60s / >=5 min) are enforced after videos.list returns real durations.
  if (format === "short") searchParams.videoDuration = "short";
  else if (format === "long") searchParams.videoDuration = "medium";

  const search = await ytGet<SearchListResponse>("search", searchParams);

  const ids = (search.items ?? [])
    .map((i) => i.id?.videoId)
    .filter((id): id is string => Boolean(id));
  if (ids.length === 0) throw new Error("YouTube search returned no videos");

  const details = await ytGet<VideosListResponse>("videos", {
    part: "snippet,statistics,contentDetails",
    id: ids.join(","),
    maxResults: String(MAX_RESULTS),
    key: apiKey,
  });

  const videos = (details.items ?? [])
    .map(toTrendingVideo)
    .filter((v) => matchesFormat(v.durationSeconds, format));
  if (videos.length === 0) throw new Error(`No videos matched format "${format}"`);
  return videos;
}

function toTrendingVideo(v: VideoItem): TrendingVideo {
  return {
    id: v.id,
    title: v.snippet.title,
    description: v.snippet.description ?? "",
    channelTitle: v.snippet.channelTitle,
    publishedAt: v.snippet.publishedAt,
    thumbnailUrl:
      v.snippet.thumbnails?.medium?.url ??
      v.snippet.thumbnails?.default?.url ??
      `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`,
    viewCount: Number(v.statistics?.viewCount ?? 0),
    likeCount: Number(v.statistics?.likeCount ?? 0),
    commentCount: Number(v.statistics?.commentCount ?? 0),
    duration: v.contentDetails.duration,
    durationSeconds: parseIsoDuration(v.contentDetails.duration),
    url: `https://www.youtube.com/watch?v=${v.id}`,
  };
}

/**
 * Fetches up to 50 recent videos for a query with stats, optionally limited to
 * Shorts (<=60s) or long-form (>=5 min).
 * Never throws: falls back to mock data when NEXT_PUBLIC_USE_MOCK_DATA === 'true',
 * when no API key is set, or when the YouTube API call fails.
 */
export async function fetchTrendingVideos(
  query: string,
  regionCode: string = "IN",
  videoDuration: VideoFormat = "any",
): Promise<TrendingVideo[]> {
  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true") {
    return getMockVideos(query, videoDuration);
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn("[youtube] YOUTUBE_API_KEY missing; using mock data");
    return getMockVideos(query, videoDuration);
  }

  try {
    return await fetchFromYouTube(query, regionCode, apiKey, videoDuration);
  } catch (err) {
    console.warn("[youtube] API call failed; using mock data:", err);
    return getMockVideos(query, videoDuration);
  }
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

interface MockSeed {
  title: string;
  channel: string;
  views: number;
  likeRate: number;
  commentRate: number;
  duration: string;
  hoursAgo: number;
  description: string;
}

const MOCK_SEEDS: MockSeed[] = [
  { title: "Cursor IDE Review: Is This the Best AI Code Editor in 2026? (Hindi)", channel: "CodeWithHarry Tech", views: 1_240_000, likeRate: 0.052, commentRate: 0.004, duration: "PT14M22S", hoursAgo: 30, description: "Hands-on review of Cursor IDE for Indian developers: agent mode, tab completion and pricing." },
  { title: "Cursor vs GitHub Copilot vs Windsurf - Honest Comparison for Students", channel: "Tech Burner", views: 986_500, likeRate: 0.047, commentRate: 0.0035, duration: "PT18M05S", hoursAgo: 52, description: "Which AI coding assistant is worth it? Tested on real projects." },
  { title: "I Built a Full Stack App in 30 Minutes Using Cursor AI", channel: "Apna College", views: 2_150_000, likeRate: 0.061, commentRate: 0.0052, duration: "PT31M40S", hoursAgo: 96, description: "Build a MERN app from scratch with Cursor and prompt engineering." },
  { title: "5 AI Productivity Hacks That Changed My Life | Notion AI + ChatGPT", channel: "Ali Abdaal India", views: 540_300, likeRate: 0.058, commentRate: 0.0028, duration: "PT11M12S", hoursAgo: 40, description: "Daily workflow automation with AI for students and professionals." },
  { title: "Best AI Video Generators in 2026: Veo, Sora, Runway & Kling Tested", channel: "Beebom", views: 1_870_000, likeRate: 0.044, commentRate: 0.0031, duration: "PT16M48S", hoursAgo: 28, description: "We tested the top text-to-video AI tools so you can pick the right one." },
  { title: "Make Viral YouTube Shorts with AI in 5 Minutes (Free Tools)", channel: "Digital Dollar", views: 723_400, likeRate: 0.049, commentRate: 0.0042, duration: "PT8M31S", hoursAgo: 64, description: "Free AI video generator workflow for Shorts and Reels creators." },
  { title: "Gemini 3 vs ChatGPT-5: Which AI Should You Use? | Hindi", channel: "Technical Guruji", views: 3_020_000, likeRate: 0.056, commentRate: 0.0047, duration: "PT20M15S", hoursAgo: 18, description: "Deep-dive comparison of the latest AI chatbots." },
  { title: "Vibe Coding Explained: Build Apps Without Writing Code", channel: "Chai aur Code", views: 654_800, likeRate: 0.063, commentRate: 0.0061, duration: "PT24M09S", hoursAgo: 120, description: "What vibe coding is, tools to use and its limitations." },
  { title: "This AI Tool Replaced My Entire Editing Team (₹0 Cost)", channel: "Tanay Pratap", views: 412_900, likeRate: 0.051, commentRate: 0.0033, duration: "PT9M47S", hoursAgo: 76, description: "AI editing tools for Indian creators on a budget." },
  { title: "Top 10 AI Tools Every Indian Student Must Use in 2026", channel: "Sandeep Maheshwari", views: 2_640_000, likeRate: 0.067, commentRate: 0.0039, duration: "PT13M26S", hoursAgo: 84, description: "Study smarter with these free AI tools." },
  { title: "Claude Code Tutorial: Build Faster with an AI Terminal Agent", channel: "Kunal Kushwaha", views: 389_200, likeRate: 0.071, commentRate: 0.0066, duration: "PT27M33S", hoursAgo: 36, description: "Getting started with agentic coding from your terminal." },
  { title: "Notion Calendar + AI: My 2026 Productivity Setup", channel: "Dhruv Rathee Shorts", views: 298_600, likeRate: 0.045, commentRate: 0.0024, duration: "PT7M18S", hoursAgo: 150, description: "Time-blocking and planning with AI assistants." },
  { title: "Google Veo 3 India Launch: Create Cinematic Videos from Text", channel: "Gadgets 360", views: 1_120_000, likeRate: 0.039, commentRate: 0.0029, duration: "PT10M02S", hoursAgo: 22, description: "Veo availability, pricing in INR and sample generations." },
  { title: "Top 7 VS Code Extensions + AI Setup for 2026", channel: "Piyush Garg", views: 267_400, likeRate: 0.059, commentRate: 0.0045, duration: "PT15M50S", hoursAgo: 110, description: "Speed up your dev workflow with the best AI extensions." },
  { title: "How I Use AI Agents to Automate My Daily Work (n8n Tutorial)", channel: "Code Help", views: 336_100, likeRate: 0.054, commentRate: 0.0051, duration: "PT22M11S", hoursAgo: 90, description: "Build no-code automations with n8n and LLMs." },
  { title: "AI Girlfriend Apps? The Dark Side of AI Chatbots in India", channel: "Technical Dost", views: 874_500, likeRate: 0.036, commentRate: 0.0072, duration: "PT12M44S", hoursAgo: 58, description: "Privacy and ethical concerns around companion AI." },
  { title: "Perplexity vs Google: Is Search Dead? Real Test", channel: "Trakin Tech", views: 458_700, likeRate: 0.041, commentRate: 0.0027, duration: "PT9M05S", hoursAgo: 46, description: "Comparing AI search to traditional search for everyday queries." },
  { title: "Build Your Own AI Chatbot with Gemini API | Free Tutorial", channel: "Love Babbar", views: 512_300, likeRate: 0.068, commentRate: 0.0058, duration: "PT35M20S", hoursAgo: 132, description: "Step-by-step Gemini API tutorial with Next.js." },
  { title: "Best Budget Laptops for AI & Coding Under ₹60,000", channel: "Mrwhosetheboss India", views: 1_430_000, likeRate: 0.043, commentRate: 0.0036, duration: "PT17M29S", hoursAgo: 70, description: "Our picks for students learning ML and web dev." },
  { title: "Cursor Rules & Prompts: 10x Your AI Coding Output", channel: "Hitesh Choudhary", views: 721_000, likeRate: 0.073, commentRate: 0.0063, duration: "PT19M37S", hoursAgo: 14, description: "Advanced Cursor workflows, rules files and MCP." },
  { title: "Pika vs Runway vs Kling: Best AI Video Generator for Reels", channel: "Mayur Creates", views: 305_800, likeRate: 0.048, commentRate: 0.0034, duration: "PT12M58S", hoursAgo: 100, description: "Side-by-side generations for Instagram Reels." },
  { title: "Deep Work + AI: How I Study 8 Hours Without Burnout", channel: "Prashant Kirad", views: 645_200, likeRate: 0.066, commentRate: 0.0037, duration: "PT10M41S", hoursAgo: 66, description: "A productivity system for JEE and college students." },
  { title: "AI Agents Explained in Hindi: Future of Software Jobs?", channel: "Telusko India", views: 428_400, likeRate: 0.055, commentRate: 0.0049, duration: "PT16M16S", hoursAgo: 88, description: "What agentic AI means for developers' careers." },
  { title: "Windsurf IDE First Look: Cursor Killer?", channel: "Fireship Hindi", views: 218_900, likeRate: 0.05, commentRate: 0.0044, duration: "PT8M12S", hoursAgo: 8, description: "A quick look at Windsurf and its Cascade agent." },
  { title: "ChatGPT Study Mode + NotebookLM: Ultimate Exam Prep Hack", channel: "Physics Wallah Tech", views: 1_560_000, likeRate: 0.062, commentRate: 0.0041, duration: "PT11M55S", hoursAgo: 38, description: "Use NotebookLM to turn notes into podcasts and quizzes." },
  { title: "Top AI Voice Cloning Tools: ElevenLabs Alternatives in India", channel: "Tech with Tim Hindi", views: 187_300, likeRate: 0.046, commentRate: 0.0032, duration: "PT10M20S", hoursAgo: 144, description: "Natural Hindi text-to-speech and voice cloning compared." },
  { title: "Zero to Deployed: Next.js + AI App in 1 Hour with Cursor", channel: "Code With Antonio India", views: 342_000, likeRate: 0.074, commentRate: 0.0068, duration: "PT58M30S", hoursAgo: 24, description: "Full tutorial including Vercel deployment." },
  { title: "iPhone vs Pixel AI Features: Real-World India Test", channel: "Geekyranjit", views: 934_600, likeRate: 0.04, commentRate: 0.0038, duration: "PT14M08S", hoursAgo: 60, description: "On-device AI features compared in everyday use." },
  { title: "10 Mac Productivity Apps + AI Shortcuts You Need", channel: "Tech Zaada", views: 156_700, likeRate: 0.053, commentRate: 0.0029, duration: "PT9M33S", hoursAgo: 160, description: "Raycast, Arc and AI workflow shortcuts for developers." },
  { title: "AI Shorts Factory: Earn ₹1 Lakh/Month with Faceless Channels?", channel: "Hustle With AI", views: 1_030_000, likeRate: 0.035, commentRate: 0.0065, duration: "PT13M01S", hoursAgo: 48, description: "Reality check on faceless AI YouTube channels." },
  // Shorts (<= 60s)
  { title: "Cursor AI in 60 Seconds: Build a Website #shorts", channel: "Code Short India", views: 2_340_000, likeRate: 0.081, commentRate: 0.0021, duration: "PT58S", hoursAgo: 20, description: "One-minute Cursor demo." },
  { title: "This AI Tool Edits Videos For You (Free) #shorts", channel: "Tech Reels Hindi", views: 3_870_000, likeRate: 0.074, commentRate: 0.0019, duration: "PT45S", hoursAgo: 34, description: "Free AI video editor that cuts silences and adds captions." },
  { title: "3 ChatGPT Prompts That Save 2 Hours a Day #shorts", channel: "Productivity Bhai", views: 1_620_000, likeRate: 0.069, commentRate: 0.0024, duration: "PT52S", hoursAgo: 42, description: "Quick prompt hacks for students and professionals." },
  { title: "Veo 3 Made This Ad in 1 Prompt #shorts", channel: "AI Reels India", views: 4_510_000, likeRate: 0.088, commentRate: 0.0017, duration: "PT30S", hoursAgo: 16, description: "Text-to-video ad generated end to end by AI." },
  { title: "Notion AI Setup in 1 Minute #shorts", channel: "Notion Nerd India", views: 876_400, likeRate: 0.061, commentRate: 0.0022, duration: "PT59S", hoursAgo: 60, description: "Fast productivity setup using Notion AI." },
  { title: "VS Code Shortcut Every Dev Must Know #shorts", channel: "Dev Shorts Hindi", views: 1_190_000, likeRate: 0.072, commentRate: 0.0026, duration: "PT37S", hoursAgo: 28, description: "A shortcut that speeds up coding." },
  { title: "Gemini vs ChatGPT: One Question, Two Answers #shorts", channel: "Tech Burner Shorts", views: 2_760_000, likeRate: 0.066, commentRate: 0.0031, duration: "PT48S", hoursAgo: 12, description: "Quick head-to-head AI chatbot test." },
  { title: "Vibe Coding a Game in 60s With AI #shorts", channel: "Chai Shorts", views: 987_300, likeRate: 0.077, commentRate: 0.0028, duration: "PT55S", hoursAgo: 8, description: "Prompt-to-playable game demo." },
];

function getMockVideos(query: string, format: VideoFormat = "any"): TrendingVideo[] {
  const q = query.trim().toLowerCase();
  const now = Date.now();

  const allVideos = MOCK_SEEDS.map((s, i): TrendingVideo => {
    const id = `mock_${String(i + 1).padStart(3, "0")}`;
    return {
      id,
      title: s.title,
      description: s.description,
      channelTitle: s.channel,
      publishedAt: new Date(now - s.hoursAgo * 3600_000).toISOString(),
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
      viewCount: s.views,
      likeCount: Math.round(s.views * s.likeRate),
      commentCount: Math.round(s.views * s.commentRate),
      duration: s.duration,
      durationSeconds: parseIsoDuration(s.duration),
      url: `https://www.youtube.com/watch?v=${id}`,
    };
  });

  const all = allVideos.filter((v) => matchesFormat(v.durationSeconds, format));

  // Prefer videos matching the query, but always return a usable list.
  const terms = q.split(/\s+/).filter(Boolean);
  const matches = terms.length
    ? all.filter((v) => {
        const hay = `${v.title} ${v.description}`.toLowerCase();
        return terms.some((t) => hay.includes(t));
      })
    : all;
  const rest = all.filter((v) => !matches.includes(v));
  return [...matches, ...rest].slice(0, MAX_RESULTS);
}

// ---------------------------------------------------------------------------
// Competitor uploads
// ---------------------------------------------------------------------------

const MAX_COMPETITOR_HANDLES = 5;
const UPLOADS_PER_COMPETITOR = 10;

async function fetchChannelUploads(handle: string, apiKey: string): Promise<TrendingVideo[]> {
  const channels = await ytGet<ChannelsListResponse>("channels", {
    part: "contentDetails",
    forHandle: handle,
    key: apiKey,
  });
  const uploads = channels.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) return [];

  const playlist = await ytGet<PlaylistItemsResponse>("playlistItems", {
    part: "contentDetails",
    playlistId: uploads,
    maxResults: String(UPLOADS_PER_COMPETITOR),
    key: apiKey,
  });
  const ids = (playlist.items ?? [])
    .map((i) => i.contentDetails?.videoId)
    .filter((id): id is string => Boolean(id));
  if (ids.length === 0) return [];

  const details = await ytGet<VideosListResponse>("videos", {
    part: "snippet,statistics,contentDetails",
    id: ids.join(","),
    key: apiKey,
  });
  return (details.items ?? []).map((v) => ({ ...toTrendingVideo(v), competitorHandle: handle }));
}

/**
 * Fetches recent uploads for the given channel handles (e.g. "@TechBurner").
 * Uses channels.list + playlistItems.list (about 3 quota units per channel).
 * Returns mock competitor videos when no handles/key are given, in mock mode,
 * or when nothing could be fetched. Never throws.
 */
export async function fetchCompetitorVideos(handles: string[]): Promise<TrendingVideo[]> {
  const clean = [
    ...new Set(
      handles
        .map((h) => h.trim())
        .filter(Boolean)
        .map((h) => (h.startsWith("@") ? h : `@${h}`)),
    ),
  ].slice(0, MAX_COMPETITOR_HANDLES);

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (clean.length === 0 || !apiKey || process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true") {
    return getMockCompetitorVideos(clean);
  }

  const results = await Promise.allSettled(clean.map((h) => fetchChannelUploads(h, apiKey)));
  const videos = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  results.forEach((r, i) => {
    if (r.status === "rejected") console.warn(`[youtube] competitor ${clean[i]} failed:`, r.reason);
  });

  return videos.length > 0 ? videos : getMockCompetitorVideos(clean);
}

// Competitor mocks cover some trending topics (Cursor, model showdowns, laptops)
// and deliberately skip others (NotebookLM, AI agents/n8n, voice cloning, Veo, faceless channels)
// so the "unclaimed gaps" analysis has something real to find.
const MOCK_COMPETITOR_SEEDS = [
  { title: "Cursor vs Copilot: Which AI Editor Wins? (Hindi)", views: 720_000, hoursAgo: 40, duration: "PT16M10S", description: "Comparison of the two most popular AI coding editors." },
  { title: "ChatGPT vs Gemini: Honest Review After 30 Days", views: 1_050_000, hoursAgo: 55, duration: "PT19M02S", description: "Daily-driver comparison of the top AI chatbots." },
  { title: "Best Laptops Under 70,000 for Students in 2026", views: 1_380_000, hoursAgo: 72, duration: "PT15M44S", description: "Budget laptop picks for college and coding." },
  { title: "iPhone 17 vs Pixel 11: Camera and AI Test", views: 1_940_000, hoursAgo: 30, duration: "PT13M31S", description: "Camera and on-device AI features compared." },
  { title: "Top 5 Free AI Tools for Students", views: 610_000, hoursAgo: 90, duration: "PT10M05S", description: "Free AI tools for notes, writing and coding." },
  { title: "I Tried Windsurf for a Week", views: 245_000, hoursAgo: 110, duration: "PT12M20S", description: "Weeklong trial of the Windsurf IDE." },
  { title: "Smartwatch Buying Guide: What Actually Matters", views: 430_000, hoursAgo: 66, duration: "PT11M48S", description: "How to pick a smartwatch in India." },
  { title: "Perplexity Pro Worth It? Real Usage Review", views: 388_000, hoursAgo: 48, duration: "PT9M37S", description: "Is Perplexity Pro worth the subscription?" },
  { title: "Is Your Phone's AI Spying on You?", views: 905_000, hoursAgo: 36, duration: "PT14M26S", description: "Privacy concerns around on-device AI assistants." },
  { title: "Notion Setup for Students (Template)", views: 195_000, hoursAgo: 130, duration: "PT8M52S", description: "Student productivity template walkthrough." },
];

const DEFAULT_MOCK_COMPETITORS = ["@TechBurner", "@Beebom", "@TechnicalGuruji"];

function getMockCompetitorVideos(handles: string[]): TrendingVideo[] {
  const owners = handles.length > 0 ? handles : DEFAULT_MOCK_COMPETITORS;
  const now = Date.now();
  return MOCK_COMPETITOR_SEEDS.map((s, i): TrendingVideo => {
    const id = `mock_comp_${String(i + 1).padStart(3, "0")}`;
    const handle = owners[i % owners.length];
    return {
      id,
      title: s.title,
      description: s.description,
      channelTitle: handle.replace(/^@/, ""),
      publishedAt: new Date(now - s.hoursAgo * 3600_000).toISOString(),
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
      viewCount: s.views,
      likeCount: Math.round(s.views * 0.045),
      commentCount: Math.round(s.views * 0.003),
      duration: s.duration,
      durationSeconds: parseIsoDuration(s.duration),
      url: `https://www.youtube.com/watch?v=${id}`,
      competitorHandle: handle,
    };
  });
}
