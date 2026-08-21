import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { uploadAsset } from "@/lib/assets.functions";
import { encodeImage, encodePdf } from "@/lib/image-upload";

type Props = {
  value: string;
  onChange: (html: string) => void;
  appId?: number | null;
  placeholder?: string;
};

const btn =
  "rounded-md border border-border/60 px-2 py-1 text-xs transition hover:bg-surface/60 disabled:opacity-50";
const btnOn = "bg-primary/15 text-primary border-primary/40";

/** Plain-text legacy descriptions become a paragraph so the editor can load them. */
function toHtml(value: string) {
  if (!value) return "";
  if (/<[a-z][\s\S]*>/i.test(value)) return value;
  return value
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export function RichTextEditor({ value, onChange, appId, placeholder }: Props) {
  const upload = useServerFn(uploadAsset);
  const imageInput = useRef<HTMLInputElement>(null);
  const pdfInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, HTMLAttributes: { rel: "noreferrer noopener" } },
      }),
      Image.configure({ HTMLAttributes: { class: "rounded-lg" } }),
    ],
    content: toHtml(value),
    editorProps: {
      attributes: {
        class:
          "prose-site min-h-40 max-w-none px-3 py-2 text-sm outline-none [&_img]:max-w-full",
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    const next = toHtml(value);
    if (next !== editor.getHTML()) editor.commands.setContent(next, { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="min-h-40 rounded-lg border border-border/70 bg-background px-3 py-2 text-sm text-muted-foreground">
        Loading editor…
      </div>
    );
  }

  const mark = (name: string, active: boolean) => `${btn} ${active ? btnOn : ""}`;

  async function pickImage(file: File | undefined) {
    if (!file || !editor) return;
    setBusy(true);
    try {
      const enc = await encodeImage(file);
      const asset = await upload({
        data: {
          appId: appId ?? null,
          kind: "image" as const,
          mime: enc.mime,
          name: file.name.slice(0, 200),
          data: enc.data,
        },
      });
      editor.chain().focus().setImage({ src: asset.url, alt: file.name }).run();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload that image.");
    } finally {
      setBusy(false);
    }
  }

  async function pickPdf(file: File | undefined) {
    if (!file || !editor) return;
    setBusy(true);
    try {
      const enc = await encodePdf(file);
      const asset = await upload({
        data: {
          appId: appId ?? null,
          kind: "pdf" as const,
          mime: enc.mime,
          name: enc.name.slice(0, 200),
          data: enc.data,
        },
      });
      editor
        .chain()
        .focus()
        .insertContent(
          `<p><a href="${asset.url}" target="_blank" rel="noreferrer noopener" data-pdf="1">${enc.name}</a></p>`,
        )
        .run();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload that PDF.");
    } finally {
      setBusy(false);
    }
  }

  function setLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link")["href"] as string | undefined;
    const url = window.prompt("Link URL (https://…)", previous ?? "https://");
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    if (!/^(https?:\/\/|mailto:|tel:)/i.test(url.trim())) {
      toast.error("Link must start with http://, https://, mailto: or tel:");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  const blockValue = (() => {
    for (const level of [1, 2, 3, 4, 5, 6] as const) {
      if (editor.isActive("heading", { level })) return `h${level}`;
    }
    if (editor.isActive("blockquote")) return "quote";
    if (editor.isActive("codeBlock")) return "codeBlock";
    return "p";
  })();

  function applyBlock(value: string) {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (value === "p") chain.setParagraph().run();
    else if (value === "quote") chain.toggleBlockquote().run();
    else if (value === "codeBlock") chain.toggleCodeBlock().run();
    else {
      const level = Number(value.slice(1)) as 1 | 2 | 3 | 4 | 5 | 6;
      chain.setNode("heading", { level }).run();
    }
  }

  const inList = editor.isActive("listItem");

  return (
    <div className="rounded-lg border border-border/70 bg-background">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border/60 px-2 py-2">
        <select
          aria-label="Text style"
          className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs outline-none"
          value={blockValue}
          onChange={(e) => applyBlock(e.target.value)}
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
          <option value="h5">Heading 5</option>
          <option value="h6">Heading 6</option>
          <option value="quote">Quote</option>
          <option value="codeBlock">Code block</option>
        </select>
        <button
          type="button"
          className={mark("bold", editor.isActive("bold"))}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          Bold
        </button>
        <button
          type="button"
          className={mark("italic", editor.isActive("italic"))}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          Italic
        </button>
        <button
          type="button"
          className={mark("underline", editor.isActive("underline"))}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          Underline
        </button>
        <button
          type="button"
          className={mark("strike", editor.isActive("strike"))}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          Strike
        </button>
        <button
          type="button"
          className={mark("code", editor.isActive("code"))}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          Code
        </button>
        <button
          type="button"
          className={mark("ul", editor.isActive("bulletList"))}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • List
        </button>
        <button
          type="button"
          className={mark("ol", editor.isActive("orderedList"))}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. List
        </button>
        <button
          type="button"
          className={btn}
          disabled={!inList}
          title="Indent list item"
          onClick={() => editor.chain().focus().sinkListItem("listItem").run()}
        >
          →|
        </button>
        <button
          type="button"
          className={btn}
          disabled={!inList}
          title="Outdent list item"
          onClick={() => editor.chain().focus().liftListItem("listItem").run()}
        >
          |←
        </button>
        <button
          type="button"
          className={btn}
          title="Insert horizontal line"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          — Line
        </button>
        <button
          type="button"
          className={btn}
          title="Insert line break"
          onClick={() => editor.chain().focus().setHardBreak().run()}
        >
          ↵ Break
        </button>
        <button
          type="button"
          className={mark("link", editor.isActive("link"))}
          onClick={setLink}
        >
          Link
        </button>
        <button
          type="button"
          className={btn}
          disabled={busy}
          onClick={() => imageInput.current?.click()}
        >
          {busy ? "Uploading…" : "Image"}
        </button>
        <button
          type="button"
          className={btn}
          disabled={busy}
          onClick={() => pdfInput.current?.click()}
        >
          PDF
        </button>
        <button
          type="button"
          className={btn}
          title="Undo"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          ↶
        </button>
        <button
          type="button"
          className={btn}
          title="Redo"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          ↷
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          Clear format
        </button>
      </div>


      <EditorContent editor={editor} />
      {placeholder && editor.isEmpty && (
        <p className="px-3 pb-2 text-xs text-muted-foreground">{placeholder}</p>
      )}

      <input
        ref={imageInput}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          void pickImage(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={pdfInput}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          void pickPdf(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
