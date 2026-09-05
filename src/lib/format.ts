export function rupiah(value: number | string | null | undefined) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value || 0));
}

export function readableDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : value;
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function readableDateTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function today() { return new Date().toISOString().slice(0, 10); }
export function currentMonth() { return new Date().toISOString().slice(0, 7); }

export function monthRange(month = currentMonth()) {
  const [year, mon] = month.split("-").map(Number);
  const start = `${month}-01`;
  const next = new Date(Date.UTC(year, mon, 1)).toISOString().slice(0, 10);
  return { start, end: next };
}

export function weekdayName(day: number) {
  return ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][day] ?? "-";
}

export function percent(value: number) { return `${Math.round(value)}%`; }
