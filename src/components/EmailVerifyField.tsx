import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { requestEmailOtp, verifyEmailOtp } from "@/lib/email-otp.functions";

const field =
  "mt-1 w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm outline-none focus:border-primary";

export function EmailVerifyField({
  purpose,
  email,
  onEmailChange,
  token,
  onTokenChange,
  label = "Email",
  getPhone,
}: {
  purpose: "contact" | "signup";
  email: string;
  onEmailChange: (value: string) => void;
  token: string | null;
  onTokenChange: (token: string | null) => void;
  label?: string;
  /** Returns a validated phone (E.164) or null after showing an error. */
  getPhone?: () => string | null;
}) {
  const sendCode = useServerFn(requestEmailOtp);
  const checkCode = useServerFn(verifyEmailOtp);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const verified = Boolean(token);

  async function onSend() {
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast.error("Please enter a valid email address first.");
      return;
    }
    let phoneValue: string | undefined;
    if (getPhone) {
      const p = getPhone();
      if (!p) return;
      phoneValue = p;
    }
    setSending(true);
    try {
      const res = await sendCode({ data: { email: value, purpose, phone: phoneValue } });
      setCodeSent(true);
      setCooldown(res.resendSeconds);
      toast.success(`We sent a 6-digit code to ${value}.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not send the verification code.",
      );
    } finally {
      setSending(false);
    }
  }

  async function onVerify() {
    if (!/^\d{6}$/.test(code.trim())) {
      toast.error("Enter the 6-digit code from your email.");
      return;
    }
    setChecking(true);
    try {
      const res = await checkCode({
        data: { email: email.trim(), purpose, code: code.trim() },
      });
      if (res.ok) {
        onTokenChange(res.token);
        setCode("");
        toast.success("Email verified.");
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not verify that code.");
    } finally {
      setChecking(false);
    }
  }

  function resetEmail() {
    onTokenChange(null);
    setCodeSent(false);
    setCode("");
  }

  return (
    <div className="block text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="mt-1 flex flex-col gap-2 sm:flex-row">
        <input
          name="email"
          type="email"
          required
          maxLength={255}
          value={email}
          readOnly={verified}
          onChange={(e) => {
            onEmailChange(e.target.value);
            if (token) onTokenChange(null);
            setCodeSent(false);
          }}
          className={`${field} mt-0 ${verified ? "opacity-70" : ""}`}
        />
        {verified ? (
          <span className="inline-flex shrink-0 items-center rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
            ✓ Verified
          </span>
        ) : (
          <button
            type="button"
            onClick={onSend}
            disabled={sending || cooldown > 0}
            className="shrink-0 rounded-lg border border-border/70 bg-background px-4 py-2 text-xs font-semibold transition hover:border-primary disabled:opacity-60"
          >
            {sending
              ? "Sending…"
              : cooldown > 0
                ? `Resend in ${cooldown}s`
                : codeSent
                  ? "Resend code"
                  : "Verify email"}
          </button>
        )}
      </div>

      {verified && (
        <button
          type="button"
          onClick={resetEmail}
          className="mt-1 text-xs text-muted-foreground underline"
        >
          Change email
        </button>
      )}

      {!verified && codeSent && (
        <div className="mt-2 rounded-lg border border-border/70 bg-background/60 p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className={`${field} mt-0 tracking-[0.3em]`}
            />
            <button
              type="button"
              onClick={onVerify}
              disabled={checking}
              className="shrink-0 rounded-lg bg-gradient-accent px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
            >
              {checking ? "Checking…" : "Confirm code"}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground/80">
            The code expires in 10 minutes. If you don't see the email within a minute,
            please check your spam or junk folder.
          </p>
        </div>
      )}
    </div>
  );
}
