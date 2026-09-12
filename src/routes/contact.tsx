import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Mail, Link2 } from "lucide-react";
import { siteContentQuery } from "@/lib/content-query";
import { SiteLayout } from "@/components/SiteLayout";
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
  const email = app.email?.trim();

  return (
    <SiteLayout>
      <section className="hero-surface border-b border-border/60">
        <div className="mx-auto w-full max-w-7xl px-5 py-14">
          <h1 className="text-4xl font-bold md:text-5xl">Contact {brand}</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            {app.description?.trim() ||
              "Tell us about your project and we'll get back to you shortly."}
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-16 md:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-surface p-7 shadow-card">
          <h2 className="text-xl font-semibold">Send us a message</h2>
          <div className="mt-6">
            <ContactForm />
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-surface p-7 shadow-card">
          <h2 className="text-xl font-semibold">Contact details</h2>
          <div className="mt-6 flex flex-wrap gap-3">
            {email ? (
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90"
              >
                <Mail size={18} />
                Email Us
              </a>
            ) : null}
            {app.link?.trim() ? (
              <a
                href={app.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface/60"
              >
                <Link2 size={18} />
                Website
              </a>
            ) : null}
          </div>
          <dl className="mt-6 space-y-4 text-sm">
            {email ? (
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="text-foreground">{email}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </section>
    </SiteLayout>
  );
}
