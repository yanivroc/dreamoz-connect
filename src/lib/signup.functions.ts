import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(200),
  captchaAnswer: z.coerce.number().int(),
  captchaA: z.coerce.number().int().min(0).max(99),
  captchaB: z.coerce.number().int().min(0).max(99),
  marketingConsent: z.literal(true),
});

export type SignUpResult =
  | { ok: true }
  | { ok: false; reason: "exists" | "not_configured" };

export const signUp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }): Promise<SignUpResult> => {
    if (data.captchaAnswer !== data.captchaA + data.captchaB) {
      throw new Error("Captcha verification failed. Please try again.");
    }

    const { dbClient, ensureUsersTable } = await import("./db.server");
    const db = dbClient();
    if (!db) return { ok: false, reason: "not_configured" };

    await ensureUsersTable(db);

    const email = data.email.toLowerCase();
    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE email = ? LIMIT 1",
      args: [email],
    });
    if (existing.rows.length > 0) return { ok: false, reason: "exists" };

    const consentAt = new Date().toISOString();
    const { hashPassword } = await import("./auth.server");
    const passwordHash = await hashPassword(data.password);

    try {
      await db.execute({
        sql: "INSERT INTO users (name, email, password_hash, created_at, marketing_consent, marketing_consent_at) VALUES (?, ?, ?, ?, ?, ?)",
        args: [data.name, email, passwordHash, consentAt, 1, consentAt],
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/UNIQUE|constraint/i.test(msg)) return { ok: false, reason: "exists" };
      console.error("Signup insert failed:", msg);
      throw new Error("Could not create your account right now. Please try again.");
    }

    try {
      const { mailConfig, sendMail } = await import("./mailer.server");
      const config = mailConfig();
      const safeName = data.name.replace(
        /[&<>"']/g,
        (c) =>
          ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
      );
      await sendMail({
        from: { email: config.emailFrom, name: config.fromName },
        to: [{ email, name: data.name }],
        subject: `Welcome to ${config.fromName}`,
        textContent: `Hi ${data.name},\n\nThanks for creating your ${config.fromName} account. We're glad to have you on board.\n\n— ${config.fromName}`,
        htmlContent: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#111">
<h2 style="margin:0 0 12px">Welcome to ${config.fromName}, ${safeName}!</h2>
<p>Your account has been created successfully with <strong>${email}</strong>.</p>
<p>We're glad to have you on board — reach out any time if you need a hand.</p>
<p style="margin-top:20px">— The ${config.fromName} team</p>
</div>`,
      });
      try {
        const { getContactInfo } = await import("./dreamoz.server");
        const member = await getContactInfo();
        const adminEmail = member.memberEmail?.trim() || "support@dreamoztech.com";
        await sendMail({
          from: { email: config.emailFrom, name: config.fromName },
          to: [{ email: adminEmail }],
          replyTo: { email, name: data.name },
          subject: `New sign up: ${data.name}`,
          textContent: `A new sign up has been created.\n\nName: ${data.name}\nEmail: ${email}\nMarketing consent: Yes — given ${consentAt} UTC\nDate: ${consentAt}`,
          htmlContent: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#111">
<h2 style="margin:0 0 12px">New sign up has been created</h2>
<p><strong>Name:</strong> ${safeName}<br/>
<strong>Email:</strong> ${email}<br/>
<strong>Marketing consent:</strong> Yes — given ${consentAt} UTC<br/>
<strong>Date:</strong> ${consentAt}</p>
</div>`,
        });
      } catch (err) {
        console.error("Admin signup notification failed:", err);
      }
    } catch (err) {
      console.error("Welcome email failed:", err);
    }

    return { ok: true };
  });
