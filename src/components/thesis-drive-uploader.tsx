"use client";

import { CheckCircle2, CloudUpload, ExternalLink, FolderOpen, Link2, LoaderCircle, Unplug, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Props = {
  configured: boolean;
  connected: boolean;
  email?: string;
  folderUrl?: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function ThesisDriveUploader({ configured, connected, email, folderUrl }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function disconnect() {
    if (!window.confirm("Putuskan Google Drive dari OURJOURNAL? File yang sudah di Drive tidak akan dihapus.")) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/google-drive/disconnect", { method: "POST" });
      if (!response.ok) throw new Error("Gagal memutuskan Google Drive.");
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Gagal memutuskan Google Drive.");
    } finally {
      setBusy(false);
    }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || file.size <= 0) {
      setMessage("Pilih file yang ingin diupload terlebih dahulu.");
      return;
    }

    setBusy(true);
    setMessage("Menyiapkan upload ke Google Drive…");
    try {
      const sessionResponse = await fetch("/api/google-drive/upload/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, mimeType: file.type || "application/octet-stream", size: file.size }),
      });
      const session = await sessionResponse.json().catch(() => ({}));
      if (!sessionResponse.ok || !session.uploadUrl) throw new Error(session.error || "Gagal menyiapkan upload Google Drive.");

      setMessage("Mengupload file langsung ke Google Drive…");
      const uploadResponse = await fetch(session.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "Content-Range": `bytes 0-${file.size - 1}/${file.size}`,
        },
        body: file,
      });
      const uploaded = await uploadResponse.json().catch(() => ({}));
      if (!uploadResponse.ok || !uploaded.id) throw new Error(`Upload Google Drive gagal (${uploadResponse.status}).`);

      setMessage("Menyimpan metadata Skripsi…");
      const completeResponse = await fetch("/api/google-drive/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driveFileId: uploaded.id,
          versionLabel: String(data.get("version_label") || ""),
          category: String(data.get("category") || "Skripsi"),
          status: String(data.get("status") || "draft"),
          documentDate: String(data.get("document_date") || today()),
          notes: String(data.get("notes") || ""),
        }),
      });
      const completed = await completeResponse.json().catch(() => ({}));
      if (!completeResponse.ok) throw new Error(completed.error || "File sudah masuk Drive, tetapi metadata gagal disimpan.");

      setMessage(`Berhasil upload “${completed.fileName || file.name}” ke Google Drive.`);
      form.reset();
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Upload Google Drive gagal.");
    } finally {
      setBusy(false);
    }
  }

  if (!configured) {
    return (
      <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/60 p-4">
        <div className="flex items-start gap-3"><Link2 className="mt-0.5 shrink-0 text-orange-600" size={19} /><div><p className="text-sm font-black text-neutral-900">Upload langsung ke Google Drive</p><p className="mt-1 text-xs leading-5 text-neutral-500">Integrasi Drive belum dikonfigurasi di server. Form link Drive manual tetap bisa dipakai.</p></div></div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50 to-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-orange-600 shadow-sm"><FolderOpen size={19} /></div><div><p className="text-sm font-black">Hubungkan Google Drive</p><p className="mt-1 text-xs leading-5 text-neutral-500">Sekali login, file Skripsi bisa diupload dari OURJOURNAL langsung ke folder Drive milik akun ini.</p></div></div>
          <a href="/api/google-drive/connect" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-black text-white shadow-sm"><Link2 size={15} /> Hubungkan Drive</a>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50/70 to-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><CheckCircle2 size={19} /></div><div><p className="text-sm font-black">Google Drive terhubung</p><p className="mt-1 text-xs text-neutral-500">{email || "Akun Google"} · folder OURJOURNAL / Skripsi</p></div></div>
          <div className="flex flex-wrap gap-2">
            {folderUrl && <a href={folderUrl} target="_blank" rel="noreferrer" className="btn-soft text-xs"><ExternalLink size={14} /> Buka Drive</a>}
            <button type="button" onClick={() => { setOpen(true); setMessage(null); }} className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-black text-white shadow-sm"><CloudUpload size={15} /> Upload file</button>
            <button type="button" onClick={disconnect} disabled={busy} className="btn-soft text-xs text-neutral-500"><Unplug size={14} /> Putuskan</button>
          </div>
        </div>
        {message && <p className="mt-3 text-xs font-semibold text-neutral-500">{message}</p>}
      </div>

      {open && <div className="fixed inset-0 z-[140] flex items-end justify-center sm:items-center sm:p-6">
        <button type="button" aria-label="Tutup" onClick={() => !busy && setOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        <section className="relative z-10 max-h-[90dvh] w-full overflow-y-auto rounded-t-[28px] bg-[#faf8f4] p-5 shadow-2xl sm:max-w-lg sm:rounded-[28px]">
          <div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="text-xl font-black">Upload ke Google Drive</h2><p className="mt-1 text-xs leading-5 text-neutral-500">File dikirim langsung ke Drive, sedangkan OURJOURNAL hanya menyimpan metadata dan link.</p></div><button type="button" onClick={() => !busy && setOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white shadow-sm ring-1 ring-black/5"><X size={17} /></button></div>
          <form onSubmit={upload} className="space-y-3">
            <div><label className="label">File</label><input name="file" type="file" required disabled={busy} className="field" /><p className="mt-1 text-[10px] text-neutral-400">Maksimal 250 MB. PDF, DOCX, gambar, ZIP, dan file penelitian lain didukung.</p></div>
            <div className="grid grid-cols-2 gap-2"><div><label className="label">Versi</label><input name="version_label" className="field" placeholder="v12" disabled={busy} /></div><div><label className="label">Kategori</label><select name="category" className="field" disabled={busy}><option>Skripsi</option><option>Proposal</option><option>BAB 1</option><option>BAB 2</option><option>BAB 3</option><option>BAB 4</option><option>BAB 5</option><option>Lampiran</option><option>Administrasi</option></select></div></div>
            <div className="grid grid-cols-2 gap-2"><div><label className="label">Status</label><select name="status" className="field" disabled={busy}><option value="draft">Draft</option><option value="sent">Dikirim</option><option value="revision">Revisi</option><option value="approved">ACC</option></select></div><div><label className="label">Tanggal</label><input name="document_date" type="date" defaultValue={today()} className="field" disabled={busy} /></div></div>
            <div><label className="label">Catatan</label><textarea name="notes" className="field min-h-20" placeholder="Opsional" disabled={busy} /></div>
            <button type="submit" disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-black text-white shadow-sm disabled:opacity-60">{busy ? <LoaderCircle className="animate-spin" size={17} /> : <CloudUpload size={17} />} {busy ? "Mengupload…" : "Upload ke Drive"}</button>
            {message && <p className="text-center text-xs font-semibold leading-5 text-neutral-500">{message}</p>}
          </form>
        </section>
      </div>}
    </>
  );
}
