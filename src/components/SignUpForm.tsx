import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { signUp } from "@/lib/signup.functions";

export function SignUpForm() {
  const submit = useServerFn(signUp);
  const [pending, setPending] = useState(false);
  const [seed, setSeed] = useState(0);
  const captcha = useMemo(
    () => ({ a: 4 + ((seed * 3) % 6), b: 2 + ((seed * 5) % 7) }),
    [seed],
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const password = String(fd.get("password") ?? "");
    if (password !== String(fd.get("confirmPassword") ?? "")) {
      toast.error("Passwords do not match.");
      return;
    }
    if (fd.get("marketingConsent") !== "on") {
      toast.error("Please tick the consent box to continue.");
      return;
    }
    setPending(true);
    try {
      const res = await submit({
        data: {
          name: String(fd.get("name") ?? ""),
          email: String(fd.get("email") ?? ""),
          password,
          captchaAnswer: Number(fd.get("captchaAnswer") ?? NaN),
          captchaA: captcha.a,
          captchaB: captcha.b,
          marketingConsent: true as const,
        },
      });
      if (res.ok) {
        toast.success("Account created! Check your inbox for a welcome email.");
        form.reset();
      } else if (res.reason === "exists") {
        toast.error("An account with this email already exists.");
      } else {
        toast.error("Sign up is not configured yet. Please try again later.");
      }
      setSeed((s) => s + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create your account.");
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
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-muted-foreground">Password (min 8 characters)</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            maxLength={200}
            className={field}
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">Confirm password</span>
          <input
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            maxLength={200}
            className={field}
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-muted-foreground">
          Spam check: what is {captcha.a} + {captcha.b}?
        </span>
        <input name="captchaAnswer" type="number" required className={field} />
      </label>
      <div className="rounded-lg border border-border/70 bg-background/60 p-3">
        <label className="flex items-start gap-3 text-sm">
          <input
            name="marketingConsent"
            type="checkbox"
            required
            defaultChecked={false}
            className="mt-1 h-4 w-4 shrink-0 accent-primary"
          />
          <span className="text-muted-foreground">
            I agree to receive marketing emails from DreamozTech about its services,
            product updates, offers and news. I understand I can unsubscribe at any time
            using the link in any email.
          </span>
        </label>
        <p className="mt-2 pl-7 text-xs text-muted-foreground/80">
          We only use your details to respond to your enquiry and to send the
          communications you consent to.
        </p>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex rounded-full bg-gradient-accent px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
