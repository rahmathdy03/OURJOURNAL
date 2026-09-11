import { NextResponse } from "next/server";

import { disconnectGoogleDrive } from "@/lib/google-drive";
import { requireModule } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const { userId } = await requireModule("academic");
  await disconnectGoogleDrive(userId);
  return NextResponse.json({ ok: true });
}
