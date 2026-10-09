import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(2000),
  captchaAnswer: z.coerce.number().int(),
  captchaA: z.coerce.number().int().min(0).max(99),
  captchaB: z.coerce.number().int().min(0).max(99),
  marketingConsent: z.literal(true),
  verificationToken: z.string().trim().min(16).max(128).optional(),
});

export const sendContactEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    if (data.captchaAnswer !== data.captchaA + data.captchaB) {
      throw new Error("Captcha verification failed. Please try again.");
    }

    const { dbClient } = await import("./db.server");
    const db = dbClient();
    if (!db) throw new Error("Messages cannot be sent right now. Please try later.");

    // Signed-in members use their already-verified account email; guests must
    // confirm their address with a one-time code.
    const { readSession } = await import("./session.server");
    const session = await readSession();
    let verified = false;
    let senderName = data.name;
    if (session.userId) {
      const res = await db.execute({
        sql: `SELECT email, name FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
        args: [session.userId],
      });
      const accountEmail = res.rows[0]?.["email"];
      if (
        accountEmail &&
        String(accountEmail).toLowerCase() === data.email.toLowerCase()
      ) {
        verified = true;
        senderName = String(res.rows[0]?.["name"] ?? data.name);
      }
    }

    if (!verified) {
      if (!data.verificationToken) {
        throw new Error("Please verify your email address before sending your message.");
      }
      const { ensureEmailOtpsTable, consumeVerification } = await import(
        "./email-otp.server"
      );
      await ensureEmailOtpsTable(db);
      await consumeVerification(
        db,
        data.email.toLowerCase(),
        "contact",
        data.verificationToken,
      );
    }



    const { getMailConfig, sendMail } = await import("./mailer.server");
    const { fetchSiteContent } = await import("./content.server");

    const content = await fetchSiteContent();
    const toEmail = content.webApp.email?.trim() || "support@dreamoztech.com";
    const config = getMailConfig();

    const safe = (s: string) =>
      s.replace(
        /[&<>"']/g,
        (c) =>
          ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
      );

    const consentAt = new Date().toISOString();

    await sendMail({
      from: { email: config.emailFrom, name: `${data.name} via ${config.fromName}` },
      to: [{ email: toEmail }],
      replyTo: { email: data.email, name: data.name },
      subject: `[Contact] ${data.subject}`,
      textContent: `Name: ${data.name}\nEmail: ${data.email}\nMarketing consent: Yes — given ${consentAt} UTC\n\n${data.message}`,
      htmlContent: `<p><strong>Name:</strong> ${safe(data.name)}<br/>
<strong>Email:</strong> ${safe(data.email)}<br/>
<strong>Marketing consent:</strong> Yes — given ${consentAt} UTC</p>
<p><strong>Subject:</strong> ${safe(data.subject)}</p>
<p>${safe(data.message).replace(/\n/g, "<br/>")}</p>`,
    });

    return { ok: true };
  });
