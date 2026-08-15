import { get, put } from "@vercel/blob";

const SNAPSHOT_PATH = "dreamoz/snapshot.json";

export type StoredSnapshot<T> = { savedAt: string; data: T };

function token(): string | undefined {
  return process.env["VERCEL_BLOB_TOKEN"] || process.env["BLOB_READ_WRITE_TOKEN"];
}

export async function readSnapshot<T>(): Promise<StoredSnapshot<T> | null> {
  const t = token();
  if (!t) return null;
  try {
    const result = await get(SNAPSHOT_PATH, {
      access: "private",
      useCache: false,
      token: t,
    });
    if (!result?.stream) return null;
    const text = await new Response(result.stream).text();
    const parsed = JSON.parse(text) as StoredSnapshot<T>;
    if (!parsed || typeof parsed !== "object" || !("data" in parsed)) return null;
    return parsed;
  } catch (err) {
    console.warn("[snapshot] read failed", err);
    return null;
  }
}

export async function writeSnapshot<T>(data: T): Promise<string | null> {
  const t = token();
  if (!t) return null;
  const savedAt = new Date().toISOString();
  try {
    await put(SNAPSHOT_PATH, JSON.stringify({ savedAt, data }), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 0,
      token: t,
    });
    return savedAt;
  } catch (err) {
    console.warn("[snapshot] write failed", err);
    return null;
  }
}
