import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { removeObject, s3Configured } from "@/lib/s3";
import { currentUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!currentUser()) return unauthorized();
  try {
    const sql = db();
    const [row] = await sql`delete from expenses where id = ${params.id} returning receipt_key`;
    if (row?.receipt_key && s3Configured()) await removeObject(row.receipt_key);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to delete" }, { status: 500 });
  }
}
