import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getAppSettings,
  saveAppSettings,
  type AppSettings,
} from "@/lib/webpages.functions";
import { encodeImage, imageSrc } from "@/lib/image-upload";

const inputClass =
  "w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm outline-none transition focus:border-primary";

type Media = { mime: string; data: string } | null;

export function AppSettingsPanel({ appId }: { appId: number }) {
  const fetchSettings = useServerFn(getAppSettings);
  const save = useServerFn(saveAppSettings);
  const queryClient = useQueryClient();

  const [logo, setLogo] = useState<Media>(null);
  const [favicon, setFavicon] = useState<Media>(null);
  const [shipping, setShipping] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading, error } = useQuery<AppSettings>({
    queryKey: ["app-settings", appId],
    queryFn: () => fetchSettings({ data: { appId } }),
  });

  useEffect(() => {
    if (!data) return;
    setLogo(data.logo);
    setFavicon(data.favicon);
    setShipping(data.defaultShippingPrice?.toString() ?? "");
  }, [data]);

  async function pick(file: File | undefined, set: (m: Media) => void, max: number) {
    if (!file) return;
    try {
      set(await encodeImage(file, max));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that file.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await save({
        data: {
          appId,
          logo,
          favicon,
          defaultShippingPrice: shipping.trim() === "" ? null : Number(shipping),
        },
      });
      toast.success("Settings saved.");
      await queryClient.invalidateQueries({ queryKey: ["app-settings", appId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error)
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : "Could not load settings."}
      </p>
    );

  return (
    <form
      onSubmit={submit}
      className="max-w-2xl space-y-6 rounded-2xl border border-border/60 bg-surface/40 p-6 shadow-card"
    >
      <h3 className="text-xl font-semibold">General settings</h3>

      <div className="space-y-2">
        <span className="text-sm text-muted-foreground">Logo image</span>
        <div className="flex items-center gap-4">
          {logo && (
            <img
              src={imageSrc(logo)}
              alt="Logo preview"
              className="h-14 w-auto rounded-lg bg-background object-contain p-1"
            />
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="text-xs"
            onChange={(e) => void pick(e.target.files?.[0], setLogo, 600)}
          />
          {logo && (
            <button
              type="button"
              onClick={() => setLogo(null)}
              className="text-xs text-destructive"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-sm text-muted-foreground">Favicon</span>
        <div className="flex items-center gap-4">
          {favicon && (
            <img
              src={imageSrc(favicon)}
              alt="Favicon preview"
              className="h-8 w-8 rounded bg-background object-contain p-0.5"
            />
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,.ico"
            className="text-xs"
            onChange={(e) => void pick(e.target.files?.[0], setFavicon, 128)}
          />
          {favicon && (
            <button
              type="button"
              onClick={() => setFavicon(null)}
              className="text-xs text-destructive"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <label className="block space-y-1.5 text-sm">
        <span className="text-muted-foreground">Default shipping price (optional)</span>
        <input
          className={inputClass}
          type="number"
          min={0}
          max={1000000}
          step="0.01"
          value={shipping}
          onChange={(e) => setShipping(e.target.value)}
        />
      </label>

      <button
        type="submit"
        disabled={saving}
        className="rounded-full bg-gradient-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
