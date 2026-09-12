import { google } from "googleapis";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/tasks.readonly",
  "openid",
  "email",
  "profile",
];

export function isGoogleConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
}

export function getGoogleRedirectUri() {
  const fromEnv = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (fromEnv) return fromEnv;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()?.replace(/\/+$/, "");
  if (appUrl) return `${appUrl}/api/google/callback`;
  return "http://localhost:3000/api/google/callback";
}

export function createOAuthClient() {
  if (!isGoogleConfigured()) {
    throw new Error(
      "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET 이 없습니다. Google Cloud OAuth를 설정해 주세요.",
    );
  }

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getGoogleRedirectUri(),
  );
}

export function getAuthUrl(state: string) {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
    include_granted_scopes: true,
  });
}

export type GoogleTokenSet = {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number | null;
  email?: string | null;
};

export async function exchangeCode(code: string): Promise<GoogleTokenSet> {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  let email: string | null = null;
  try {
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const me = await oauth2.userinfo.get();
    email = me.data.email || null;
  } catch {
    email = null;
  }

  return {
    access_token: tokens.access_token || "",
    refresh_token: tokens.refresh_token || undefined,
    expiry_date: tokens.expiry_date,
    email,
  };
}

export async function getAuthedClient(tokenSet: GoogleTokenSet) {
  const client = createOAuthClient();
  client.setCredentials({
    access_token: tokenSet.access_token,
    refresh_token: tokenSet.refresh_token,
    expiry_date: tokenSet.expiry_date || undefined,
  });

  client.on("tokens", (tokens) => {
    if (tokens.access_token) tokenSet.access_token = tokens.access_token;
    if (tokens.refresh_token) tokenSet.refresh_token = tokens.refresh_token;
    if (tokens.expiry_date) tokenSet.expiry_date = tokens.expiry_date;
  });

  return { client, tokenSet };
}
