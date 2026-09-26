import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const COOKIE = "ts_session";
const MAX_AGE = 60 * 60 * 24 * 180; // 180 days

const secret = () => process.env.SESSION_SECRET || process.env.DATABASE_URL || "tide-split-dev-secret";

export const hashPin = (personId: string, pin: string) => createHash("sha256").update(`${personId}:${pin}`).digest("hex");

const sig = (payload: string) => createHmac("sha256", secret()).update(payload).digest("hex");

export function issueToken(personId: string) {
  const payload = `${personId}.${Date.now()}`;
  return `${payload}.${sig(payload)}`;
}

export function verifyToken(token?: string | null): string | null {
  if (!token) return null;
  const [id, ts, mac] = token.split(".");
  if (!id || !ts || !mac) return null;
  const expected = sig(`${id}.${ts}`);
  if (expected.length !== mac.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(mac))) return null;
  if (Date.now() - Number(ts) > MAX_AGE * 1000) return null;
  return id;
}

export const currentUser = () => verifyToken(cookies().get(COOKIE)?.value);

export function setSession(res: NextResponse, personId: string) {
  res.cookies.set(COOKIE, issueToken(personId), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: MAX_AGE, path: "/" });
  return res;
}
export function clearSession(res: NextResponse) {
  res.cookies.set(COOKIE, "", { httpOnly: true, maxAge: 0, path: "/" });
  return res;
}
export const unauthorized = () => NextResponse.json({ error: "Please log in again" }, { status: 401 });
