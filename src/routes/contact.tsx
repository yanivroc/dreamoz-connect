import { createFileRoute } from "@tanstack/react-router";
import { overviewFn } from "@/lib/dreamoz.functions";
import { SiteLayout } from "@/components/SiteLayout";
import type { SiteOverview } from "@/lib/dreamoz.types";

export const Route = createFileRoute("/contact")({
  loader: () => overviewFn(),
  head: () => ({
    meta: [
      { title: "Contact DreamozTech — Melbourne Software Team" },
      {
        name: "description",
        content:
          "Get in touch with DreamozTech in Melbourne for software development, web platforms and digital growth projects.",
      },
      { property: "og:title", content: "Contact DreamozTech" },
      {
        property: "og:description",
        content: "Talk to the DreamozTech team about your next software project.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Contact,
});

function Contact() {
  const { member, logo } = Route.useLoaderData() as SiteOverview;

  const socials = [
    ["LinkedIn", member.linkedinProfile],
    ["Facebook", member.facebookProfile],
    ["Instagram", member.instagramProfile],
    ["YouTube", member.youtubeProfile],
    ["X / Twitter", member.twitterProfile],
  ].filter(([, url]) => Boolean(url)) as [string, string][];

  return (
    <SiteLayout logo={logo} name={member.memberFullName}>
      <section className="hero-surface border-b border-border/60">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h1 className="text-4xl font-bold md:text-5xl">Let's build something</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Tell us about your product idea, platform migration or growth goal.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-surface p-7 shadow-card">
          <h2 className="text-xl font-semibold">Contact details</h2>
          <dl className="mt-6 space-y-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Contact person</dt>
              <dd className="text-foreground">{member.customerName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd>
                <a
                  href={`mailto:${member.memberEmail}`}
                  className="text-primary hover:underline"
                >
                  {member.memberEmail}
                </a>
              </dd>
            </div>
            {member.mobileNumber ? (
              <div>
                <dt className="text-muted-foreground">Phone</dt>
                <dd>
                  <a
                    href={`tel:${member.mobileNumber}`}
                    className="text-primary hover:underline"
                  >
                    {member.mobileNumber}
                  </a>
                </dd>
              </div>
            ) : null}
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
            className="h-full min-h-80 w-full"
            loading="lazy"
            src={`https://maps.google.com/maps?q=${member.bizLat},${member.bizLong}&z=15&output=embed`}
          />
        </div>
      </section>
    </SiteLayout>
  );
}
