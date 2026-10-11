# YouTube Trend Radar: Components Map

YouTube Trend Radar turns a week of trending YouTube videos into a "Sunday Brief": a short strategy report that tells a creator which topics, formats and video lengths to make next. It targets Indian tech and AI creators by default (region `IN`).

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · Recharts · Lucide icons · YouTube Data API v3 · Google Gen AI SDK (`@google/genai`)

---

## 1. System Architecture & Flow

```text
┌──────────────────────┐   POST { query, regionCode }   ┌───────────────────────────┐
│  User Config Input   │ ─────────────────────────────▶ │  API Endpoint             │
│  app/page.tsx        │                                │  app/api/brief/route.ts   │
└──────────────────────┘                                └─────────────┬─────────────┘
          ▲                                                           │ fetchTrendingVideos(query, regionCode)
          │                                                           ▼
          │                                             ┌───────────────────────────┐
          │                                             │  YouTube Fetcher          │
          │                                             │  lib/youtube.ts           │
          │                                             │  search.list + videos.list│
          │                                             │  (mock-data fallback)     │
          │                                             └─────────────┬─────────────┘
          │                                                           │ TrendingVideo[]
          │                                                           ▼
          │                                             ┌───────────────────────────┐
          │                                             │  Gemini Flash Engine      │
          │                                             │  lib/gemini.ts            │
          │                                             │  structured JSON output   │
          │                                             │  (fallback brief)         │
          │                                             └─────────────┬─────────────┘
          │                                                           │ SundayBrief
          │   { success, brief, videoCount, isMock }                  │
          └───────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────┐
│  Dashboard Strategy Brief View (app/page.tsx)│
│  summary · format tags · KPIs · chart · cards│
└──────────────────────────────────────────────┘
```

### Request lifecycle

1. **User config input:** On the dashboard the user picks a region (`IN`, `US`, `GB`) and a topic, using a preset button or the free-text box. They then press **Generate Sunday Brief**.
2. **API call:** The page sends `POST /api/brief` with `{ query, regionCode }`.
3. **Video fetch:** The route calls `fetchTrendingVideos`, which returns up to 50 recent videos with views, likes, comments, duration, channel and publish date. If the YouTube API is unavailable, the function returns realistic sample data instead.
4. **LLM analysis:** The route passes the videos to `generateSundayBrief`. Gemini Flash clusters them into themes and returns a structured brief. If Gemini fails, a heuristic brief is returned instead.
5. **Response:** The route returns `{ success: true, brief, videoCount, isMock }`. Any unhandled error returns HTTP 500 with `{ success: false, error }`.
6. **Render:** The page renders the executive summary, format tags, KPI cards, bar chart and theme cluster cards. It shows an amber banner when `isMock` is true and a red banner on error.

---

## 2. Component & Module Inventory

| File | Type | Responsibility |
| --- | --- | --- |
| `app/page.tsx` | Client component (UI) | Interactive dashboard |
| `app/api/brief/route.ts` | Route handler (server) | Request orchestration |
| `lib/youtube.ts` | Server module | YouTube Data API v3 integration and mock fallback |
| `lib/gemini.ts` | Server module | Gemini analysis and fallback brief |

### `app/page.tsx`: Dashboard UI

An interactive dashboard (`"use client"`) with:

- **Control bar:** a region dropdown (default `IN`), preset buttons (AI Tools, Productivity Apps, Tech Reviews), a custom search input, and a Generate button with a loading spinner.
- **Banners:** amber for sample data (`isMock`) and red for API errors.
- **Executive summary:** the hero block, with `winningFormats` as badge tags.
- **KPI metric cards:** Peak Duration, Top Emerging Cluster (the cluster with the highest video count) and Total Videos Analyzed.
- **Recharts cluster distribution chart:** a bar chart of `clusterName` against `videoCount`.
- **Theme cluster cards grid:** one card per cluster (3 to 5), each with a video count badge, a "Why it's trending" explanation, a highlighted pitch box (`suggestedVideoTitle` and `angleOrHook`) and a recommended duration tag.

