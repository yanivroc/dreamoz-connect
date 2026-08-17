import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { sendContactEmail } from "@/lib/contact.functions";

export function ContactForm() {
  const send = useServerFn(sendContactEmail);
  const [pending, setPending] = useState(false);
  const [seed, setSeed] = useState(0);
  const captcha = useMemo(
    () => ({ a: 3 + ((seed * 7) % 6), b: 2 + ((seed * 5) % 7) }),
    [seed],
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (fd.get("marketingConsent") !== "on") {
      toast.error("Please tick the consent box to continue.");
      return;
    }
    setPending(true);
    try {
      await send({
        data: {
          name: String(fd.get("name") ?? ""),
          email: String(fd.get("email") ?? ""),
          subject: String(fd.get("subject") ?? ""),
          message: String(fd.get("message") ?? ""),
          captchaAnswer: Number(fd.get("captchaAnswer") ?? NaN),
          captchaA: captcha.a,
          captchaB: captcha.b,
        },
      });
      toast.success("Thanks! Your message has been sent.");
      form.reset();
      setSeed((s) => s + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send your message.");
    } finally {
      setPending(false);
    }
  }

  const field =
    "mt-1 w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm outline-none focus:border-primary";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-muted-foreground">Your name</span>
          <input name="name" required maxLength={100} className={field} />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">Email</span>
          <input name="email" type="email" required maxLength={255} className={field} />
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-muted-foreground">Subject</span>
        <input name="subject" required maxLength={200} className={field} />
      </label>
      <label className="block text-sm">
        <span className="text-muted-foreground">Message</span>
        <textarea name="message" required rows={5} maxLength={2000} className={field} />
      </label>
      <label className="block text-sm">
        <span className="text-muted-foreground">
          Spam check: what is {captcha.a} + {captcha.b}?
        </span>
        <input name="captchaAnswer" type="number" required className={field} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex rounded-full bg-gradient-accent px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
