import { useSession } from "@tanstack/react-start/server";

export type SessionData = {
  userId?: number;
  role?: string;
};

function sessionConfig() {
  const password =
    process.env["SESSION_SECRET"]?.trim() ||
    // Dev-only fallback so the preview doesn't crash before the secret is set.
    "dev-only-insecure-session-password-change-me";
  return {
    password,
    name: "dreamoz-session",
    maxAge: 60 * 60 * 24 * 7,
  };
}

export async function readSession(): Promise<SessionData> {
  const session = await useSession<SessionData>(sessionConfig());
  return session.data ?? {};
}

export async function setSession(data: SessionData): Promise<void> {
  const session = await useSession<SessionData>(sessionConfig());
  await session.update(data);
}

export async function destroySession(): Promise<void> {
  const session = await useSession<SessionData>(sessionConfig());
  await session.clear();
}
