import { createServerFn } from "@tanstack/react-start";
import { EMPTY_CONTENT, type SiteContent } from "./content-types";

export interface ContentResult {
  content: SiteContent;
  error: string | null;
}

export const getSiteContent = createServerFn({ method: "GET" }).handler(
  async (): Promise<ContentResult> => {
    try {
      const { fetchSiteContent } = await import("./dreamoz.server");
      const content = await fetchSiteContent();
      return { content, error: null };
    } catch (err) {
      console.error("getSiteContent failed", err);
      return {
        content: EMPTY_CONTENT,
        error: "Content is temporarily unavailable. Please try again shortly.",
      };
    }
  },
);
