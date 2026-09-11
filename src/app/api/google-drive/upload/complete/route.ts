import { NextResponse } from "next/server";

import { getDriveFile } from "@/lib/google-drive";
import { requireModule } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fileSizeText(value: unknown) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export async function POST(request: Request) {
  const { supabase, userId } = await requireModule("academic");
  const body = await request.json().catch(() => null);
  const driveFileId = String(body?.driveFileId || "").trim();
  const category = String(body?.category || "Skripsi").trim() || "Skripsi";
  const status = String(body?.status || "draft").trim();
  const versionLabel = String(body?.versionLabel || "").trim();
  const notes = String(body?.notes || "").trim();
  const documentDate = String(body?.documentDate || "").trim() || new Date().toISOString().slice(0, 10);

  if (!driveFileId) return NextResponse.json({ error: "ID file Google Drive tidak valid." }, { status: 400 });
  if (!["draft", "sent", "revision", "approved"].includes(status)) {
    return NextResponse.json({ error: "Status file tidak valid." }, { status: 400 });
  }

  try {
    const { file, connection } = await getDriveFile(userId, driveFileId);
    if (!connection.thesis_folder_id || !Array.isArray(file.parents) || !file.parents.includes(connection.thesis_folder_id)) {
      return NextResponse.json({ error: "File bukan berasal dari folder Skripsi OURJOURNAL." }, { status: 403 });
    }

    const driveUrl = String(file.webViewLink || `https://drive.google.com/file/d/${driveFileId}/view`);
    const payload = {
      user_id: userId,
      drive_file_id: driveFileId,
      file_name: String(file.name || "File Skripsi"),
      version_label: versionLabel,
      category,
      status,
      drive_url: driveUrl,
      file_size_text: fileSizeText(file.size),
      notes,
      document_date: documentDate,
    };

    const { data: existing } = await supabase
      .from("thesis_files")
      .select("id")
      .eq("user_id", userId)
      .eq("drive_file_id", driveFileId)
      .maybeSingle();

    const result = existing?.id
      ? await supabase.from("thesis_files").update(payload).eq("id", existing.id).eq("user_id", userId)
      : await supabase.from("thesis_files").insert(payload);

    if (result.error) throw new Error(result.error.message);
    return NextResponse.json({ ok: true, driveUrl, fileName: payload.file_name });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Gagal menyimpan metadata file Skripsi.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
