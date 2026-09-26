import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser, hashPin, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const me = currentUser();
  if (!me) return unauthorized();
  const { current, next } = await req.json();
  if (!/^\d{4}$/.test(String(next))) return NextResponse.json({ error: "New PIN must be 4 digits" }, { status: 400 });
  const sql = db();
  const [row] = await sql`select pin_hash from pins where person_id = ${me}`;
  if (!row || row.pin_hash !== hashPin(me, String(current))) return NextResponse.json({ error: "Current PIN is wrong" }, { status: 401 });
  await sql`update pins set pin_hash = ${hashPin(me, String(next))}, updated_at = now() where person_id = ${me}`;
  return NextResponse.json({ ok: true });
}
