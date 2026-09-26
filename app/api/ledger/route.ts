import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { presignView, s3Configured } from "@/lib/s3";
import type { Expense, Settlement } from "@/lib/types";
import { currentUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!currentUser()) return unauthorized();
  try {
    const sql = db();
    const [rows, settlements] = await Promise.all([
      sql`
        select e.id, e.description, e.amount, e.category, e.created_by, e.receipt_key, e.created_at, e.lat, e.lng, e.place,
          coalesce((select json_agg(json_build_object('person_id', p.person_id, 'amount', p.amount))
                    from expense_payers p where p.expense_id = e.id), '[]'::json) as payers,
          coalesce((select json_agg(json_build_object('person_id', s.person_id, 'amount', s.amount))
                    from expense_shares s where s.expense_id = e.id), '[]'::json) as shares
        from expenses e order by e.created_at desc`,
      sql`select * from settlements order by created_at desc`,
    ]);

    const canSign = s3Configured();
    const expenses: Expense[] = await Promise.all(
      rows.map(async (r: any) => ({
        id: r.id,
        description: r.description,
        amount: Number(r.amount),
        category: r.category,
        created_by: r.created_by,
        created_at: r.created_at,
        receipt_key: r.receipt_key,
        lat: r.lat, lng: r.lng, place: r.place,
        receipt_url: r.receipt_key && canSign ? await presignView(r.receipt_key) : null,
        payers: (r.payers as any[]).map((p) => ({ person_id: p.person_id, amount: Number(p.amount) })),
        shares: (r.shares as any[]).map((p) => ({ person_id: p.person_id, amount: Number(p.amount) })),
      }))
    );
    const out: Settlement[] = settlements.map((s: any) => ({ ...s, amount: Number(s.amount) }));
    return NextResponse.json({ expenses, settlements: out });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to load ledger" }, { status: 500 });
  }
}
