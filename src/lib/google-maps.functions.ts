import { createServerFn } from "@tanstack/react-start";

export interface GoogleMapsConfig {
  browserKey: string;
}

/** Exposes the Places browser key for the checkout address autocomplete. */
export const getGoogleMapsConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<GoogleMapsConfig> => {
    const raw = process.env["GoogleMapsKey"] ?? process.env["GOOGLE_MAPS_KEY"] ?? "";
    const browserKey = raw
      .trim()
      .replace(/^['"]+|['"]+$/g, "")
      .trim();
    return { browserKey };
  },
);
