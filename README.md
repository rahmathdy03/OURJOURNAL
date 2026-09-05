# Personal Hub

Personal Hub adalah web app modular untuk dua user (Rahmat dan Finka). Keduanya mendapatkan fitur umum yang sama tetapi seluruh data pribadi terpisah. Finka mendapatkan modul tambahan **Operasional Finka** untuk pencatatan usaha kebab.

Project ini sengaja dibuat sebagai fondasi aplikasi besar, bukan aplikasi keuangan saja. Modul baru dapat ditambahkan tanpa merombak login, layout, atau struktur data utama.

## Stack

- Next.js App Router
- TypeScript / TSX
- Tailwind CSS
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- Supabase Row Level Security (RLS)
- Vercel-ready
- WhatsApp webhook opsional

Tidak ada halaman `.html` atau source `.js/.jsx` yang perlu dikelola manual. UI dibuat dengan TSX dan Tailwind; `src/app/globals.css` dipakai untuk style global/shared utility.

## Fitur yang sudah ada

### Core

- Login email/password dengan Supabase Auth
- Tidak ada registrasi publik; user dibuat dari Supabase
- Data Rahmat dan Finka dipisahkan dengan `user_id` + RLS
- Sistem akses berbasis modul (`user_modules`), tidak hard-code berdasarkan nama user
- Dashboard netral sebagai control center
- Responsive desktop/mobile navigation
- Profil dan nomor WhatsApp
- Notifikasi/alert dari berbagai modul
- Laporan lintas modul milik user sendiri

### Keuangan — fitur umum

- Pemasukan dan pengeluaran
- Kategori, deskripsi, metode pembayaran, tanggal transaksi
- Budget bulanan total/per kategori
- Transaksi rutin (gaji, tagihan, cicilan, subscription, dll.)
- Posting transaksi rutin secara manual
- Riwayat transaksi
- Ringkasan pemasukan, pengeluaran, saldo, dan budget
- Distribusi pengeluaran pada laporan

### Belanja — fitur umum

- Catat barang yang dibeli
- Jumlah, satuan, kategori, toko, harga, tanggal, catatan
- Upload foto/PDF struk ke private Supabase Storage
- Signed URL sementara untuk membuka struk
- Wishlist belanja + priority/status
- Total belanja bulanan
- Riwayat belanja

### Kuliah — fitur umum

- Data mata kuliah
- Jadwal kuliah mingguan, ruangan, link meeting
- Tugas + deadline + prioritas + progress
- Assignment workspace dengan checklist pengerjaan
- Kalender akademik: ujian, presentasi, praktikum, deadline, agenda lain
- Catatan per mata kuliah/pertemuan
- Link referensi
- Upload materi ke private Supabase Storage
- Signed URL sementara untuk membuka materi
- Study Mode / focus timer
- Riwayat study session
- Pencatatan nilai + bobot
- Target IP semester
- Study Planner berbasis deadline, prioritas, dan progress tanpa dependency AI berbayar

### Operasional Finka — hanya akun yang diberi modul `kebab`

- Data bahan baku
- Stok saat ini + batas minimum
- Notifikasi stok menipis
- Tanggal kedaluwarsa + alert bahan mendekati expired
- Supplier
- Pembelian bahan; stok otomatis bertambah
- Harga/unit terakhir
- Resep produk dan komposisi bahan per produk
- Estimasi HPP bahan
- Produksi harian; cukup input jumlah produk
- Produksi memvalidasi stok dan mengurangi semua bahan resep secara atomik
- Manual stock in/out
- Waste/bahan rusak; stok otomatis berkurang
- Stock opname; sistem mencatat selisih dan menyesuaikan stok
- Riwayat stock movement
- Laporan pembelian bahan, produksi, dan waste

### WhatsApp — opsional

Website tetap menjadi aplikasi utama. Integrasi WhatsApp sudah disiapkan sebagai jalur input/query tambahan melalui webhook resmi.

Command yang sudah disiapkan:

```text
pengeluaran 50rb bensin
pemasukan 250rb freelance
belanja 75rb beras
tugas Laporan Basis Data | 2026-09-20
tugas minggu ini
stok tortilla
produksi Kebab Original 50
bantuan
```

User dikenali dari `profiles.whatsapp_number`. Command modul khusus tetap diperiksa terhadap `user_modules`.

## Struktur project

```text
src/
├── app/                    # route/page Next.js
│   ├── (app)/
│   │   ├── dashboard/
│   │   ├── finance/
│   │   ├── shopping/
│   │   ├── academic/
│   │   ├── kebab/
│   │   ├── notifications/
│   │   ├── reports/
│   │   └── settings/
│   ├── api/whatsapp/       # webhook WA opsional
│   ├── login/
│   └── globals.css
├── components/             # shared UI/layout components
├── features/               # business actions per modul
└── lib/                    # auth, formatting, Supabase clients

supabase/
├── migrations/             # schema + RLS + RPC + Storage policy
└── seed.example.sql        # contoh pengaturan Rahmat/Finka
```

## Setup Supabase nanti

Coding ini belum berisi credential project Supabase milikmu. Saat siap menghubungkan:

1. Buat/copy `.env.example` menjadi `.env.local`.
2. Isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` dari project Supabase.
3. Jalankan `supabase/migrations/202609050001_initial.sql` pada project Supabase baru.
4. Buat dua user melalui Supabase Authentication: Rahmat dan Finka.
5. Ubah email contoh pada `supabase/seed.example.sql`, lalu jalankan file seed tersebut.
6. Seed memberi modul `kebab` hanya kepada Finka. Modul `finance`, `shopping`, dan `academic` otomatis diberikan ke setiap user baru.

> `SUPABASE_SECRET_KEY` adalah server-only. Jangan pernah memakai secret/service-role key di browser atau variabel `NEXT_PUBLIC_*`.

## Environment

```env
NEXT_PUBLIC_APP_NAME=Personal Hub
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# Opsional, server-only untuk WhatsApp/admin job
SUPABASE_SECRET_KEY=
WHATSAPP_VERIFY_TOKEN=
META_APP_SECRET=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
META_GRAPH_API_VERSION=v23.0
```

Tanpa variabel WhatsApp, seluruh fitur website tetap dapat digunakan.

## Menjalankan project

```bash
npm install
npm run dev
```

Lalu buka `http://localhost:3000`.

Pemeriksaan tipe:

```bash
npm run typecheck
```

Build production:

```bash
npm run build
npm run start
```

## Deployment Vercel nanti

Saat repo GitHub sudah dibuat:

1. Import repo ke Vercel.
2. Tambahkan environment variable Supabase pada project Vercel.
3. Deploy.
4. Variabel WhatsApp hanya perlu ditambahkan jika integrasi WhatsApp sudah akan digunakan.

## Catatan keamanan

- Semua tabel data pribadi pada schema `public` menggunakan RLS.
- RLS membatasi row berdasarkan `auth.uid()` / `user_id`.
- Relasi akademik penting diperketat agar tidak bisa menunjuk course user lain.
- Modul kebab membutuhkan ownership **dan** akses `user_modules`.
- Storage `receipts` dan `academic-materials` bersifat private dan path diawali UID user.
- Webhook WhatsApp memvalidasi signature Meta sebelum memproses pesan.
- Admin key hanya digunakan server-side pada webhook.

## Pengembangan berikutnya

Struktur ini sengaja modular. Fitur berikutnya bisa ditambahkan sebagai module baru (misalnya aset, kendaraan, dokumen, kesehatan, project, atau AI Study Assistant) tanpa mengubah fondasi user/login.
