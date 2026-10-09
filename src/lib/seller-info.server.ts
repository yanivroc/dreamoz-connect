import type { Client } from "@libsql/client/web";
import { formatAuPhone } from "./phone";

export interface SellerInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
}

/** Contact details of a seller account, formatted for invoices. */
export async function getSellerInfo(db: Client, userId: number): Promise<SellerInfo | null> {
  const res = await db.execute({
    sql: "SELECT name, email, phone, address FROM users WHERE id = ? LIMIT 1",
    args: [userId],
  });
  const r = res.rows[0] as Record<string, unknown> | undefined;
  if (!r) return null;
  return {
    name: String(r["name"] ?? ""),
    email: String(r["email"] ?? ""),
    phone: r["phone"] ? formatAuPhone(r["phone"]) : "",
    address: String(r["address"] ?? ""),
  };
}

/** The platform (first admin) account — the seller on plan invoices. */
export async function getPlatformSeller(db: Client): Promise<SellerInfo | null> {
  const res = await db.execute(
    "SELECT id FROM users WHERE role = 'admin' AND deleted_at IS NULL ORDER BY id ASC LIMIT 1",
  );
  const id = res.rows[0] ? Number((res.rows[0] as Record<string, unknown>)["id"]) : 0;
  return id ? getSellerInfo(db, id) : null;
}
