// Server-only Brevo configuration & HTTP API sender.
// Workers can't open SMTP connections, so we use Brevo's HTTP API.

export function brevoConfig() {
  return {
    emailFrom: process.env["BREVO_FROM_EMAIL"]?.trim() || "support@dreamoztech.com",
    fromName: process.env["BREVO_FROM_NAME"]?.trim() || "DreamozTech",
  };
}

export async function sendBrevoEmail(opts: {
  from: { email: string; name?: string };
  to: { email: string; name?: string }[];
  replyTo?: { email: string; name?: string };
  subject: string;
  htmlContent: string;
  textContent?: string;
}) {
  const apiKey = process.env["BREVO_API_KEY"];
  if (!apiKey) throw new Error("Email service is not configured.");

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: opts.from,
      to: opts.to,
      replyTo: opts.replyTo,
      subject: opts.subject,
      htmlContent: opts.htmlContent,
      textContent: opts.textContent,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Brevo send failed: ${res.status} ${body}`);
    throw new Error("Could not send your message right now. Please try again later.");
  }
  return res.json();
}
