// Server-only SMTP configuration & sender (Namecheap Private Email).
// nodemailer is Node-only, so it is imported dynamically inside the send call.

export function mailConfig() {
  const user = process.env["SMTP_USER"]?.trim() || "support@dreamoztech.com";
  return {
    emailFrom: process.env["SMTP_FROM_EMAIL"]?.trim() || user,
    fromName: process.env["SMTP_FROM_NAME"]?.trim() || "DreamozTech",
  };
}

function addr(a: { email: string; name?: string }) {
  return a.name ? { name: a.name, address: a.email } : a.email;
}

export async function sendMail(opts: {
  from: { email: string; name?: string };
  to: { email: string; name?: string }[];
  replyTo?: { email: string; name?: string };
  subject: string;
  htmlContent: string;
  textContent?: string;
}) {
  const host = process.env["SMTP_HOST"]?.trim() || "mail.privateemail.com";
  const user = process.env["SMTP_USER"]?.trim();
  const pass = process.env["SMTP_PASSWORD"];
  const port = Number(process.env["SMTP_PORT"]?.trim() || 465);
  const secureEnv = process.env["SMTP_SECURE"]?.trim().toLowerCase();
  const secure = secureEnv ? secureEnv === "true" || secureEnv === "1" : port === 465;

  if (!user || !pass) throw new Error("Email service is not configured.");

  try {
    const nodemailer = (await import("nodemailer")).default;
    const transport = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    return await transport.sendMail({
      from: addr(opts.from),
      to: opts.to.map(addr),
      replyTo: opts.replyTo ? addr(opts.replyTo) : undefined,
      subject: opts.subject,
      html: opts.htmlContent,
      text: opts.textContent,
    });
  } catch (err) {
    console.error("SMTP send failed:", err instanceof Error ? err.message : err);
    throw new Error("Could not send your message right now. Please try again later.");
  }
}
