import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PEOPLE_BY_ID } from "@/lib/people";
import { round2 } from "@/lib/split";
import { currentUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const me = currentUser();
  if (!me) return unauthorized();
  try {
    const { from_person, to_person, amount, note, lat, lng, place } = await req.json();
    if (from_person !== me && to_person !== me) return NextResponse.json({ error: "You can only record payments you're part of" }, { status: 403 });
    const amt = round2(Number(amount));
    if (!PEOPLE_BY_ID[from_person] || !PEOPLE_BY_ID[to_person] || from_person === to_person)
      return NextResponse.json({ error: "Pick two different people" }, { status: 400 });
    if (!(amt > 0)) return NextResponse.json({ error: "Amount must be more than zero" }, { status: 400 });
    const sql = db();
    const [row] = await sql`insert into settlements (from_person, to_person, amount, note, lat, lng, place) values (${from_person}, ${to_person}, ${amt}, ${note ?? null}, ${lat ?? null}, ${lng ?? null}, ${place ?? null}) returning id`;
    return NextResponse.json({ id: row.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to record payment" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!currentUser()) return unauthorized();
  try {
    const { id } = await req.json();
    const sql = db();
    await sql`delete from settlements where id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to delete" }, { status: 500 });
  }
}
