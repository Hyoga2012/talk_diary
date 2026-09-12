import { NextResponse } from "next/server";
import { exchangeCode, isGoogleConfigured } from "@/lib/google/oauth";
import { saveGoogleTokens } from "@/lib/google/tokens";

export async function GET(request: Request) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ||
    new URL(request.url).origin;

  if (!isGoogleConfigured()) {
    return NextResponse.redirect(
      `${appUrl}/?google=error&message=${encodeURIComponent("Google OAuth 미설정")}`,
    );
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${appUrl}/?google=error&message=${encodeURIComponent(error)}`,
    );
  }
  if (!code) {
    return NextResponse.redirect(
      `${appUrl}/?google=error&message=${encodeURIComponent("인증 코드 없음")}`,
    );
  }

  try {
    const tokens = await exchangeCode(code);
    if (!tokens.access_token && !tokens.refresh_token) {
      throw new Error("토큰을 받지 못했습니다.");
    }
    await saveGoogleTokens(tokens);
    return NextResponse.redirect(`${appUrl}/?google=connected`);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Google 연결 실패";
    return NextResponse.redirect(
      `${appUrl}/?google=error&message=${encodeURIComponent(message)}`,
    );
  }
}
