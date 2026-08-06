import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageCircle } from "lucide-react";
import { overviewFn } from "@/lib/dreamoz.functions";
import { SiteLayout } from "@/components/SiteLayout";
import type { SiteOverview } from "@/lib/dreamoz.types";
import { whatsappLink } from "@/lib/format";
import { MediaSlider } from "@/components/MediaSlider";

export const Route = createFileRoute("/contact")({
  loader: () => overviewFn(),
  head: ({ loaderData }) => ({
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
      ...(loaderData?.member?.metaKey
        ? [{ name: "keywords", content: loaderData.member.metaKey.replace(/\s+/g, " ").trim() }]
        : []),
    ],
  }),
  component: Contact,
});

function Contact() {
  const { member, email, logo, favicon, contactPage } =
    Route.useLoaderData() as SiteOverview;
  const wa = whatsappLink(member.mobileNumber, member.country);

  const socials = [
    ["LinkedIn", member.linkedinProfile],
    ["Facebook", member.facebookProfile],
    ["Instagram", member.instagramProfile],
    ["YouTube", member.youtubeProfile],
    ["X / Twitter", member.twitterProfile],
  ].filter(([, url]) => Boolean(url)) as [string, string][];

  return (
    <SiteLayout member={member} logo={logo} favicon={favicon}>
      {contactPage ? (
        <section className="hero-surface border-b border-border/60">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <h1 className="text-4xl font-bold md:text-5xl">{contactPage.title}</h1>
            {contactPage.html ? (
              <div
                className="prose-site mt-6 max-w-3xl text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: contactPage.html }}
              />
            ) : null}
            {contactPage.posts.length > 0 ? (
              <div className="mt-10 grid gap-8 md:grid-cols-2">
                {contactPage.posts.map((post, i) => (
                  <div key={`${post.slug}-${i}`}>
                    {post.images.length > 0 || post.videos.length > 0 ? (
                      <MediaSlider images={post.images} videos={post.videos} title={post.title} />
                    ) : null}
                    {post.excerpt ? (
                      <p className="mt-4 text-sm text-muted-foreground">{post.excerpt}</p>
                    ) : null}
                    {post.attributes.length > 0 ? (
                      <dl className="mt-4 space-y-1 text-sm">
                        {post.attributes.map((a, ai) => (
                          <div key={`${a.title}-${ai}`} className="flex justify-between gap-4">
                            <dt className="text-muted-foreground">{a.title}</dt>
                            <dd>{a.value}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-surface p-7 shadow-card">
          <h2 className="text-xl font-semibold">Contact details</h2>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90"
            >
              <Mail size={18} />
              {email}
            </a>
            {member.mobileNumber ? (
              <a
                href={wa ?? `tel:${member.mobileNumber}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface"
              >
                <MessageCircle size={18} />
                {member.mobileNumber}
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
            className="h-full min-h-80 w-full"
            loading="lazy"
            src={`https://maps.google.com/maps?q=${member.bizLat},${member.bizLong}&z=15&output=embed`}
          />
        </div>
      </section>
    </SiteLayout>
  );
}
