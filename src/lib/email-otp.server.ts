// Server-only helpers for email one-time-password (OTP) verification.
// Codes are never stored in plaintext: only a SHA-256 hash is kept.
import type { Client } from "@libsql/client/web";

export type OtpPurpose = "contact" | "signup";

const CODE_TTL_MS = 10 * 60 * 1000; // code valid for 10 minutes
const TOKEN_TTL_MS = 30 * 60 * 1000; // verified token usable for 30 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute between sends
const MAX_SENDS_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

export const OTP_RESEND_SECONDS = RESEND_COOLDOWN_MS / 1000;

let otpReady = false;

export async function ensureEmailOtpsTable(db: Client): Promise<void> {
  if (otpReady) return;
  await db.execute(`CREATE TABLE IF NOT EXISTS email_otps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    purpose TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    verification_token TEXT,
    verified_at TEXT,
    consumed_at TEXT,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  )`);
  await db.execute(
    `CREATE INDEX IF NOT EXISTS email_otps_lookup ON email_otps (email, purpose, created_at)`,
  );
  await db.execute(
    `CREATE INDEX IF NOT EXISTS email_otps_token ON email_otps (verification_token)`,
  );
  otpReady = true;
}

export async function hashCode(email: string, purpose: string, code: string) {
  const bytes = new TextEncoder().encode(`${email}|${purpose}|${code}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function randomCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0]! % 1_000_000).padStart(6, "0");
}

export function randomToken(): string {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Throws when the address has requested codes too often. */
export async function assertSendAllowed(
  db: Client,
  email: string,
  purpose: OtpPurpose,
): Promise<void> {
  const now = Date.now();
  const recent = await db.execute({
    sql: `SELECT created_at FROM email_otps
          WHERE email = ? AND purpose = ? AND created_at > ?
          ORDER BY created_at DESC`,
    args: [email, purpose, new Date(now - 60 * 60 * 1000).toISOString()],
  });
  if (recent.rows.length >= MAX_SENDS_PER_HOUR) {
    throw new Error(
      "Too many verification codes requested. Please try again in an hour.",
    );
  }
  const last = recent.rows[0]?.["created_at"];
  if (typeof last === "string" && now - Date.parse(last) < RESEND_COOLDOWN_MS) {
    const wait = Math.ceil((RESEND_COOLDOWN_MS - (now - Date.parse(last))) / 1000);
    throw new Error(`Please wait ${wait} seconds before requesting a new code.`);
  }
}

export async function storeCode(
  db: Client,
  email: string,
  purpose: OtpPurpose,
  code: string,
): Promise<void> {
  const now = new Date();
  await db.execute({
    sql: `INSERT INTO email_otps (email, purpose, code_hash, created_at, expires_at)
          VALUES (?, ?, ?, ?, ?)`,
    args: [
      email,
      purpose,
      await hashCode(email, purpose, code),
      now.toISOString(),
      new Date(now.getTime() + CODE_TTL_MS).toISOString(),
    ],
  });
  // Housekeeping: drop rows older than a day.
  await db.execute({
    sql: `DELETE FROM email_otps WHERE created_at < ?`,
    args: [new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()],
  });
}

export type VerifyResult =
  | { ok: true; token: string }
  | { ok: false; message: string };

export async function checkCode(
  db: Client,
  email: string,
  purpose: OtpPurpose,
  code: string,
): Promise<VerifyResult> {
  const now = new Date();
  const res = await db.execute({
    sql: `SELECT id, code_hash, attempts, expires_at FROM email_otps
          WHERE email = ? AND purpose = ? AND consumed_at IS NULL AND verified_at IS NULL
          ORDER BY id DESC LIMIT 1`,
    args: [email, purpose],
  });
  const row = res.rows[0];
  if (!row) {
    return { ok: false, message: "Please request a verification code first." };
  }
  if (Date.parse(String(row["expires_at"])) < now.getTime()) {
    return { ok: false, message: "That code has expired. Please request a new one." };
  }
  const attempts = Number(row["attempts"] ?? 0);
  if (attempts >= MAX_ATTEMPTS) {
    return {
      ok: false,
      message: "Too many incorrect attempts. Please request a new code.",
    };
  }
  const expected = String(row["code_hash"]);
  const given = await hashCode(email, purpose, code);
  if (given !== expected) {
    await db.execute({
      sql: `UPDATE email_otps SET attempts = attempts + 1 WHERE id = ?`,
      args: [row["id"] as number],
    });
    const left = MAX_ATTEMPTS - attempts - 1;
    return {
      ok: false,
      message:
        left > 0
          ? `That code is not correct. ${left} attempt${left === 1 ? "" : "s"} left.`
          : "Too many incorrect attempts. Please request a new code.",
    };
  }
  const token = randomToken();
  await db.execute({
    sql: `UPDATE email_otps SET verified_at = ?, verification_token = ? WHERE id = ?`,
    args: [now.toISOString(), token, row["id"] as number],
  });
  return { ok: true, token };
}

/** Validates a verified token and marks it used. Throws when invalid. */
export async function consumeVerification(
  db: Client,
  email: string,
  purpose: OtpPurpose,
  token: string,
): Promise<void> {
  const res = await db.execute({
    sql: `SELECT id, verified_at FROM email_otps
          WHERE verification_token = ? AND email = ? AND purpose = ?
            AND consumed_at IS NULL LIMIT 1`,
    args: [token, email, purpose],
  });
  const row = res.rows[0];
  const verifiedAt = row ? Date.parse(String(row["verified_at"])) : NaN;
  if (!row || Number.isNaN(verifiedAt) || Date.now() - verifiedAt > TOKEN_TTL_MS) {
    throw new Error("Please verify your email address again before continuing.");
  }
  await db.execute({
    sql: `UPDATE email_otps SET consumed_at = ? WHERE id = ?`,
    args: [new Date().toISOString(), row["id"] as number],
  });
}

export async function sendOtpEmail(email: string, code: string): Promise<void> {
  const { getMailConfig, sendMail } = await import("./mailer.server");
  const config = getMailConfig();
  await sendMail({
    from: { email: config.emailFrom, name: config.fromName },
    to: [{ email }],
    subject: `${code} is your ${config.fromName} verification code`,
    textContent: `Your ${config.fromName} verification code is ${code}.\n\nThis code expires in 10 minutes. If you did not request it, you can safely ignore this email.\n\nTip: verification emails sometimes land in your spam or junk folder.`,
    htmlContent: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#111">
<h2 style="margin:0 0 12px">Your verification code</h2>
<p style="font-size:30px;font-weight:700;letter-spacing:6px;margin:16px 0">${code}</p>
<p>This code expires in 10 minutes. If you did not request it, you can safely ignore this email.</p>
<p style="color:#555;font-size:13px">Tip: verification emails sometimes land in your spam or junk folder.</p>
<p style="margin-top:20px">— The ${config.fromName} team</p>
</div>`,
  });
}
