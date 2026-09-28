import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getApiCredentials,
  rotateApiSecret,
  type ApiCredentials,
} from "@/lib/webapi.functions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link } from "@tanstack/react-router";
import type { CurrentUser } from "@/lib/auth.functions";
import { hasApiAccess } from "@/lib/plans";


function Copy({ value }: { value: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard
          .writeText(value)
          .then(() => toast.success("Copied."))
          .catch(() => toast.error("Could not copy."));
      }}
      className="rounded-lg border border-border/70 px-3 py-1.5 text-xs transition hover:bg-surface/60"
    >
      Copy
    </button>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-border/60 bg-surface/40 p-4 text-xs leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

export function ApiPanel({ appId, user }: { appId: number; user: CurrentUser }) {
  const apiAllowed = hasApiAccess(user.access, user.plan);
  const fetchCreds = useServerFn(getApiCredentials);

  const rotate = useServerFn(rotateApiSecret);
  const [secret, setSecret] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [rotating, setRotating] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const { data, isLoading, error, refetch } = useQuery<ApiCredentials>({
    queryKey: ["web-app-api", appId],
    queryFn: () => fetchCreds({ data: { appId } }),
  });

  useEffect(() => {
    if (data?.apiSecret) setSecret(data.apiSecret);
  }, [data]);

  async function onRotate() {
    setRotating(true);
    try {
      const res = await rotate({ data: { appId } });
      setSecret(res.apiSecret ?? null);
      await refetch();
      toast.success("New secret generated. Copy it now.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not rotate the secret.");
    } finally {
      setRotating(false);
    }
  }

  const base = origin || "https://your-site.com";
  const tokenUrl = `${base}/api/public/wa/token`;
  const webappUrl = `${base}/api/public/wa/webapp`;
  const contactsUrl = `${base}/api/public/wa/contacts`;

  if (!apiAllowed) {
    return (
      <div className="max-w-2xl space-y-4 rounded-2xl border border-border/60 bg-surface/40 p-6 shadow-card">
        <h2 className="text-lg font-semibold">API access is part of the Pro plan</h2>
        <p className="text-sm text-muted-foreground">
          With Pro you get a token endpoint, your full web app content and your contact messages
          over the API, so you can build any front end you like on top of your pages and products.
        </p>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>• Token exchange with your API key and secret</li>
          <li>• Web app, pages, products and settings in one call</li>
          <li>• Read and create contact messages</li>
        </ul>
        <Link
          to="/dashboard"
          search={{ tab: "plan" }}
          className="inline-block rounded-full bg-gradient-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90"
        >
          Upgrade to Pro
        </Link>
      </div>
    );
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading API keys…</p>;

  if (error) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : "Could not load API keys."}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4 rounded-2xl border border-border/60 p-5">
        <h2 className="text-lg font-semibold">API credentials</h2>
        <div className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">API key</span>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg border border-border/70 bg-background px-3 py-2 text-xs">
              {data?.apiKey}
            </code>
            <Copy value={data?.apiKey ?? ""} />
          </div>
        </div>
        <div className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">API secret</span>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg border border-border/70 bg-background px-3 py-2 text-xs">
              {secret ?? "•••••••••••••••••••• (shown once at generation)"}
            </code>
            {secret && <Copy value={secret} />}
          </div>
          <p className="text-xs text-muted-foreground">
            Store the secret securely. If it is lost, regenerate a new one.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setConfirmRotate(true)}
          disabled={rotating}
          className="rounded-full border border-border/70 px-4 py-2 text-sm transition hover:bg-surface/60 disabled:opacity-60"
        >
          {rotating ? "Regenerating…" : "Regenerate secret"}
        </button>
      </div>

      <div className="space-y-5 rounded-2xl border border-border/60 p-5">
        <h2 className="text-lg font-semibold">API documentation</h2>

        <div className="space-y-2">
          <h3 className="font-semibold">1. Get a token</h3>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg border border-border/70 bg-background px-3 py-2 text-xs">
              POST {tokenUrl}
            </code>
            <Copy value={tokenUrl} />
          </div>
          <Code>{`curl -X POST ${tokenUrl} \\
  -H "Content-Type: application/json" \\
  -d '{"apiKey":"${data?.apiKey ?? "YOUR_KEY"}","apiSecret":"YOUR_SECRET"}'

// response
{ "token": "…", "tokenType": "Bearer", "expiresIn": 3600 }`}</Code>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">2. Get the web app data</h3>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg border border-border/70 bg-background px-3 py-2 text-xs">
              GET {webappUrl}
            </code>
            <Copy value={webappUrl} />
          </div>
          <Code>{`curl ${webappUrl} \\
  -H "Authorization: Bearer YOUR_TOKEN"

// response
{
  "webApp": { "id": 1, "title": "…", "description": "…", "email": "…",
              "link": "…", "enabled": true, "createdAt": "…", "updatedAt": "…" },
  "settings": { "country": "AU", "logo": "data:image/png;base64,…", "favicon": "…" },
  "shippingRates": {
    "byQuantity": [{ "type": "qty", "threshold": 10, "rate": 9.95, "currency": "AUD" }],
    "byAmount": [{ "type": "amount", "threshold": 100, "rate": 0, "currency": "AUD" }]
  },
  "pages": [
    {
      "id": 10, "parentId": null, "orderNo": 0, "title": "Home",
      "description": "…", "seoDescription": "…", "keywords": "…",
      "enabled": true, "embedCode": "<iframe src="https://…"></iframe>", "hyperlink": "",
      "contactEnabled": false,
      "product": { "enabled": false, "price": null, "minQty": null,
                   "maxQty": null, "shippingPrice": null, "weight": null },
      "images": [{ "id": 3, "alt": "", "orderNo": 0, "url": "data:image/…" }],
      "children": [ { "…": "sub page, same shape" } ]
    }
  ]
}`}</Code>
          <p className="text-xs text-muted-foreground">
            Tokens are valid for 1 hour and are scoped to this web app only. Requests
            without a valid bearer token return 401.
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">3. Contact messages</h3>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg border border-border/70 bg-background px-3 py-2 text-xs">
              GET | POST {contactsUrl}
            </code>
            <Copy value={contactsUrl} />
          </div>
          <Code>{`# List messages (optional ?pageId=10&limit=100&offset=0)
curl ${contactsUrl} \\
  -H "Authorization: Bearer YOUR_TOKEN"

// response
{ "messages": [ { "id": 1, "pageId": 10, "pageTitle": "Contact", "name": "…",
    "email": "…", "phone": "…", "message": "…", "isRead": false,
    "createdAt": "…", "attachments": [ { "id": "…", "name": "cv.pdf",
    "mime": "application/pdf", "url": "/api/asset/…" } ] } ] }

# Submit a message to a page with "contactEnabled": true
curl -X POST ${contactsUrl} \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"pageId":10,"name":"Jane","email":"jane@example.com","phone":"0400 000 000",
       "message":"Hello","attachment1":{"name":"cv.pdf","mime":"application/pdf",
       "data":"BASE64…"},"attachment2":null}'

// response
{ "ok": true, "id": 2 }`}</Code>
          <p className="text-xs text-muted-foreground">
            Attachments are optional: PDF, PNG, JPEG, WEBP or GIF, up to 1.5MB each (base64).
            Attachment URLs require the same bearer token.
          </p>
        </div>
      </div>

      <AlertDialog
        open={confirmRotate}
        onOpenChange={(open) => {
          if (!open && !rotating) setConfirmRotate(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate the API secret?</AlertDialogTitle>
            <AlertDialogDescription>
              The current secret stops working immediately. Anything using it will need the new
              secret.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rotating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={rotating}
              onClick={(e) => {
                e.preventDefault();
                void onRotate().finally(() => setConfirmRotate(false));
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {rotating ? "Regenerating…" : "Regenerate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
