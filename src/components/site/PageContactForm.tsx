import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { getContactViewer, submitContactMessage } from "@/lib/contacts.functions";

const MAX_BYTES = 1_500_000;
const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp,image/gif";
const MIMES = ACCEPT.split(",");

type Att = { name: string; mime: string; data: string };

function readFile(file: File): Promise<Att> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result ?? "");
      resolve({ name: file.name, mime: file.type, data: s.slice(s.indexOf(",") + 1) });
    };
    r.onerror = () => reject(new Error("Could not read the file."));
    r.readAsDataURL(file);
  });
}

export function PageContactForm({ pageId }: { pageId: number }) {
  const send = useServerFn(submitContactMessage);
  const fetchViewer = useServerFn(getContactViewer);
  const viewer = useQuery({
    queryKey: ["contact-viewer", pageId],
    queryFn: () => fetchViewer({ data: { pageId } }),
    staleTime: 60_000,
  });
  const [pending, setPending] = useState(false);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1000));
  const captcha = useMemo(() => ({ a: 2 + (seed % 8), b: 1 + ((seed * 7) % 9) }), [seed]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const atts: (Att | null)[] = [];
    for (const key of ["attachment1", "attachment2"]) {
      const f = fd.get(key);
      if (f instanceof File && f.size > 0) {
        if (!MIMES.includes(f.type)) {
          toast.error(`${f.name}: only PDF or image files are allowed.`);
          return;
        }
        if (f.size > MAX_BYTES) {
          toast.error(`${f.name} is too large (max 1.5MB).`);
          return;
        }
        atts.push(await readFile(f));
      } else atts.push(null);
    }
    setPending(true);
    try {
      await send({
        data: {
          pageId,
          name: String(fd.get("name") ?? ""),
          message: String(fd.get("message") ?? ""),
          attachment1: atts[0],
          attachment2: atts[1],
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
  const box = "mt-12 max-w-3xl rounded-xl border border-border/70 bg-surface p-7 shadow-card";

  if (viewer.isLoading) {
    return (
      <section className={box}>
        <h2 className="text-xl font-semibold text-foreground">Contact us</h2>
        <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
      </section>
    );
  }

  const account = viewer.data?.account ?? null;

  if (!account) {
    const here = typeof window !== "undefined" ? window.location.pathname : "/";
    return (
      <section className={box}>
        <h2 className="text-xl font-semibold text-foreground">Contact us</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Please log in or create an account to send an enquiry to this seller.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/login"
            search={{ redirect: here }}
            className="inline-flex rounded-full bg-gradient-accent px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="inline-flex rounded-full border border-border px-6 py-2.5 text-sm font-semibold transition hover:bg-card"
          >
            Sign up
          </Link>
        </div>
      </section>
    );
  }

  if (viewer.data?.isOwner) {
    return (
      <section className={box}>
        <h2 className="text-xl font-semibold text-foreground">Contact us</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          This is your own page. You cannot send an enquiry to yourself.
        </p>
      </section>
    );
  }

  return (
    <section className={box}>
      <h2 className="text-xl font-semibold text-foreground">Contact us</h2>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-muted-foreground">Name</span>
            <input
              name="name"
              value={account.name}
              readOnly
              className={`${field} opacity-70`}
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Email</span>
            <input
              type="email"
              value={account.email}
              readOnly
              className={`${field} opacity-70`}
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-muted-foreground">Phone</span>
          <input type="tel" value={account.phone} readOnly className={`${field} opacity-70`} />
        </label>
        <p className="text-xs text-muted-foreground">
          Name, email and phone are locked to your verified account details to ensure genuine
          enquiries.
        </p>
        <label className="block text-sm">
          <span className="text-muted-foreground">Message</span>
          <textarea name="message" required rows={5} maxLength={5000} className={field} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-muted-foreground">Attachment 1 (optional)</span>
            <input name="attachment1" type="file" accept={ACCEPT} className={field} />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Attachment 2 (optional)</span>
            <input name="attachment2" type="file" accept={ACCEPT} className={field} />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">PDF or image files, up to 1.5MB each.</p>
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
    </section>
  );
}
