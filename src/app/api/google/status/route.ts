import { NextResponse } from "next/server";
import { isGoogleConfigured } from "@/lib/google/oauth";
import { clearGoogleTokens, readGoogleTokens } from "@/lib/google/tokens";

export async function GET() {
  if (!isGoogleConfigured()) {
    return NextResponse.json({
      configured: false,
      connected: false,
      email: null,
    });
  }

  const tokens = await readGoogleTokens();
  return NextResponse.json({
    configured: true,
    connected: Boolean(tokens?.access_token || tokens?.refresh_token),
    email: tokens?.email || null,
  });
}

export async function DELETE() {
  await clearGoogleTokens();
  return NextResponse.json({ ok: true });
}
