import { createFileRoute } from "@tanstack/react-router";
import { overviewFn } from "@/lib/dreamoz.functions";
import { SiteLayout } from "@/components/SiteLayout";
import type { SiteOverview } from "@/lib/dreamoz.types";
import { formatDate, whatsappLink } from "@/lib/format";
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
              <dt className="text-muted-foreground">Email</dt>
              <dd>
                <a
                  href={`mailto:${email}`}
                  className="text-primary hover:underline"
                >
                  {email}
                </a>
              </dd>
            </div>
            {member.mobileNumber ? (
              <div>
                <dt className="text-muted-foreground">WhatsApp</dt>
                <dd>
                  <a
                    href={wa ?? `tel:${member.mobileNumber}`}
                    target="_blank"
                    rel="noreferrer"
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

      {contactPage ? (
        <section className="border-t border-border/60 bg-surface/40">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <h2 className="text-2xl font-semibold md:text-3xl">{contactPage.title}</h2>
            {contactPage.html ? (
              <div
                className="prose-site mt-6 max-w-none text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: contactPage.html }}
              />
            ) : null}
            {contactPage.posts.length > 0 ? (
              <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {contactPage.posts.map((post, i) => (
                  <article
                    key={`${post.slug}-${i}`}
                    className="rounded-xl border border-border/70 bg-surface p-6 shadow-card"
                  >
                    {post.images.length > 0 || post.videos.length > 0 ? (
                      <MediaSlider images={post.images} videos={post.videos} title={post.title} />
                    ) : null}
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatDate(post.date)}</span>
                      {post.categories.map((c) => (
                        <span
                          key={c}
                          className="rounded-full border border-border px-2.5 py-0.5 uppercase tracking-wide"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                    <h3 className="mt-3 text-lg font-semibold">{post.title}</h3>
                    {post.excerpt ? (
                      <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>
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
                    {post.link ? (
                      <a
                        href={post.link}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
                      >
                        Learn more ↗
                      </a>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </SiteLayout>
  );
}
