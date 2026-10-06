import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { signUp } from "@/lib/signup.functions";
import { AddressAutocomplete } from "@/components/site/AddressAutocomplete";
import { EmailVerifyField } from "@/components/EmailVerifyField";
import { AU_PHONE_HINT, normalizeAuPhone } from "@/lib/phone";

export function SignUpForm() {
  const submit = useServerFn(signUp);
  const [pending, setPending] = useState(false);
  const [seed, setSeed] = useState(0);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [verifyKey, setVerifyKey] = useState(0);
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
    if (!token) {
      toast.error("Please verify your email address before creating your account.");
      return;
    }
    const phoneE164 = normalizeAuPhone(phone);
    if (!phoneE164) {
      toast.error(`Please enter a valid ${AU_PHONE_HINT}.`);
      return;
    }
    setPhone(phoneE164);
    if (!address.trim()) {
      toast.error("Please enter your Australian address.");
      return;
    }
    setPending(true);
    try {
      const res = await submit({
        data: {
          name: String(fd.get("name") ?? ""),
          email: email.trim(),
          password,
          phone: phoneE164,
          address: address.trim(),
          captchaAnswer: Number(fd.get("captchaAnswer") ?? NaN),
          captchaA: captcha.a,
          captchaB: captcha.b,
          marketingConsent: true as const,
          verificationToken: token,
        },
      });

      if (res.ok) {
        toast.success(
          "Account created! Check your inbox for a welcome email, then log in with the email and password you just created.",
          { duration: 10000 },
        );
        form.reset();
        setPhone("");
        setAddress("");
        setEmail("");
        setToken(null);
        setVerifyKey((k) => k + 1);

      } else if (res.reason === "exists") {
        toast.error("An account with this email already exists.");
      } else if (res.reason === "phone_exists") {
        toast.error("An account with this phone number already exists.");
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
        <EmailVerifyField
          key={verifyKey}
          purpose="signup"
          email={email}
          onEmailChange={setEmail}
          token={token}
          onTokenChange={setToken}
          getPhone={() => {
            const p = normalizeAuPhone(phone);
            if (!p) {
              toast.error(`Please enter your ${AU_PHONE_HINT} before verifying your email.`);
              return null;
            }
            setPhone(p);
            return p;
          }}
        />

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
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-muted-foreground">Australian mobile number</span>
          <input
            name="phone"
            type="tel"
            required
            maxLength={20}
            placeholder="+61 412 345 678"
            value={phone}
            readOnly={!!token}
            aria-readonly={!!token}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={(e) => {
              const e164 = normalizeAuPhone(e.target.value);
              if (e164) setPhone(e164);
            }}
            className={`${field} ${token ? "cursor-not-allowed opacity-70" : ""}`}
          />
          {token ? (
            <span className="mt-1 block text-xs text-muted-foreground/80">
              Locked after email verification.{" "}
              <button
                type="button"
                className="font-semibold text-primary underline"
                onClick={() => {
                  setToken(null);
                  setVerifyKey((k) => k + 1);
                }}
              >
                Change number
              </button>{" "}
              (you'll need to verify your email again)
            </span>
          ) : (
            <span className="mt-1 block text-xs text-muted-foreground/80">{AU_PHONE_HINT}</span>
          )}
        </label>
        <div className="block text-sm">
          <span className="text-muted-foreground">Australian address</span>
          <AddressAutocomplete
            id="signup-address"
            value={address}
            required
            className="mt-1"
            placeholder="Start typing your address"
            onChange={setAddress}
            onSelect={(p) =>
              setAddress(
                [p.address, p.city, p.postcode].filter(Boolean).join(", ") || p.address,
              )
            }
          />
          <span className="mt-1 block text-xs text-muted-foreground/80">
            Accounts are available to Australian residents only.
          </span>
        </div>
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
