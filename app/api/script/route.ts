import { NextResponse } from "next/server";
import { generateScriptAndThumbnails } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    let body: { clusterName?: unknown; angleOrHook?: unknown } = {};
    try {
      body = await request.json();
    } catch {
      // Fall through to validation below.
    }

    const clusterName = typeof body.clusterName === "string" ? body.clusterName.trim() : "";
    const angleOrHook = typeof body.angleOrHook === "string" ? body.angleOrHook.trim() : "";
    if (!clusterName) {
      return NextResponse.json(
        { success: false, error: "clusterName is required" },
        { status: 400 },
      );
    }

    const script = await generateScriptAndThumbnails(clusterName, angleOrHook);
    return NextResponse.json({ success: true, script });
  } catch (error) {
    console.error("[api/script] Unhandled error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
