import { headers } from "next/headers";
import { verifyIdToken } from "@/lib/firebase/admin";

export async function requireUser() {
  const h = await headers();
  const auth = h.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
  if (!token) throw new Error("Missing Authorization bearer token");
  const decoded = await verifyIdToken(token);
  return { uid: decoded.uid, email: decoded.email ?? null, name: decoded.name ?? null };
}


