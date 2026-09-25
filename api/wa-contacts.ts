// Vercel Node.js serverless function: contact messages API.
// Handles /api/public/wa/contacts in production (the in-app TanStack route is
// not served on Vercel). GET lists messages, POST submits one.
import { createClient } from "@libsql/client/web";
import { appOwnerHasAccess, PLAN_EXPIRED_BODY } from "../src/lib/plan-access.server";
import { createHmac, timingSafeEqual } from "crypto";
import {
  contactInputSchema,
  listContactMessages,
  saveContactMessage,
  type ContactInput,
} from "../src/lib/contacts.server";

export const config = { runtime: "nodejs" };

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function tokenSecret(): string {
  return process.env["SESSION_SECRET"]?.trim() || "dev-only-insecure-session-password-change-me";
}

function verifyToken(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  let payload: string;
  try {
    payload = Buffer.from(parts[0]!.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  } catch {
    return null;
  }
  const expected = createHmac("sha256", tokenSecret()).update(`token:${payload}`).digest("hex");
  const given = parts[1]!;
  if (expected.length !== given.length) return null;
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(given))) return null;
  const [appIdRaw, expRaw] = payload.split(".");
  const appId = Number(appIdRaw);
  const exp = Number(expRaw);
  if (!Number.isFinite(appId) || !Number.isFinite(exp) || exp * 1000 < Date.now()) return null;
  return appId;
}

function send(res: any, status: number, body: unknown) {
  for (const [k, v] of Object.entries(cors)) res.setHeader(k, v);
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.statusCode = status;
  res.end(JSON.stringify(body));
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

async function notify(req: any, input: ContactInput, meta: { appEmail: string; pageTitle: string }) {
  try {
    const pass = process.env["SMTP_PASSWORD"];
    const host = String(req.headers?.["x-forwarded-host"] ?? req.headers?.host ?? "");
    if (!pass || !host) return;
    const secret = createHmac("sha256", pass).update("dreamoztech-mail-relay-v1").digest("hex");
    const attachment = [input.attachment1, input.attachment2]
      .filter((a): a is NonNullable<typeof a> => Boolean(a))
      .map((a) => ({ name: a.name, content: a.data }));
    await fetch(`https://${host}/api/send-mail`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-mail-secret": secret },
      body: JSON.stringify({
        to: [{ email: meta.appEmail.trim() || "support@dreamoztech.com" }],
        replyTo: { email: input.email, name: input.name },
        subject: `[Contact] ${meta.pageTitle || "New message"}`,
        textContent: `Page: ${meta.pageTitle}\nName: ${input.name}\nEmail: ${input.email}\nPhone: ${input.phone}\n\n${input.message}`,
        htmlContent: `<p><strong>Page:</strong> ${esc(meta.pageTitle)}<br/><strong>Name:</strong> ${esc(input.name)}<br/><strong>Email:</strong> ${esc(input.email)}<br/><strong>Phone:</strong> ${esc(input.phone)}</p><p>${esc(input.message).replace(/\n/g, "<br/>")}</p>`,
        attachment: attachment.length ? attachment : undefined,
      }),
    });
  } catch (e) {
    console.error("Contact email failed:", e instanceof Error ? e.message : e);
  }
}

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    for (const [k, v] of Object.entries(cors)) res.setHeader(k, v);
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== "GET" && req.method !== "POST") {
    send(res, 405, { error: "Method not allowed." });
    return;
  }
  const auth = String(req.headers?.["authorization"] ?? "");
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const appId = token ? verifyToken(token) : null;
  if (appId === null) {
    send(res, 401, { error: "Missing or invalid bearer token." });
    return;
  }
  const url = process.env["TURSO_DATABASE_URL"]?.trim();
  const authToken = process.env["TURSO_AUTH_TOKEN"]?.trim();
  if (!url) {
    send(res, 503, { error: "Service unavailable." });
    return;
  }
  const db = createClient(authToken ? { url, authToken } : { url });
  if (!(await appOwnerHasAccess(db, appId))) {
    send(res, 402, PLAN_EXPIRED_BODY);
    return;
  }

  try {
    if (req.method === "GET") {
      const q = new URL(req.url ?? "/", "http://x").searchParams;
      const messages = await listContactMessages(db as any, appId, {
        pageId: Number(q.get("pageId") ?? "") || null,
        limit: Number(q.get("limit") ?? "") || 100,
        offset: Number(q.get("offset") ?? "") || 0,
      });
      send(res, 200, { messages });
      return;
    }
    const raw = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const parsed = contactInputSchema.safeParse(raw);
    if (!parsed.success) {
      send(res, 400, { error: parsed.error.issues[0]?.message ?? "Invalid input." });
      return;
    }
    const saved = await saveContactMessage(db as any, appId, parsed.data);
    await notify(req, parsed.data, saved);
    send(res, 201, { ok: true, id: saved.id });
  } catch (e) {
    send(res, 400, { error: e instanceof Error ? e.message : "Request failed." });
  }
}
