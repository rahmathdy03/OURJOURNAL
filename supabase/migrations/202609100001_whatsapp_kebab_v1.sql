-- WhatsApp Kebab v1
--
-- Konsep operasional:
-- - Produksi hanya mengurangi bahan yang memang dimasukkan ke komposisi Resep di website.
--   Untuk Finka, resep sebaiknya hanya berisi bahan yang jumlahnya benar-benar tetap
--   (misalnya Beef, Kulit Kebab, dan Kertas Kebab).
-- - Bahan yang pemakaiannya berubah-ubah (Mayones, Saus, Minyak Goreng, dll.)
--   dicatat sebagai pemakaian aktual melalui perintah WhatsApp `pakai | Nama | jumlah`.
--
-- Migration ini menambahkan idempotency tracking dan helper service-role-only
-- untuk webhook Meta yang sudah diverifikasi.

create table if not exists public.whatsapp_processed_messages (
  message_id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  from_number text not null,
  command_text text not null default '',
  processed_at timestamptz not null default now()
);

alter table public.whatsapp_processed_messages enable row level security;
revoke all on table public.whatsapp_processed_messages from anon, authenticated;
grant select, insert, delete on table public.whatsapp_processed_messages to service_role;

create index if not exists whatsapp_processed_messages_user_time_idx
  on public.whatsapp_processed_messages(user_id, processed_at desc);

-- Tambah bahan dari webhook WhatsApp yang terverifikasi.
-- Stok awal juga dicatat ke histori movement supaya audit trail tetap lengkap.
create or replace function public.admin_add_kebab_ingredient(
  p_user_id uuid,
  p_name text,
  p_unit text,
  p_initial_stock numeric default 0,
  p_low_stock_threshold numeric default 0
) returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_id uuid := gen_random_uuid();
  v_name text := btrim(coalesce(p_name, ''));
  v_unit text := btrim(coalesce(p_unit, ''));
begin
  if p_user_id is null then
    raise exception 'User tidak valid';
  end if;

  if not exists (
    select 1
    from public.user_modules
    where user_id = p_user_id
      and module_key = 'kebab'
      and enabled = true
  ) then
    raise exception 'Kebab module not enabled';
  end if;

  if v_name = '' or v_unit = '' then
    raise exception 'Nama bahan dan satuan wajib diisi';
  end if;

  if coalesce(p_initial_stock, 0) < 0 or coalesce(p_low_stock_threshold, 0) < 0 then
    raise exception 'Stok dan batas minimum tidak boleh negatif';
  end if;

  if exists (
    select 1
    from public.kebab_ingredients
    where user_id = p_user_id
      and lower(name) = lower(v_name)
  ) then
    raise exception 'Bahan sudah ada';
  end if;

  insert into public.kebab_ingredients(
    id,
    user_id,
    name,
    unit,
    stock_quantity,
    low_stock_threshold,
    last_unit_cost
  ) values (
    v_id,
    p_user_id,
    v_name,
    v_unit,
    coalesce(p_initial_stock, 0),
    coalesce(p_low_stock_threshold, 0),
    0
  );

  if coalesce(p_initial_stock, 0) > 0 then
    insert into public.kebab_stock_movements(
      user_id,
      ingredient_id,
      direction,
      quantity,
      unit_cost,
      movement_type,
      note
    ) values (
      p_user_id,
      v_id,
      'in',
      p_initial_stock,
      0,
      'manual',
      'Stok awal via WhatsApp'
    );
  end if;

  return v_id;
end
$$;

revoke all on function public.admin_add_kebab_ingredient(uuid,text,text,numeric,numeric)
  from public, anon, authenticated;
grant execute on function public.admin_add_kebab_ingredient(uuid,text,text,numeric,numeric)
  to service_role;

-- Pergerakan stok atomik untuk webhook WhatsApp yang terverifikasi.
-- Dipakai oleh `pakai` (out) dan `tambah stok` (in).
create or replace function public.admin_record_kebab_stock_movement(
  p_user_id uuid,
  p_ingredient_id uuid,
  p_direction text,
  p_quantity numeric,
  p_unit_cost numeric default 0,
  p_note text default ''
) returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_id uuid := gen_random_uuid();
  v_current numeric;
  v_direction text := lower(btrim(coalesce(p_direction, '')));
begin
  if p_user_id is null then
    raise exception 'User tidak valid';
  end if;

  if not exists (
    select 1
    from public.user_modules
    where user_id = p_user_id
      and module_key = 'kebab'
      and enabled = true
  ) then
    raise exception 'Kebab module not enabled';
  end if;

  if v_direction not in ('in', 'out') then
    raise exception 'Arah stok tidak valid';
  end if;

  if coalesce(p_quantity, 0) <= 0 then
    raise exception 'Jumlah harus lebih dari 0';
  end if;

  if coalesce(p_unit_cost, 0) < 0 then
    raise exception 'Biaya tidak boleh negatif';
  end if;

  select stock_quantity
    into v_current
  from public.kebab_ingredients
  where id = p_ingredient_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Bahan tidak ditemukan';
  end if;

  if v_direction = 'out' and v_current < p_quantity then
    raise exception 'Stok tidak cukup. Tersedia %, diminta %', v_current, p_quantity;
  end if;

  insert into public.kebab_stock_movements(
    id,
    user_id,
    ingredient_id,
    direction,
    quantity,
    unit_cost,
    movement_type,
    note
  ) values (
    v_id,
    p_user_id,
    p_ingredient_id,
    v_direction,
    p_quantity,
    greatest(coalesce(p_unit_cost, 0), 0),
    'manual',
    coalesce(p_note, '')
  );

  update public.kebab_ingredients
  set
    stock_quantity = case
      when v_direction = 'in' then stock_quantity + p_quantity
      else stock_quantity - p_quantity
    end,
    last_unit_cost = case
      when v_direction = 'in' and coalesce(p_unit_cost, 0) > 0 then p_unit_cost
      else last_unit_cost
    end
  where id = p_ingredient_id
    and user_id = p_user_id;

  return v_id;
end
$$;

revoke all on function public.admin_record_kebab_stock_movement(uuid,uuid,text,numeric,numeric,text)
  from public, anon, authenticated;
grant execute on function public.admin_record_kebab_stock_movement(uuid,uuid,text,numeric,numeric,text)
  to service_role;
