import { NextResponse } from "next/server";
import {
  fetchCompetitorVideos,
  fetchTrendingVideos,
  type VideoFormat,
} from "@/lib/youtube";
import { generateSundayBrief } from "@/lib/gemini";

const FORMATS: VideoFormat[] = ["any", "short", "long"];

/** Accepts ["@a", "@b"] or "@a, @b" (or a mix) and returns a clean handle list. */
function parseHandles(input: unknown): string[] {
  const parts = Array.isArray(input) ? input : typeof input === "string" ? [input] : [];
  return [
    ...new Set(
      parts
        .filter((p): p is string => typeof p === "string")
        .flatMap((p) => p.split(","))
        .map((h) => h.trim())
        .filter(Boolean),
    ),
  ];
}

export async function POST(request: Request) {
  try {
    let body: {
      query?: unknown;
      regionCode?: unknown;
      duration?: unknown;
      competitorHandles?: unknown;
    } = {};
    try {
      body = await request.json();
    } catch {
      // Empty or malformed body: fall through to defaults.
    }

    const query =
      typeof body.query === "string" && body.query.trim()
        ? body.query.trim()
        : "AI tools productivity";
    const regionCode =
      typeof body.regionCode === "string" && body.regionCode.trim()
        ? body.regionCode.trim().toUpperCase()
        : "IN";
    const duration: VideoFormat = FORMATS.includes(body.duration as VideoFormat)
      ? (body.duration as VideoFormat)
      : "any";
    const competitorHandles = parseHandles(body.competitorHandles);

    const [videos, competitorVideos] = await Promise.all([
      fetchTrendingVideos(query, regionCode, duration),
      fetchCompetitorVideos(competitorHandles),
    ]);
    const brief = await generateSundayBrief(videos, competitorVideos);

    return NextResponse.json({
      success: true,
      brief,
      videoCount: videos.length,
      isMock:
        process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" ||
        !process.env.YOUTUBE_API_KEY,
      competitorsMock: competitorVideos.every((v) => v.id.startsWith("mock_")),
    });
  } catch (error) {
    console.error("[api/brief] Unhandled error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
