import { NextResponse } from "next/server";
import { getAuthUrl, isGoogleConfigured } from "@/lib/google/oauth";

export async function GET(request: Request) {
  if (!isGoogleConfigured()) {
    return NextResponse.json(
      {
        error:
          "Google OAuth가 아직 설정되지 않았습니다. GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET 을 넣어 주세요.",
      },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get("deviceId") || "anonymous";
  const state = Buffer.from(
    JSON.stringify({ deviceId, t: Date.now() }),
  ).toString("base64url");

  const url = getAuthUrl(state);
  return NextResponse.redirect(url);
}
