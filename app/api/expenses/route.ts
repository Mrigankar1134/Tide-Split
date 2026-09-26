import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PEOPLE_BY_ID } from "@/lib/people";
import { round2, sumPortions } from "@/lib/split";
import type { NewExpense } from "@/lib/types";
import { currentUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const me = currentUser();
  if (!me) return unauthorized();
  try {
    const body = (await req.json()) as NewExpense;
    const amount = round2(Number(body.amount));
    const description = (body.description ?? "").trim();
    if (!description) return NextResponse.json({ error: "Add a description" }, { status: 400 });
    if (!(amount > 0)) return NextResponse.json({ error: "Amount must be more than zero" }, { status: 400 });
    const payers = (body.payers ?? []).filter((p) => p.amount > 0 && PEOPLE_BY_ID[p.person_id]);
    const shares = (body.shares ?? []).filter((p) => p.amount > 0 && PEOPLE_BY_ID[p.person_id]);
    if (payers.length === 0) return NextResponse.json({ error: "Choose who paid" }, { status: 400 });
    if (shares.length === 0) return NextResponse.json({ error: "Choose who shares this" }, { status: 400 });
    if (Math.abs(sumPortions(payers) - amount) > 0.011) return NextResponse.json({ error: "Paid amounts don't add up to the total" }, { status: 400 });
    if (Math.abs(sumPortions(shares) - amount) > 0.011) return NextResponse.json({ error: "Split doesn't add up to the total" }, { status: 400 });

    const sql = db();
    const [row] = await sql`
      insert into expenses (description, amount, category, created_by, receipt_key, lat, lng, place)
      values (${description}, ${amount}, ${body.category ?? "other"}, ${me}, ${body.receipt_key ?? null}, ${body.lat ?? null}, ${body.lng ?? null}, ${body.place ?? null})
      returning id`;
    const id = row.id as string;
    await Promise.all([
      ...payers.map((p) => sql`insert into expense_payers (expense_id, person_id, amount) values (${id}, ${p.person_id}, ${round2(p.amount)})`),
      ...shares.map((s) => sql`insert into expense_shares (expense_id, person_id, amount) values (${id}, ${s.person_id}, ${round2(s.amount)})`),
    ]);
    return NextResponse.json({ id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to save expense" }, { status: 500 });
  }
}
