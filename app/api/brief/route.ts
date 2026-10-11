import { NextResponse } from "next/server";
import { fetchTrendingVideos } from "@/lib/youtube";
import { generateSundayBrief } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    let body: { query?: unknown; regionCode?: unknown } = {};
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

    const videos = await fetchTrendingVideos(query, regionCode);
    const brief = await generateSundayBrief(videos);

    return NextResponse.json({
      success: true,
      brief,
      videoCount: videos.length,
      isMock:
        process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" ||
        !process.env.YOUTUBE_API_KEY,
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
