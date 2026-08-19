const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function tokenSecret(): string {
  return (
    process.env["SESSION_SECRET"]?.trim() ||
    "dev-only-insecure-session-password-change-me"
  );
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hmacHex(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(tokenSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(value)));
}

export function randomKey(prefix: string, bytes = 24): string {
  const raw = crypto.getRandomValues(new Uint8Array(bytes));
  return `${prefix}-${b64url(raw)}`;
}

export const TOKEN_TTL_SECONDS = 3600;

export async function signToken(appId: number): Promise<{
  token: string;
  expiresIn: number;
}> {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const payload = `${appId}.${exp}`;
  const sig = await hmacHex(`token:${payload}`);
  return {
    token: `${b64url(enc.encode(payload))}.${sig}`,
    expiresIn: TOKEN_TTL_SECONDS,
  };
}

export async function verifyToken(token: string): Promise<number | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  let payload: string;
  try {
    payload = atob(parts[0]!.replace(/-/g, "+").replace(/_/g, "/"));
  } catch {
    return null;
  }
  const expected = await hmacHex(`token:${payload}`);
  if (expected.length !== parts[1]!.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ parts[1]!.charCodeAt(i);
  }
  if (diff !== 0) return null;
  const [appIdRaw, expRaw] = payload.split(".");
  const appId = Number(appIdRaw);
  const exp = Number(expRaw);
  if (!Number.isFinite(appId) || !Number.isFinite(exp)) return null;
  if (exp * 1000 < Date.now()) return null;
  return appId;
}
