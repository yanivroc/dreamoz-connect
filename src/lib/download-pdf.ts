/** Triggers a browser download of a base64-encoded PDF. */
export function downloadBase64Pdf(name: string, content: string) {
  const bytes = Uint8Array.from(atob(content), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
