import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getApiCredentials,
  rotateApiSecret,
  type ApiCredentials,
} from "@/lib/webapi.functions";

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

export function ApiPanel({ appId }: { appId: number }) {
  const fetchCreds = useServerFn(getApiCredentials);
  const rotate = useServerFn(rotateApiSecret);
  const [secret, setSecret] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [rotating, setRotating] = useState(false);

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
    if (!window.confirm("Regenerate the API secret? The current secret stops working.")) {
      return;
    }
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
          onClick={onRotate}
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
  "settings": { "logo": "data:image/png;base64,…", "favicon": "…",
                "defaultShippingPrice": 9.95 },
  "pages": [
    {
      "id": 10, "parentId": null, "orderNo": 0, "title": "Home",
      "description": "…", "seoDescription": "…", "keywords": "…",
      "enabled": true, "videoUrl": "", "videoEmbed": "",
      "product": { "enabled": false, "price": null, "minQty": null,
                   "maxQty": null, "shippingPrice": null },
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
      </div>
    </div>
  );
}
