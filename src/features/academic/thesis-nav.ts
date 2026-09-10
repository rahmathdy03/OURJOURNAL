export const thesisTabs = [
  ["overview", "Overview"],
  ["bimbingan", "Bimbingan"],
  ["penelitian", "Penelitian"],
  ["referensi", "Referensi"],
  ["file", "File Skripsi"],
  ["administrasi", "Administrasi"],
  ["target", "Target & Prioritas"],
  ["notifikasi", "Notifikasi"],
  ["timeline", "Timeline Skripsi"],
] as const;

export type ThesisTab = (typeof thesisTabs)[number][0];

export function validThesisTab(value?: string): ThesisTab {
  return thesisTabs.some(([key]) => key === value) ? (value as ThesisTab) : "overview";
}
