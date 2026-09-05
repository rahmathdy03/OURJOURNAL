# Architecture Notes

## Prinsip utama

```text
User
├── Rahmat
│   ├── Finance
│   ├── Shopping
│   └── Academic
└── Finka
    ├── Finance
    ├── Shopping
    ├── Academic
    └── Kebab Operations
```

Data modul umum tetap pribadi; fitur yang sama tidak berarti datanya dibagikan.

## Request flow

```text
Browser / Vercel
      ↓
Next.js App Router
      ↓
Supabase Auth → user identity
      ↓
Module access check
      ↓
Supabase Data API / RPC
      ↓
PostgreSQL + RLS
```

WhatsApp opsional:

```text
WhatsApp Business Platform
      ↓ webhook + signature
Next.js Route Handler
      ↓ phone lookup
profiles.whatsapp_number
      ↓ module check
Supabase admin server client
      ↓
Database yang sama dengan website
```

## Kenapa `user_modules`

Akses fitur tidak ditulis seperti `if user === Finka`. Modul dapat ditambah/dicabut sebagai data. Saat module baru lahir, sidebar dan route guard dapat mengikuti akses user tanpa mendesain ulang auth.

## Kebab stock invariants

Pembelian, produksi, waste, stock movement, dan opname menggunakan PostgreSQL RPC untuk melakukan perubahan stok dalam satu transaksi database. Ini mencegah kondisi ketika log berhasil dibuat tetapi stok gagal berubah (atau sebaliknya).
