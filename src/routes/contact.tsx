import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone } from "lucide-react";
import { overviewFn } from "@/lib/dreamoz.functions";
import { SiteLayout } from "@/components/SiteLayout";
import type { SiteOverview } from "@/lib/dreamoz.types";
import { toInternationalPhone } from "@/lib/format";
import { ContactForm } from "@/components/ContactForm";

export const Route = createFileRoute("/contact")({
  loader: () => overviewFn(),
  head: ({ loaderData }) => {
    const member = loaderData?.member;
    const title = `Contact ${member?.memberFullName?.trim() || "DreamozTech"}`;
    const description =
      member?.metaDesc?.trim() ||
      "Get in touch with DreamozTech for software development, web platforms and digital growth projects.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(member?.metaKey
          ? [
              {
                name: "keywords",
                content: member.metaKey.replace(/\s+/g, " ").trim(),
              },
            ]
          : []),
      ],
    };
  },
  component: Contact,
});

function Contact() {
  const { member, email, logo, favicon } = Route.useLoaderData() as SiteOverview;
  const dial = toInternationalPhone(member.mobileNumber, member.country);

  const socials = [
    ["LinkedIn", member.linkedinProfile],
    ["Facebook", member.facebookProfile],
    ["Instagram", member.instagramProfile],
    ["YouTube", member.youtubeProfile],
    ["X / Twitter", member.twitterProfile],
  ].filter(([, url]) => Boolean(url)) as [string, string][];

  return (
    <SiteLayout member={member} logo={logo} favicon={favicon}>
      <section className="hero-surface border-b border-border/60">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h1 className="text-4xl font-bold md:text-5xl">
            {member.memberFullName?.trim() || "Contact us"}
          </h1>
          {member.description ? (
            <div
              className="prose-site mt-4 max-w-3xl"
              dangerouslySetInnerHTML={{ __html: member.description }}
            />
          ) : (
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Tell us about your project and we'll get back to you shortly.
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-surface p-7 shadow-card">
          <h2 className="text-xl font-semibold">Send us a message</h2>
          <div className="mt-6">
            <ContactForm />
          </div>
        </div>

        <div className="space-y-8">
          <div className="rounded-xl border border-border/70 bg-surface p-7 shadow-card">
            <h2 className="text-xl font-semibold">Contact details</h2>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90"
              >
                <Mail size={18} />
                Email Us
              </a>
              {member.mobileNumber ? (
                <a
                  href={`tel:${dial ? `+${dial}` : member.mobileNumber}`}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90"
                >
                  <Phone size={18} />
                  Call Us
                </a>
              ) : null}
            </div>

            <dl className="mt-6 space-y-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Address</dt>
                <dd className="text-foreground">
                  {member.address}, {member.suburb} {member.postCode}, {member.state},{" "}
                  {member.country}
                </dd>
              </div>
            </dl>
            {socials.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-3">
                {socials.map(([label, url]) => (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-border px-4 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {label}
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-border/70 shadow-card">
            <iframe
              title="DreamozTech location"
              className="h-80 w-full"
              loading="lazy"
              src={`https://maps.google.com/maps?q=${member.bizLat},${member.bizLong}&z=15&output=embed`}
            />
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
