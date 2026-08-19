import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listWebPages,
  createWebPage,
  updateWebPage,
  deleteWebPage,
  reorderWebPages,
  addPageImage,
  deletePageImage,
  type WebPage,
} from "@/lib/webpages.functions";
import { encodeImage, imageSrc } from "@/lib/image-upload";

const inputClass =
  "w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm outline-none transition focus:border-primary";

type FormState = {
  parentId: number | null;
  orderNo: number;
  title: string;
  description: string;
  seoDescription: string;
  keywords: string;
  enabled: boolean;
  videoUrl: string;
  videoEmbed: string;
  productEnabled: boolean;
  price: string;
  minQty: string;
  maxQty: string;
  shippingPrice: string;
};

const emptyForm: FormState = {
  parentId: null,
  orderNo: 0,
  title: "",
  description: "",
  seoDescription: "",
  keywords: "",
  enabled: false,
  videoUrl: "",
  videoEmbed: "",
  productEnabled: false,
  price: "",
  minQty: "",
  maxQty: "",
  shippingPrice: "",
};

const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

export function WebPagesPanel({ appId }: { appId: number }) {
  const fetchPages = useServerFn(listWebPages);
  const create = useServerFn(createWebPage);
  const update = useServerFn(updateWebPage);
  const remove = useServerFn(deleteWebPage);
  const reorder = useServerFn(reorderWebPages);
  const uploadImage = useServerFn(addPageImage);
  const removeImage = useServerFn(deletePageImage);
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery<WebPage[]>({
    queryKey: ["web-pages", appId],
    queryFn: () => fetchPages({ data: { appId } }),
  });

  const pages = useMemo(() => data ?? [], [data]);
  const parents = useMemo(
    () =>
      pages
        .filter((p) => p.parentId === null)
        .sort((a, b) => a.orderNo - b.orderNo || a.id - b.id),
    [pages],
  );
  const childrenOf = (id: number) =>
    pages
      .filter((p) => p.parentId === id)
      .sort((a, b) => a.orderNo - b.orderNo || a.id - b.id);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["web-pages", appId] });

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function startEdit(page: WebPage) {
    setEditingId(page.id);
    setForm({
      parentId: page.parentId,
      orderNo: page.orderNo,
      title: page.title,
      description: page.description,
      seoDescription: page.seoDescription,
      keywords: page.keywords,
      enabled: page.enabled,
      videoUrl: page.videoUrl,
      videoEmbed: page.videoEmbed,
      productEnabled: page.productEnabled,
      price: page.price?.toString() ?? "",
      minQty: page.minQty?.toString() ?? "",
      maxQty: page.maxQty?.toString() ?? "",
      shippingPrice: page.shippingPrice?.toString() ?? "",
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Page title is required.");
      return;
    }
    const payload = {
      appId,
      parentId: form.parentId,
      orderNo: Number(form.orderNo) || 0,
      title: form.title,
      description: form.description,
      seoDescription: form.seoDescription,
      keywords: form.keywords,
      enabled: form.enabled,
      videoUrl: form.videoUrl,
      videoEmbed: form.videoEmbed,
      productEnabled: form.parentId !== null && form.productEnabled,
      price: numOrNull(form.price),
      minQty: numOrNull(form.minQty),
      maxQty: numOrNull(form.maxQty),
      shippingPrice: numOrNull(form.shippingPrice),
    };
    setSaving(true);
    try {
      if (editingId === null) {
        await create({ data: payload });
        toast.success("Page created.");
      } else {
        await update({ data: { id: editingId, ...payload } });
        toast.success("Page updated.");
      }
      reset();
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the page.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(page: WebPage) {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Delete "${page.title}" and its sub pages?`)
    )
      return;
    try {
      await remove({ data: { id: page.id } });
      if (editingId === page.id) reset();
      toast.success("Page deleted.");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the page.");
    }
  }

  async function onDrop(targetId: number) {
    if (dragId === null || dragId === targetId) return;
    const ordered = [...parents];
    const from = ordered.findIndex((p) => p.id === dragId);
    const to = ordered.findIndex((p) => p.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = ordered.splice(from, 1);
    if (!moved) return;
    ordered.splice(to, 0, moved);
    setDragId(null);
    try {
      await reorder({
        data: {
          appId,
          items: ordered.map((p, i) => ({ id: p.id, orderNo: i })),
        },
      });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reorder pages.");
    }
  }

  async function onUpload(pageId: number, file: File | undefined) {
    if (!file) return;
    try {
      const encoded = await encodeImage(file);
      await uploadImage({ data: { pageId, ...encoded, alt: file.name.slice(0, 200) } });
      toast.success("Image added.");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload the image.");
    }
  }

  async function onRemoveImage(id: number) {
    try {
      await removeImage({ data: { id } });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove the image.");
    }
  }

  function renderPage(page: WebPage, isChild: boolean) {
    return (
      <div
        key={page.id}
        className={`rounded-2xl border border-border/60 bg-surface/40 p-5 shadow-card ${
          isChild ? "ml-6 border-dashed" : ""
        }`}
        draggable={!isChild}
        onDragStart={() => !isChild && setDragId(page.id)}
        onDragOver={(e) => !isChild && e.preventDefault()}
        onDrop={() => !isChild && onDrop(page.id)}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">
              {!isChild && <span className="mr-2 cursor-grab text-muted-foreground">⠿</span>}
              {page.title}
            </h3>
            <p className="text-xs text-muted-foreground">
              Order {page.orderNo}
              {page.productEnabled && page.price !== null
                ? ` · Product · ${page.price}`
                : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs ${
                page.enabled
                  ? "bg-primary/15 text-primary"
                  : "bg-muted/40 text-muted-foreground"
              }`}
            >
              {page.enabled ? "Enabled" : "Disabled"}
            </span>
            <button
              type="button"
              onClick={() => startEdit(page)}
              className="rounded-full border border-border/70 px-3 py-1 text-xs transition hover:bg-surface/60"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(page)}
              className="rounded-full border border-destructive/50 px-3 py-1 text-xs text-destructive transition hover:bg-destructive/10"
            >
              Delete
            </button>
          </div>
        </div>

        {page.description && (
          <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
            {page.description}
          </p>
        )}

        {page.images.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            {page.images.map((img) => (
              <div key={img.id} className="relative">
                <img
                  src={imageSrc(img)}
                  alt={img.alt || page.title}
                  className="h-20 w-28 rounded-lg object-cover"
                  loading="lazy"
                />
                <button
                  type="button"
                  onClick={() => onRemoveImage(img.id)}
                  className="absolute -right-2 -top-2 rounded-full border border-border bg-background px-2 text-xs"
                  aria-label="Remove image"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <label className="mt-4 block text-xs text-muted-foreground">
          Add image
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="mt-1 block w-full text-xs"
            onChange={(e) => {
              void onUpload(page.id, e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <form
        onSubmit={submit}
        className="max-w-3xl space-y-4 rounded-2xl border border-border/60 bg-surface/40 p-6 shadow-card"
      >
        <h3 className="text-xl font-semibold">
          {editingId === null ? "Add a web page" : "Edit web page"}
        </h3>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Page title</span>
            <input
              className={inputClass}
              value={form.title}
              maxLength={200}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Order number</span>
            <input
              className={inputClass}
              type="number"
              min={0}
              value={form.orderNo}
              onChange={(e) => setForm({ ...form, orderNo: Number(e.target.value) })}
            />
          </label>
        </div>

        <label className="block space-y-1.5 text-sm">
          <span className="text-muted-foreground">Parent page</span>
          <select
            className={inputClass}
            value={form.parentId ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                parentId: e.target.value === "" ? null : Number(e.target.value),
                productEnabled: e.target.value === "" ? false : form.productEnabled,
              })
            }
          >
            <option value="">None — this is a parent page</option>
            {parents
              .filter((p) => p.id !== editingId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
          </select>
        </label>

        <label className="block space-y-1.5 text-sm">
          <span className="text-muted-foreground">Description</span>
          <textarea
            className={`${inputClass} min-h-28`}
            maxLength={4000}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">SEO description</span>
            <input
              className={inputClass}
              maxLength={300}
              value={form.seoDescription}
              onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Keywords (comma separated)</span>
            <input
              className={inputClass}
              maxLength={500}
              value={form.keywords}
              onChange={(e) => setForm({ ...form, keywords: e.target.value })}
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Video link</span>
            <input
              className={inputClass}
              placeholder="https://youtube.com/…"
              value={form.videoUrl}
              onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Video embed code</span>
            <textarea
              className={`${inputClass} min-h-20`}
              maxLength={4000}
              value={form.videoEmbed}
              onChange={(e) => setForm({ ...form, videoEmbed: e.target.value })}
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
          />
          <span>Enabled</span>
        </label>

        {form.parentId !== null && (
          <div className="space-y-4 rounded-xl border border-border/60 p-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.productEnabled}
                onChange={(e) => setForm({ ...form, productEnabled: e.target.checked })}
              />
              <span>This page sells a product</span>
            </label>

            {form.productEnabled && (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5 text-sm">
                  <span className="text-muted-foreground">Price</span>
                  <input
                    className={inputClass}
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="text-muted-foreground">Shipping price (optional)</span>
                  <input
                    className={inputClass}
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.shippingPrice}
                    onChange={(e) => setForm({ ...form, shippingPrice: e.target.value })}
                  />
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="text-muted-foreground">Minimum quantity</span>
                  <input
                    className={inputClass}
                    type="number"
                    min={0}
                    value={form.minQty}
                    onChange={(e) => setForm({ ...form, minQty: e.target.value })}
                  />
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="text-muted-foreground">Maximum quantity</span>
                  <input
                    className={inputClass}
                    type="number"
                    min={0}
                    value={form.maxQty}
                    onChange={(e) => setForm({ ...form, maxQty: e.target.value })}
                  />
                </label>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-gradient-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : editingId === null ? "Create page" : "Save changes"}
          </button>
          {editingId !== null && (
            <button
              type="button"
              onClick={reset}
              className="rounded-full border border-border/70 px-5 py-2.5 text-sm transition hover:bg-surface/60"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-xl font-semibold">Pages</h3>
          <p className="text-xs text-muted-foreground">Drag parent pages to reorder</p>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && (
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : "Could not load pages."}
          </p>
        )}
        {!isLoading && !error && parents.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No pages yet — add your first page above.
          </p>
        )}

        <div className="space-y-4">
          {parents.map((parent) => (
            <div key={parent.id} className="space-y-3">
              {renderPage(parent, false)}
              {childrenOf(parent.id).map((child) => renderPage(child, true))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
