import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PEOPLE_BY_ID } from "@/lib/people";
import { currentUser, unauthorized } from "@/lib/auth";
import { ensureRules } from "@/lib/rules";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const me = currentUser();
  if (!me) return unauthorized();
  try {
    const { from_person, to_person } = await req.json();
    if (!PEOPLE_BY_ID[from_person] || !PEOPLE_BY_ID[to_person] || from_person === to_person)
      return NextResponse.json({ error: "Pick two different people" }, { status: 400 });
    if (from_person !== me && to_person !== me)
      return NextResponse.json({ error: "You can only set preferences for payments you're part of" }, { status: 403 });
    const sql = db();
    await ensureRules(sql);
    const [row] = await sql`insert into plan_rules (from_person, to_person, created_by) values (${from_person}, ${to_person}, ${me})
      on conflict (from_person, to_person) do update set created_by = excluded.created_by returning id`;
    return NextResponse.json({ id: row.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Couldn't save the preference" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const me = currentUser();
  if (!me) return unauthorized();
  try {
    const { id } = await req.json();
    const sql = db();
    await ensureRules(sql);
    const [row] = await sql`select from_person, to_person from plan_rules where id = ${id}`;
    if (!row) return NextResponse.json({ ok: true });
    if (row.from_person !== me && row.to_person !== me)
      return NextResponse.json({ error: "Only the two people involved can remove this" }, { status: 403 });
    await sql`delete from plan_rules where id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Couldn't remove the preference" }, { status: 500 });
  }
}
