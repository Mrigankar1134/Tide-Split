import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PEOPLE_BY_ID } from "@/lib/people";
import { hashPin, setSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { person_id, pin } = await req.json();
    if (!PEOPLE_BY_ID[person_id] || !/^\d{4}$/.test(String(pin))) return NextResponse.json({ error: "Enter your 4-digit PIN" }, { status: 400 });
    const sql = db();
    const [row] = await sql`select pin_hash from pins where person_id = ${person_id}`;
    if (!row || row.pin_hash !== hashPin(person_id, String(pin))) {
      await new Promise((r) => setTimeout(r, 600)); // slow down guessing
      return NextResponse.json({ error: "Wrong PIN" }, { status: 401 });
    }
    return setSession(NextResponse.json({ ok: true, me: person_id }), person_id);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Login failed" }, { status: 500 });
  }
}
