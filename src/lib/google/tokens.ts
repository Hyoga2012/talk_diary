import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { GoogleTokenSet } from "./oauth";

const COOKIE_NAME = "talk_diary_google";

function getSecret() {
  return (
    process.env.GOOGLE_TOKEN_SECRET?.trim() ||
    process.env.GOOGLE_CLIENT_SECRET?.trim() ||
    "talk-diary-dev-secret"
  );
}

function sign(payload: string) {
  const body = Buffer.from(payload).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function unsign(value: string): string | null {
  const [body, sig] = value.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", getSecret())
    .update(body)
    .digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return Buffer.from(body, "base64url").toString("utf8");
}

export async function saveGoogleTokens(tokens: GoogleTokenSet) {
  const jar = await cookies();
  const payload = JSON.stringify(tokens);
  jar.set(COOKIE_NAME, sign(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
}

export async function readGoogleTokens(): Promise<GoogleTokenSet | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    const payload = unsign(raw);
    if (!payload) return null;
    const parsed = JSON.parse(payload) as GoogleTokenSet;
    if (!parsed.access_token && !parsed.refresh_token) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearGoogleTokens() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
