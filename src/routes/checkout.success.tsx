import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({ payment: z.string().optional().default("") });

export const Route = createFileRoute("/checkout/success")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Order confirmed — DreamozTech" },
      { name: "description", content: "Your DreamozTech order has been received." },
      { property: "og:title", content: "Order confirmed — DreamozTech" },
      { property: "og:description", content: "Your DreamozTech order has been received." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SuccessPage,
});

function SuccessPage() {
  const { payment } = Route.useSearch();

  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
      <h1 className="mt-6 text-3xl font-bold text-foreground">Thank you for your order</h1>
      <p className="mt-3 text-muted-foreground">
        Your payment was successful and a confirmation email is on its way.
      </p>
      {payment ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Payment reference: <span className="text-foreground">{payment}</span>
        </p>
      ) : null}
      <Link
        to="/"
        className="mt-8 inline-flex items-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Back to home
      </Link>
    </div>
  );
}
