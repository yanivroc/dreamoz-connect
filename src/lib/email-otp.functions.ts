import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const purposeSchema = z.enum(["contact", "signup"]);

const requestSchema = z.object({
  email: z.string().trim().email().max(255),
  purpose: purposeSchema,
  phone: z.string().trim().max(20).optional(),
});

const verifySchema = z.object({
  email: z.string().trim().email().max(255),
  purpose: purposeSchema,
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from your email."),
});

export const requestEmailOtp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => requestSchema.parse(input))
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase();
    const { dbClient } = await import("./db.server");
    const db = dbClient();
    if (!db) throw new Error("Email verification is not available right now.");

    const otp = await import("./email-otp.server");
    await otp.ensureEmailOtpsTable(db);

    if (data.purpose === "signup") {
      const { normalizeAuPhone } = await import("./phone");
      const phone = normalizeAuPhone(data.phone ?? "");
      if (!phone) {
        throw new Error("Please enter a valid Australian mobile number before verifying your email.");
      }
      const { ensureUsersTable } = await import("./db.server");
      await ensureUsersTable(db);
      const existing = await db.execute({
        sql: "SELECT id FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1",
        args: [email],
      });
      if (existing.rows.length > 0) {
        throw new Error("An account with this email already exists.");
      }
      const existingPhone = await db.execute({
        sql: "SELECT id FROM users WHERE phone = ? AND deleted_at IS NULL LIMIT 1",
        args: [phone],
      });
      if (existingPhone.rows.length > 0) {
        throw new Error("An account with this mobile number already exists. Please log in instead.");
      }
    }

    await otp.assertSendAllowed(db, email, data.purpose);
    const code = otp.randomCode();
    await otp.storeCode(db, email, data.purpose, code);
    await otp.sendOtpEmail(email, code);

    return { ok: true as const, resendSeconds: otp.OTP_RESEND_SECONDS };
  });

export type VerifyEmailOtpResult =
  | { ok: true; token: string }
  | { ok: false; message: string };

export const verifyEmailOtp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => verifySchema.parse(input))
  .handler(async ({ data }): Promise<VerifyEmailOtpResult> => {
    const email = data.email.toLowerCase();
    const { dbClient } = await import("./db.server");
    const db = dbClient();
    if (!db) throw new Error("Email verification is not available right now.");

    const otp = await import("./email-otp.server");
    await otp.ensureEmailOtpsTable(db);
    return otp.checkCode(db, email, data.purpose, data.code);
  });
