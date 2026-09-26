import { NextResponse } from "next/server";
import { presignUpload, s3Configured } from "@/lib/s3";
import { currentUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

export async function POST(req: Request) {
  if (!currentUser()) return unauthorized();
  if (!s3Configured()) return NextResponse.json({ error: "Receipt storage isn't set up yet (S3 env vars missing)" }, { status: 503 });
  const { filename, contentType } = await req.json();
  if (!ALLOWED.includes(contentType)) return NextResponse.json({ error: "Use a photo (JPG/PNG/WebP/HEIC) or a PDF" }, { status: 400 });
  const safe = String(filename ?? "receipt").replace(/[^\w.\-]+/g, "_").slice(0, 80);
  const key = `receipts/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safe}`;
  const uploadUrl = await presignUpload(key, contentType);
  return NextResponse.json({ uploadUrl, key });
}
