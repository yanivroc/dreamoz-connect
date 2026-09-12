import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { siteContentQuery } from "@/lib/content-query";
import { ContactForm } from "@/components/ContactForm";

export const Route = createFileRoute("/contact")({
  loader: ({ context }) => context.queryClient.ensureQueryData(siteContentQuery),
  head: ({ loaderData }) => {
    const app = loaderData?.content.webApp;
    const brand = app?.title?.trim() || "DreamozTech";
    const title = `Contact ${brand}`;
    const description =
      app?.description?.trim().slice(0, 155) ||
      `Get in touch with ${brand} for software development, web platforms and digital growth projects.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: Contact,
});

function Contact() {
  const { data } = useSuspenseQuery(siteContentQuery);
  const app = data.content.webApp;
  const brand = app.title?.trim() || "DreamozTech";

  return (
    <>
      <section className="hero-surface border-b border-border/60">
        <div className="mx-auto w-full max-w-7xl px-5 py-14">
          <h1 className="text-4xl font-bold md:text-5xl">Contact {brand}</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            {app.description?.trim() ||
              "Tell us about your project and we'll get back to you shortly."}
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-16">
        <div className="max-w-3xl rounded-xl border border-border/70 bg-surface p-7 shadow-card">
          <h2 className="text-xl font-semibold">Send us a message</h2>
          <div className="mt-6">
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}
