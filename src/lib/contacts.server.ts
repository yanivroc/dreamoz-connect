// Server-only contact message helpers shared by the site form, the dashboard
// and the public API route.
import type { Client } from "@libsql/client";
import { z } from "zod";

export const CONTACT_MAX_FILE_BYTES = 1_500_000;
const MAX_BASE64 = Math.ceil((CONTACT_MAX_FILE_BYTES * 4) / 3) + 8;
export const CONTACT_MIMES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

const attachmentSchema = z.object({
  name: z.string().trim().min(1).max(200),
  mime: z.string().trim().refine((m) => CONTACT_MIMES.includes(m), {
    message: "Attachments must be a PDF or an image.",
  }),
  data: z.string().min(1).max(MAX_BASE64, { message: "Each attachment must be 1.5MB or less." }),
});

export const contactInputSchema = z.object({
  pageId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1, "Name is required.").max(100),
  email: z.string().trim().email("Enter a valid email.").max(255),
  phone: z.string().trim().min(1, "Phone is required.").max(40),
  message: z.string().trim().min(1, "Message is required.").max(5000),
  attachment1: attachmentSchema.nullable().optional(),
  attachment2: attachmentSchema.nullable().optional(),
});

export type ContactInput = z.infer<typeof contactInputSchema>;
export type ContactAttachment = { id: string; name: string; mime: string; url: string };
export type ContactMessage = {
  id: number;
  appId: number;
  pageId: number;
  pageTitle: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  attachments: ContactAttachment[];
};

function newId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function saveContactMessage(
  db: Client,
  appId: number,
  input: ContactInput,
): Promise<{ id: number; ownerId: number; appEmail: string; pageTitle: string }> {
  const page = await db.execute({
    sql: `SELECT p.title, p.enabled, p.contact_enabled, a.user_id, a.email
          FROM web_pages p JOIN web_apps a ON a.id = p.app_id
          WHERE p.id = ? AND p.app_id = ? LIMIT 1`,
    args: [input.pageId, appId],
  });
  const row = page.rows[0] as Record<string, unknown> | undefined;
  if (!row || Number(row["enabled"]) !== 1 || Number(row["contact_enabled"]) !== 1) {
    throw new Error("This page does not accept contact messages.");
  }
  const ownerId = Number(row["user_id"]);
  const now = new Date().toISOString();

  const assetIds: (string | null)[] = [];
  for (const att of [input.attachment1, input.attachment2]) {
    if (!att) {
      assetIds.push(null);
      continue;
    }
    const id = newId();
    await db.execute({
      sql: `INSERT INTO web_assets (id, user_id, app_id, kind, mime, name, data, size, created_at)
            VALUES (?, ?, ?, 'contact', ?, ?, ?, ?, ?)`,
      args: [
        id,
        ownerId,
        appId,
        att.mime,
        att.name,
        att.data,
        Math.round((att.data.length * 3) / 4),
        now,
      ],
    });
    assetIds.push(id);
  }

  const res = await db.execute({
    sql: `INSERT INTO contact_messages (app_id, page_id, name, email, phone, message,
            attachment1_asset_id, attachment2_asset_id, is_read, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    args: [
      appId,
      input.pageId,
      input.name,
      input.email,
      input.phone,
      input.message,
      assetIds[0] ?? null,
      assetIds[1] ?? null,
      now,
    ],
  });
  return {
    id: Number(res.lastInsertRowid ?? 0),
    ownerId,
    appEmail: String(row["email"] ?? ""),
    pageTitle: String(row["title"] ?? ""),
  };
}

export async function listContactMessages(
  db: Client,
  appId: number,
  opts: { pageId?: number | null; limit?: number; offset?: number } = {},
): Promise<ContactMessage[]> {
  const limit = Math.min(Math.max(opts.limit ?? 200, 1), 500);
  const offset = Math.max(opts.offset ?? 0, 0);
  const args: (number | string)[] = [appId];
  let where = "m.app_id = ?";
  if (opts.pageId) {
    where += " AND m.page_id = ?";
    args.push(opts.pageId);
  }
  const res = await db.execute({
    sql: `SELECT m.*, p.title AS page_title,
            a1.name AS a1_name, a1.mime AS a1_mime,
            a2.name AS a2_name, a2.mime AS a2_mime
          FROM contact_messages m
          LEFT JOIN web_pages p ON p.id = m.page_id
          LEFT JOIN web_assets a1 ON a1.id = m.attachment1_asset_id
          LEFT JOIN web_assets a2 ON a2.id = m.attachment2_asset_id
          WHERE ${where}
          ORDER BY m.created_at DESC, m.id DESC
          LIMIT ${limit} OFFSET ${offset}`,
    args,
  });
  return res.rows.map((r) => {
    const row = r as Record<string, unknown>;
    const attachments: ContactAttachment[] = [];
    for (const n of [1, 2]) {
      const id = row[`attachment${n}_asset_id`];
      if (id) {
        attachments.push({
          id: String(id),
          name: String(row[`a${n}_name`] ?? `attachment-${n}`),
          mime: String(row[`a${n}_mime`] ?? ""),
          url: `/api/asset/${String(id)}`,
        });
      }
    }
    return {
      id: Number(row["id"]),
      appId: Number(row["app_id"]),
      pageId: Number(row["page_id"]),
      pageTitle: String(row["page_title"] ?? ""),
      name: String(row["name"] ?? ""),
      email: String(row["email"] ?? ""),
      phone: String(row["phone"] ?? ""),
      message: String(row["message"] ?? ""),
      isRead: Number(row["is_read"] ?? 0) === 1,
      createdAt: String(row["created_at"] ?? ""),
      attachments,
    };
  });
}

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

/** Emails the web app owner; failures are logged and never fail the submission. */
export async function notifyContactMessage(
  input: ContactInput,
  meta: { appEmail: string; pageTitle: string },
) {
  try {
    const { getMailConfig, sendMail } = await import("./mailer.server");
    const config = getMailConfig();
    const to = meta.appEmail.trim() || "support@dreamoztech.com";
    const attachment = [input.attachment1, input.attachment2]
      .filter((a): a is NonNullable<typeof a> => Boolean(a))
      .map((a) => ({ name: a.name, content: a.data }));
    await sendMail({
      from: { email: config.emailFrom, name: `${input.name} via ${config.fromName}` },
      to: [{ email: to }],
      replyTo: { email: input.email, name: input.name },
      subject: `[Contact] ${meta.pageTitle || "New message"}`,
      textContent: `Page: ${meta.pageTitle}\nName: ${input.name}\nEmail: ${input.email}\nPhone: ${input.phone}\n\n${input.message}`,
      htmlContent: `<p><strong>Page:</strong> ${esc(meta.pageTitle)}<br/>
<strong>Name:</strong> ${esc(input.name)}<br/>
<strong>Email:</strong> ${esc(input.email)}<br/>
<strong>Phone:</strong> ${esc(input.phone)}</p>
<p>${esc(input.message).replace(/\n/g, "<br/>")}</p>`,
      attachment: attachment.length ? attachment : undefined,
    });
  } catch (e) {
    console.error("Contact email failed:", e instanceof Error ? e.message : e);
  }
}
