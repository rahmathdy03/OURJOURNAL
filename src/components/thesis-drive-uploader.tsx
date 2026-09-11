"use client";

import { ExternalLink, FolderOpen } from "lucide-react";

type Props = {
  configured: boolean;
  connected: boolean;
  email?: string;
  folderUrl?: string;
};

const GOOGLE_DRIVE_HOME = "https://drive.google.com/drive/my-drive";

export function ThesisDriveUploader({ folderUrl }: Props) {
  const target = folderUrl?.trim() || GOOGLE_DRIVE_HOME;

  return (
    <div className="rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50 to-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-orange-600 shadow-sm">
            <FolderOpen size={19} />
          </div>
          <div>
            <p className="text-sm font-black text-neutral-900">Google Drive</p>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-neutral-500">
              Upload file langsung di Google Drive tanpa perlu menghubungkan akun ke OURJOURNAL. Setelah upload, salin link file lalu simpan lewat tombol Tambah.
            </p>
          </div>
        </div>
        <a
          href={target}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-black text-white shadow-sm"
        >
          <FolderOpen size={15} /> Buka Google Drive <ExternalLink size={13} />
        </a>
      </div>
    </div>
  );
}
