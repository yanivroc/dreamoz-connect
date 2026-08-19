export type EncodedImage = { mime: string; data: string };

const MAX_DIMENSION = 1400;
const MAX_BYTES = 1_000_000;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image."));
    img.src = src;
  });
}

/** Resize + compress in the browser, returning base64 (no data: prefix). */
export async function encodeImage(
  file: File,
  maxDimension = MAX_DIMENSION,
): Promise<EncodedImage> {
  const dataUrl = await readAsDataUrl(file);

  if (file.type === "image/svg+xml" || file.type.includes("icon")) {
    const base64 = dataUrl.split(",")[1] ?? "";
    if (base64.length > MAX_BYTES) throw new Error("That file is too large (max 1MB).");
    return { mime: file.type, data: base64 };
  }

  const img = await loadImage(dataUrl);
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process that image.");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  let quality = 0.85;
  let out = canvas.toDataURL("image/jpeg", quality);
  while (out.length > MAX_BYTES && quality > 0.4) {
    quality -= 0.15;
    out = canvas.toDataURL("image/jpeg", quality);
  }
  const base64 = out.split(",")[1] ?? "";
  if (base64.length > MAX_BYTES) throw new Error("That image is too large (max 1MB).");
  return { mime: "image/jpeg", data: base64 };
}

export function imageSrc(img: { mime: string; data: string }) {
  return `data:${img.mime};base64,${img.data}`;
}
