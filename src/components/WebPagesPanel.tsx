import { useEffect, useMemo, useState } from "react";
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
  updatePageImage,
  reorderPageImages,
  type WebPage,
  type WebPageImage,
} from "@/lib/webpages.functions";
import { encodeImage, imageSrc } from "@/lib/image-upload";
import { RichTextEditor } from "@/components/RichTextEditor";

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
  hyperlink: string;
  productEnabled: boolean;
  price: string;
  minQty: string;
  maxQty: string;
  shippingPrice: string;
};

const emptyForm: FormState = {
  parentId: null,
  orderNo: 1,
  title: "",
  description: "",
  seoDescription: "",
  keywords: "",
  enabled: false,
  videoUrl: "",
  videoEmbed: "",
  hyperlink: "",
  productEnabled: false,
  price: "",
  minQty: "",
  maxQty: "",
  shippingPrice: "",
};

const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

const MAX_IMAGES = 10;

export function WebPagesPanel({ appId }: { appId: number }) {
  const fetchPages = useServerFn(listWebPages);
  const create = useServerFn(createWebPage);
  const update = useServerFn(updateWebPage);
  const remove = useServerFn(deleteWebPage);
  const reorder = useServerFn(reorderWebPages);
  const uploadImage = useServerFn(addPageImage);
  const removeImage = useServerFn(deletePageImage);
  const patchImage = useServerFn(updatePageImage);
  const reorderImages = useServerFn(reorderPageImages);
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);
  const [imgDragId, setImgDragId] = useState<number | null>(null);
  const [orderTouched, setOrderTouched] = useState(false);
  const [links, setLinks] = useState<Record<number, string>>({});
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<WebPage | null>(null);
  const [deleting, setDeleting] = useState(false);


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

  const nextOrder = (parentId: number | null) => {
    const siblings = parentId === null ? parents : childrenOf(parentId);
    return siblings.reduce((max, p) => Math.max(max, p.orderNo), 0) + 1;
  };

  const editingPage = editingId === null ? null : (pages.find((p) => p.id === editingId) ?? null);
  const editingImages: WebPageImage[] = editingPage
    ? [...editingPage.images].sort((a, b) => a.orderNo - b.orderNo || a.id - b.id)
    : [];

  function reset() {
    setEditingId(null);
    setOrderTouched(false);
    setForm({ ...emptyForm, orderNo: nextOrder(null) });
  }

  // Keep the suggested order number fresh while creating a new page.
  useEffect(() => {
    if (editingId !== null || orderTouched) return;
    const suggested = nextOrder(form.parentId);
    if (suggested !== form.orderNo) setForm((f) => ({ ...f, orderNo: suggested }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, editingId, orderTouched, form.parentId]);

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
      hyperlink: page.hyperlink,
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
      orderNo: Math.max(1, Number(form.orderNo) || 1),
      title: form.title,
      description: form.description,
      seoDescription: form.seoDescription,
      keywords: form.keywords,
      enabled: form.enabled,
      videoUrl: form.videoUrl,
      videoEmbed: form.videoEmbed,
      hyperlink: form.hyperlink,
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

  async function confirmDelete() {
    const page = pendingDelete;
    if (!page) return;
    const kids = childrenOf(page.id);
    setDeleting(true);
    try {
      await remove({ data: { id: page.id } });
      if (editingId === page.id || kids.some((c) => c.id === editingId)) reset();
      setPendingDelete(null);
      toast.success(
        kids.length > 0
          ? `Deleted 1 page and ${kids.length} sub page${kids.length === 1 ? "" : "s"}.`
          : "Deleted 1 page.",
      );
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the page.");
    } finally {
      setDeleting(false);
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
          items: ordered.map((p, i) => ({ id: p.id, orderNo: i + 1 })),
        },
      });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reorder pages.");
    }
  }

  async function onUpload(pageId: number, file: File | undefined) {
    if (!file) return;
    if (editingImages.length >= MAX_IMAGES) {
      toast.error(`You can attach up to ${MAX_IMAGES} images.`);
      return;
    }
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

  async function onSaveImageLink(img: WebPageImage) {
    const next = (links[img.id] ?? img.hyperlink).trim();
    if (next === img.hyperlink) return;
    try {
      await patchImage({ data: { id: img.id, hyperlink: next } });
      toast.success("Image link saved.");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the link.");
    }
  }

  async function onDropImage(targetId: number) {
    if (imgDragId === null || imgDragId === targetId || editingId === null) return;
    const ordered = [...editingImages];
    const from = ordered.findIndex((i) => i.id === imgDragId);
    const to = ordered.findIndex((i) => i.id === targetId);
    setImgDragId(null);
    if (from < 0 || to < 0) return;
    const [moved] = ordered.splice(from, 1);
    if (!moved) return;
    ordered.splice(to, 0, moved);
    try {
      await reorderImages({
        data: {
          pageId: editingId,
          items: ordered.map((img, i) => ({ id: img.id, orderNo: i + 1 })),
        },
      });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reorder images.");
    }
  }

  function renderPage(page: WebPage, isChild: boolean) {
    const hasChildren = childrenOf(page.id).length > 0;
    const isCollapsed = collapsed.has(page.id);
    return (
      <div
        key={page.id}
        className={`rounded-2xl border border-border/60 bg-surface/40 px-5 py-3 shadow-card ${
          isChild ? "ml-6 border-dashed" : ""
        }`}
        draggable={!isChild}
        onDragStart={() => !isChild && setDragId(page.id)}
        onDragOver={(e) => !isChild && e.preventDefault()}
        onDrop={() => !isChild && onDrop(page.id)}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">
              {!isChild && (
                <span className="mr-2 cursor-grab text-muted-foreground">⠿</span>
              )}
              {page.title}
            </h3>
            <p className="text-xs text-muted-foreground">
              Order {page.orderNo}
              {page.images.length > 0 ? ` · ${page.images.length} image(s)` : ""}
              {page.productEnabled && page.price !== null
                ? ` · Product · ${page.price}`
                : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isChild && hasChildren && (
              <button
                type="button"
                onClick={() =>
                  setCollapsed((prev) => {
                    const next = new Set(prev);
                    if (next.has(page.id)) next.delete(page.id);
                    else next.add(page.id);
                    return next;
                  })
                }
                className="rounded-full border border-border/70 px-3 py-1 text-xs transition hover:bg-surface/60"
                aria-label={isCollapsed ? "Expand child pages" : "Collapse child pages"}
                title={isCollapsed ? "Expand child pages" : "Collapse child pages"}
              >
                {isCollapsed ? "▸" : "▾"}
              </button>
            )}
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
              min={1}
              max={9999}
              value={form.orderNo}
              onChange={(e) => {
                setOrderTouched(true);
                setForm({ ...form, orderNo: Number(e.target.value) });
              }}
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

        <div className="block space-y-1.5 text-sm">
          <span className="text-muted-foreground">Description</span>
          <RichTextEditor
            value={form.description}
            appId={appId}
            onChange={(html) => setForm({ ...form, description: html })}
            placeholder="Format text, insert images or attach a PDF (max 1MB each)."
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">SEO description</span>
            <textarea
              className={`${inputClass} min-h-20`}
              rows={4}
              maxLength={300}
              value={form.seoDescription}
              onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Keywords (comma separated)</span>
            <textarea
              className={`${inputClass} min-h-20`}
              rows={4}
              maxLength={500}
              value={form.keywords}
              onChange={(e) => setForm({ ...form, keywords: e.target.value })}
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Video link</span>
            <textarea
              className={`${inputClass} min-h-20`}
              rows={3}
              maxLength={500}
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

        <label className="block space-y-1.5 text-sm">
          <span className="text-muted-foreground">Hyperlink (optional)</span>
          <input
            className={inputClass}
            type="url"
            maxLength={500}
            placeholder="https://example.com/page"
            value={form.hyperlink}
            onChange={(e) => setForm({ ...form, hyperlink: e.target.value })}
          />
        </label>

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
                    max={1000000}
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
                    max={1000000}
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
                    max={1000000}
                    step={1}
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
                    max={1000000}
                    step={1}
                    value={form.maxQty}
                    onChange={(e) => setForm({ ...form, maxQty: e.target.value })}
                  />
                </label>
              </div>
            )}
          </div>
        )}

        <div className="space-y-3 rounded-xl border border-border/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold">Images ({editingImages.length}/{MAX_IMAGES})</h4>
            {editingImages.length > 1 && (
              <span className="text-xs text-muted-foreground">Drag to reorder</span>
            )}
          </div>

          {editingId === null ? (
            <p className="text-xs text-muted-foreground">
              Save the page first, then attach images here.
            </p>
          ) : (
            <>
              <div className="space-y-3">
                {editingImages.map((img) => (
                  <div
                    key={img.id}
                    draggable
                    onDragStart={() => setImgDragId(img.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => void onDropImage(img.id)}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-2"
                  >
                    <span className="cursor-grab text-muted-foreground">⠿</span>
                    <img
                      src={imageSrc(img)}
                      alt={img.alt}
                      className="h-16 w-24 rounded-md object-cover"
                      loading="lazy"
                    />
                    <input
                      className={`${inputClass} min-w-[14rem] flex-1`}
                      placeholder="Hyperlink (optional)"
                      maxLength={500}
                      value={links[img.id] ?? img.hyperlink}
                      onChange={(e) => setLinks({ ...links, [img.id]: e.target.value })}
                      onBlur={() => void onSaveImageLink(img)}
                    />
                    <button
                      type="button"
                      onClick={() => void onRemoveImage(img.id)}
                      className="rounded-full border border-destructive/50 px-3 py-1 text-xs text-destructive transition hover:bg-destructive/10"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              {editingImages.length < MAX_IMAGES && (
                <label className="block text-xs text-muted-foreground">
                  Add image
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="mt-1 block w-full text-xs"
                    onChange={(e) => {
                      void onUpload(editingId, e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </>
          )}
        </div>

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
          {parents.map((parent) => {
            const isCollapsed = collapsed.has(parent.id);
            return (
              <div key={parent.id} className="space-y-3">
                {renderPage(parent, false)}
                {!isCollapsed &&
                  childrenOf(parent.id).map((child) => renderPage(child, true))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