### `app/api/brief/route.ts`: Brief API route

A Next.js App Router `POST` handler that orchestrates the pipeline.

- Parses the JSON body, with defaults of `query = 'AI tools productivity'` and `regionCode = 'IN'`. A missing or malformed body falls back to the defaults.
- Calls `fetchTrendingVideos(query, regionCode)`, then `generateSundayBrief(videos)`.
- Returns `{ success: true, brief, videoCount, isMock }`.
- Wraps everything in `try/catch` and returns HTTP 500 for unhandled errors.

### `lib/youtube.ts`: YouTube integration

- `fetchTrendingVideos(query, regionCode = 'IN')` calls YouTube Data API v3 `search.list` (up to 50 recent videos) and then `videos.list` (statistics, duration and snippet for those IDs).
- Returns `TrendingVideo[]` with `viewCount`, `likeCount`, `commentCount`, `duration`, `durationSeconds`, `channelTitle`, `publishedAt`, thumbnail and URL.
- Includes 30 realistic sample videos for Indian tech and AI creators (Cursor reviews, AI productivity hacks, AI video generators and similar). These are used automatically when the API can't be used (see Guardrails).

### `lib/gemini.ts`: Gemini analysis

- `generateSundayBrief(videos)` uses the Google Gen AI SDK with `process.env.GEMINI_MODEL || 'gemini-2.5-flash'`.
- Requests structured JSON output matching the `SundayBrief` schema: `executiveSummary`, `winningFormats`, `durationSweetSpot` and 3 to 5 `themeClusters` (`clusterName`, `videoCount`, `whyItIsTrending`, `suggestedVideoTitle`, `angleOrHook`, `recommendedDuration`).
- Validates the response and falls back to a heuristic brief built from the video data if the call or the validation fails.

---

## 3. Guardrails & Production Reliability Features

| Guardrail | Where | How it works |
| --- | --- | --- |
| **Quota fallback** | `lib/youtube.ts` | Mock data is served when `NEXT_PUBLIC_USE_MOCK_DATA === 'true'`, when `YOUTUBE_API_KEY` is missing, or when any YouTube call fails (quota exceeded, bad key, network error or an empty result). `fetchTrendingVideos` never throws, so the app doesn't crash. |
| **Token efficiency** | `lib/gemini.ts` | Each video description is whitespace-collapsed and truncated to 150 characters. Only the fields needed for analysis are sent to Gemini Flash. |
| **Schema validation** | `lib/gemini.ts` | The request sets `responseMimeType: "application/json"` with a response schema, so Gemini is asked to emit the exact structure. The parsed result is also checked field by field, including 3 to 5 clusters. Any mismatch falls back to the heuristic brief. |
| **LLM fallback brief** | `lib/gemini.ts` | If the API key is missing, the call fails or the output is invalid, a heuristic brief is returned. It groups the videos into five India-focused themes by keyword and derives the duration sweet spot from the median video length. |
| **API error handling** | `app/api/brief/route.ts` | A top-level `try/catch` returns HTTP 500 with a JSON error, and tolerates empty or malformed request bodies. |
| **User transparency** | `app/page.tsx` | An amber banner says when sample data is in use, and a red banner surfaces request errors. |

---

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key (server only) |
| `GEMINI_API_KEY` | Google Gen AI key (server only) |
| `GEMINI_MODEL` | Optional model override (default `gemini-2.5-flash`) |
| `NEXT_PUBLIC_USE_MOCK_DATA` | Set to `true` to force the sample dataset |

## Running Locally

```bash
npm install
npm run dev   # http://localhost:3000
```

With `NEXT_PUBLIC_USE_MOCK_DATA=true`, or with no API keys set, the app runs fully offline on sample data.
