import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(200),
  captchaAnswer: z.coerce.number().int(),
  captchaA: z.coerce.number().int().min(0).max(99),
  captchaB: z.coerce.number().int().min(0).max(99),
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

    const { hashPassword } = await import("./auth.server");
    const passwordHash = await hashPassword(data.password);

    try {
      await db.execute({
        sql: "INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
        args: [data.name, email, passwordHash, new Date().toISOString()],
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/UNIQUE|constraint/i.test(msg)) return { ok: false, reason: "exists" };
      console.error("Signup insert failed:", msg);
      throw new Error("Could not create your account right now. Please try again.");
    }

    try {
      const { brevoConfig, sendBrevoEmail } = await import("./brevo.server");
      const config = brevoConfig();
      const safeName = data.name.replace(
        /[&<>"']/g,
        (c) =>
          ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
      );
      await sendBrevoEmail({
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
        await sendBrevoEmail({
          from: { email: config.emailFrom, name: config.fromName },
          to: [{ email: adminEmail }],
          replyTo: { email, name: data.name },
          subject: `New sign up: ${data.name}`,
          textContent: `A new sign up has been created.\n\nName: ${data.name}\nEmail: ${email}\nDate: ${new Date().toISOString()}`,
          htmlContent: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#111">
<h2 style="margin:0 0 12px">New sign up has been created</h2>
<p><strong>Name:</strong> ${safeName}<br/>
<strong>Email:</strong> ${email}<br/>
<strong>Date:</strong> ${new Date().toISOString()}</p>
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
