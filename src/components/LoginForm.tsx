import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { login } from "@/lib/auth.functions";

const CAPTCHA_STORAGE_KEY = "dreamoz-login-captcha";

function createCaptcha(previous?: string | null) {
  let a = 0;
  let b = 0;
  let value = "";

  do {
    a = 2 + Math.floor(Math.random() * 8);
    b = 1 + Math.floor(Math.random() * 9);
    value = `${a}:${b}`;
  } while (value === previous);

  return { a, b, value };
}

export function LoginForm({ redirectTo }: { redirectTo?: string | undefined }) {
  const submit = useServerFn(login);
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [seed, setSeed] = useState(0);
  const [initialCaptcha, setInitialCaptcha] = useState({ a: 3, b: 2 });
  const captcha = useMemo(
    () =>
      seed === 0
        ? initialCaptcha
        : { a: 2 + ((seed * 7) % 8), b: 1 + ((seed * 5) % 9) },
    [initialCaptcha, seed],
  );

  useEffect(() => {
    const next = createCaptcha(window.sessionStorage.getItem(CAPTCHA_STORAGE_KEY));
    window.sessionStorage.setItem(CAPTCHA_STORAGE_KEY, next.value);
    setInitialCaptcha({ a: next.a, b: next.b });
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    try {
      const res = await submit({
        data: {
          email: String(fd.get("email") ?? ""),
          password: String(fd.get("password") ?? ""),
          captchaAnswer: Number(fd.get("captchaAnswer") ?? NaN),
          captchaA: captcha.a,
          captchaB: captcha.b,
        },
      });
      if (res.ok) {
        toast.success(`Welcome back, ${res.user.name}!`);
        queryClient.removeQueries({ queryKey: ["session-user"] });
        await queryClient.refetchQueries({ queryKey: ["session-user"] });
        await router.invalidate();
        navigate({ to: redirectTo && redirectTo.startsWith("/") ? redirectTo : "/dashboard" });
        return;
      }
      if (res.reason === "not_configured") {
        toast.error("Login is not configured yet. Please try again later.");
      } else {
        toast.error("Invalid email or password.");
      }
      setSeed((s) => s + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign you in.");
      setSeed((s) => s + 1);
    } finally {
      setPending(false);
    }
  }

  const field =
    "mt-1 w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm outline-none focus:border-primary";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm">
        <span className="text-muted-foreground">Email</span>
        <input name="email" type="email" required maxLength={255} className={field} />
      </label>
      <label className="block text-sm">
        <span className="text-muted-foreground">Password</span>
        <input
          name="password"
          type="password"
          required
          maxLength={200}
          className={field}
        />
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
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
