import { NextResponse } from "next/server";

import { createResumableUploadSession } from "@/lib/google-drive";
import { requireModule } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 250 * 1024 * 1024;

export async function POST(request: Request) {
  const { userId } = await requireModule("academic");
  const body = await request.json().catch(() => null);
  const name = String(body?.name || "").trim();
  const mimeType = String(body?.mimeType || "application/octet-stream").trim() || "application/octet-stream";
  const size = Number(body?.size || 0);

  if (!name || name.length > 220) return NextResponse.json({ error: "Nama file tidak valid." }, { status: 400 });
  if (!Number.isFinite(size) || size <= 0 || size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Ukuran file harus lebih dari 0 dan maksimal 250 MB." }, { status: 400 });
  }

  try {
    const result = await createResumableUploadSession(userId, { name, mimeType, size });
    return NextResponse.json(result);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Gagal menyiapkan upload Google Drive.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
