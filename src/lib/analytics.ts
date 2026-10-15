import { track } from "@vercel/analytics";

type Props = Record<string, string | number | boolean | null>;

/** Browser-only Vercel Analytics custom event; never throws. */
export function trackEvent(name: string, properties?: Props) {
  if (typeof window === "undefined") return;
  try {
    track(name, properties);
  } catch {
    /* blocked or unavailable */
  }
}
