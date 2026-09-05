-- Personal Hub consolidated schema
-- Jalankan pada project Supabase baru.

create extension if not exists pgcrypto;
create schema if not exists private;

-- CORE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Pengguna',
  whatsapp_number text unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.user_modules (
  user_id uuid not null references auth.users(id) on delete cascade,
  module_key text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  primary key(user_id,module_key)
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null default '',
  kind text not null default 'info',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- FINANCE
create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check(kind in ('income','expense')), amount numeric(14,2) not null check(amount>0),
  category text not null default 'Lainnya', description text not null default '', payment_method text not null default 'Tunai',
  transaction_date date not null default current_date, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.finance_budgets (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  month date not null, category text not null default 'Total', amount numeric(14,2) not null check(amount>0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,month,category), check(extract(day from month)=1)
);
create table if not exists public.finance_recurring (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check(kind in ('income','expense')), title text not null, category text not null default 'Lainnya',
  amount numeric(14,2) not null check(amount>0), day_of_month smallint not null default 1 check(day_of_month between 1 and 28),
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- SHOPPING
create table if not exists public.shopping_entries (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  item_name text not null, category text not null default 'Lainnya', quantity numeric(12,2) not null default 1 check(quantity>0),
  unit text not null default 'pcs', total_amount numeric(14,2) not null check(total_amount>0), store_name text not null default '',
  notes text not null default '', receipt_path text, purchased_at date not null default current_date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.shopping_wishlist (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  item_name text not null, category text not null default 'Lainnya', estimated_amount numeric(14,2) not null default 0 check(estimated_amount>=0),
  priority text not null default 'normal' check(priority in ('low','normal','high')), notes text not null default '', is_done boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- ACADEMIC
create table if not exists public.academic_courses (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  code text not null default '', name text not null, lecturer text not null default '', semester text not null default '',
  credits smallint not null default 0 check(credits between 0 and 24), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.academic_assignments (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.academic_courses(id) on delete set null, title text not null, description text not null default '', due_date date not null,
  priority text not null default 'normal' check(priority in ('low','normal','high')), progress smallint not null default 0 check(progress between 0 and 100),
  is_done boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.academic_assignment_steps (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  assignment_id uuid not null references public.academic_assignments(id) on delete cascade, title text not null, position integer not null default 0,
  is_done boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.academic_schedules (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.academic_courses(id) on delete set null, weekday smallint not null check(weekday between 0 and 6),
  start_time time not null, end_time time not null, room text not null default '', meeting_url text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(end_time>start_time)
);
create table if not exists public.academic_notes (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.academic_courses(id) on delete set null, title text not null, content text not null default '',
  meeting_no integer not null default 0 check(meeting_no>=0), resource_url text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.academic_materials (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.academic_courses(id) on delete set null, title text not null, storage_path text not null, file_name text not null,
  file_size bigint not null default 0 check(file_size>=0), mime_type text not null default 'application/octet-stream', created_at timestamptz not null default now()
);
create table if not exists public.academic_study_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.academic_courses(id) on delete set null, title text not null, duration_minutes integer not null check(duration_minutes>0),
  notes text not null default '', completed_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create table if not exists public.academic_grades (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.academic_courses(id) on delete cascade, label text not null, score numeric(8,2) not null check(score>=0),
  max_score numeric(8,2) not null default 100 check(max_score>0), weight numeric(6,2) not null default 0 check(weight between 0 and 100),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.academic_targets (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  semester text not null, target_gpa numeric(3,2) not null check(target_gpa between 0 and 4), notes text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,semester)
);
create table if not exists public.academic_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.academic_courses(id) on delete set null, title text not null,
  event_type text not null default 'other' check(event_type in ('exam','presentation','practicum','deadline','other')),
  starts_at timestamptz not null, ends_at timestamptz, location text not null default '', notes text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(ends_at is null or ends_at>=starts_at)
);

-- KEBAB / FINKA OPERATIONS
create table if not exists public.kebab_suppliers (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, phone text not null default '', notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.kebab_ingredients (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, unit text not null, stock_quantity numeric(14,3) not null default 0 check(stock_quantity>=0),
  low_stock_threshold numeric(14,3) not null default 0 check(low_stock_threshold>=0), last_unit_cost numeric(14,2) not null default 0 check(last_unit_cost>=0),
  expires_at date, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,name)
);
create table if not exists public.kebab_recipes (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, selling_price numeric(14,2) not null default 0 check(selling_price>=0), active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,name)
);
create table if not exists public.kebab_recipe_items (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.kebab_recipes(id) on delete cascade, ingredient_id uuid not null references public.kebab_ingredients(id) on delete cascade,
  quantity_per_unit numeric(14,3) not null check(quantity_per_unit>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(recipe_id,ingredient_id)
);
create table if not exists public.kebab_purchases (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  ingredient_id uuid not null references public.kebab_ingredients(id) on delete restrict, supplier_id uuid references public.kebab_suppliers(id) on delete set null,
  quantity numeric(14,3) not null check(quantity>0), total_cost numeric(14,2) not null check(total_cost>0), purchased_at date not null default current_date,
  expires_at date, note text not null default '', created_at timestamptz not null default now()
);
create table if not exists public.kebab_stock_movements (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  ingredient_id uuid not null references public.kebab_ingredients(id) on delete cascade, direction text not null check(direction in ('in','out')),
  quantity numeric(14,3) not null check(quantity>0), unit_cost numeric(14,2) not null default 0 check(unit_cost>=0),
  movement_type text not null default 'manual' check(movement_type in ('manual','purchase','production','waste','opname')),
  reference_id uuid, note text not null default '', created_at timestamptz not null default now()
);
create table if not exists public.kebab_productions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.kebab_recipes(id) on delete restrict, quantity integer not null check(quantity>0),
  production_date date not null default current_date, notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.kebab_waste (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  ingredient_id uuid not null references public.kebab_ingredients(id) on delete restrict, quantity numeric(14,3) not null check(quantity>0),
  reason text not null, waste_date date not null default current_date, created_at timestamptz not null default now()
);
create table if not exists public.kebab_stock_opnames (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  ingredient_id uuid not null references public.kebab_ingredients(id) on delete restrict, system_quantity numeric(14,3) not null,
  actual_quantity numeric(14,3) not null check(actual_quantity>=0), difference numeric(14,3) not null, note text not null default '', created_at timestamptz not null default now()
);

-- INDEXES
create index if not exists notifications_user_created_idx on public.notifications(user_id,created_at desc);
create index if not exists finance_transactions_user_date_idx on public.finance_transactions(user_id,transaction_date desc);
create index if not exists shopping_entries_user_date_idx on public.shopping_entries(user_id,purchased_at desc);
create index if not exists academic_assignments_user_due_idx on public.academic_assignments(user_id,due_date,is_done);
create index if not exists academic_events_user_start_idx on public.academic_events(user_id,starts_at);
create index if not exists kebab_movements_user_created_idx on public.kebab_stock_movements(user_id,created_at desc);
create index if not exists kebab_productions_user_date_idx on public.kebab_productions(user_id,production_date desc);

-- UPDATED_AT
create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path=public,private as $$
begin new.updated_at=now(); return new; end; $$;
revoke all on function private.set_updated_at() from public;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','finance_transactions','finance_budgets','finance_recurring','shopping_entries','shopping_wishlist',
    'academic_courses','academic_assignments','academic_assignment_steps','academic_schedules','academic_notes','academic_grades','academic_targets','academic_events',
    'kebab_suppliers','kebab_ingredients','kebab_recipes','kebab_recipe_items','kebab_productions'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I',t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function private.set_updated_at()',t);
  end loop;
end $$;

-- AUTH USER BOOTSTRAP
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path=public,private as $$
begin
  insert into public.profiles(id,display_name)
  values(new.id,coalesce(nullif(new.raw_user_meta_data->>'display_name',''),split_part(coalesce(new.email,'Pengguna'),'@',1)))
  on conflict(id) do nothing;
  insert into public.user_modules(user_id,module_key,enabled)
  values(new.id,'finance',true),(new.id,'shopping',true),(new.id,'academic',true)
  on conflict(user_id,module_key) do update set enabled=excluded.enabled;
  return new;
end; $$;
revoke all on function private.handle_new_user() from public;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

insert into public.profiles(id,display_name)
select id,split_part(coalesce(email,'Pengguna'),'@',1) from auth.users on conflict(id) do nothing;
insert into public.user_modules(user_id,module_key,enabled)
select id,m.module_key,true from auth.users cross join (values('finance'),('shopping'),('academic')) as m(module_key)
on conflict(user_id,module_key) do nothing;

-- ENABLE RLS
DO $$
declare t text;
begin
  foreach t in array array[
    'profiles','user_modules','notifications','finance_transactions','finance_budgets','finance_recurring','shopping_entries','shopping_wishlist',
    'academic_courses','academic_assignments','academic_assignment_steps','academic_schedules','academic_notes','academic_materials','academic_study_sessions','academic_grades','academic_targets','academic_events',
    'kebab_suppliers','kebab_ingredients','kebab_recipes','kebab_recipe_items','kebab_purchases','kebab_stock_movements','kebab_productions','kebab_waste','kebab_stock_opnames'
  ] loop execute format('alter table public.%I enable row level security',t); end loop;
end $$;

-- CORE POLICIES
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using((select auth.uid())=id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using((select auth.uid())=id) with check((select auth.uid())=id);
drop policy if exists modules_select_own on public.user_modules;
create policy modules_select_own on public.user_modules for select to authenticated using((select auth.uid())=user_id);
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications for select to authenticated using((select auth.uid())=user_id);
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own on public.notifications for delete to authenticated using((select auth.uid())=user_id);

-- PERSONAL TABLE POLICIES
DO $$
declare t text;
begin
  foreach t in array array[
    'finance_transactions','finance_budgets','finance_recurring','shopping_entries','shopping_wishlist',
    'academic_courses','academic_assignments','academic_assignment_steps','academic_schedules','academic_notes','academic_materials','academic_study_sessions','academic_grades','academic_targets','academic_events'
  ] loop
    execute format('drop policy if exists %I on public.%I',t||'_select_own',t);
    execute format('create policy %I on public.%I for select to authenticated using((select auth.uid())=user_id)',t||'_select_own',t);
    execute format('drop policy if exists %I on public.%I',t||'_insert_own',t);
    execute format('create policy %I on public.%I for insert to authenticated with check((select auth.uid())=user_id)',t||'_insert_own',t);
    execute format('drop policy if exists %I on public.%I',t||'_update_own',t);
    execute format('create policy %I on public.%I for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id)',t||'_update_own',t);
    execute format('drop policy if exists %I on public.%I',t||'_delete_own',t);
    execute format('create policy %I on public.%I for delete to authenticated using((select auth.uid())=user_id)',t||'_delete_own',t);
  end loop;
end $$;

-- Child ownership hardening for assignment steps.
drop policy if exists academic_assignment_steps_insert_own on public.academic_assignment_steps;
create policy academic_assignment_steps_insert_own on public.academic_assignment_steps for insert to authenticated with check(
  (select auth.uid())=user_id and exists(select 1 from public.academic_assignments a where a.id=assignment_id and a.user_id=(select auth.uid()))
);
drop policy if exists academic_assignment_steps_update_own on public.academic_assignment_steps;
create policy academic_assignment_steps_update_own on public.academic_assignment_steps for update to authenticated
using((select auth.uid())=user_id)
with check((select auth.uid())=user_id and exists(select 1 from public.academic_assignments a where a.id=assignment_id and a.user_id=(select auth.uid())));

-- Academic child ownership hardening: a user's row may only point to that same user's course.
drop policy if exists academic_assignments_insert_own on public.academic_assignments;
create policy academic_assignments_insert_own on public.academic_assignments for insert to authenticated with check(
  (select auth.uid())=user_id and (course_id is null or exists(select 1 from public.academic_courses c where c.id=course_id and c.user_id=(select auth.uid())))
);
drop policy if exists academic_assignments_update_own on public.academic_assignments;
create policy academic_assignments_update_own on public.academic_assignments for update to authenticated
using((select auth.uid())=user_id)
with check((select auth.uid())=user_id and (course_id is null or exists(select 1 from public.academic_courses c where c.id=course_id and c.user_id=(select auth.uid()))));

drop policy if exists academic_schedules_insert_own on public.academic_schedules;
create policy academic_schedules_insert_own on public.academic_schedules for insert to authenticated with check(
  (select auth.uid())=user_id and (course_id is null or exists(select 1 from public.academic_courses c where c.id=course_id and c.user_id=(select auth.uid())))
);
drop policy if exists academic_schedules_update_own on public.academic_schedules;
create policy academic_schedules_update_own on public.academic_schedules for update to authenticated
using((select auth.uid())=user_id)
with check((select auth.uid())=user_id and (course_id is null or exists(select 1 from public.academic_courses c where c.id=course_id and c.user_id=(select auth.uid()))));

drop policy if exists academic_notes_insert_own on public.academic_notes;
create policy academic_notes_insert_own on public.academic_notes for insert to authenticated with check(
  (select auth.uid())=user_id and (course_id is null or exists(select 1 from public.academic_courses c where c.id=course_id and c.user_id=(select auth.uid())))
);
drop policy if exists academic_notes_update_own on public.academic_notes;
create policy academic_notes_update_own on public.academic_notes for update to authenticated
using((select auth.uid())=user_id)
with check((select auth.uid())=user_id and (course_id is null or exists(select 1 from public.academic_courses c where c.id=course_id and c.user_id=(select auth.uid()))));

drop policy if exists academic_materials_insert_own on public.academic_materials;
create policy academic_materials_insert_own on public.academic_materials for insert to authenticated with check(
  (select auth.uid())=user_id and (course_id is null or exists(select 1 from public.academic_courses c where c.id=course_id and c.user_id=(select auth.uid())))
);
drop policy if exists academic_materials_update_own on public.academic_materials;
create policy academic_materials_update_own on public.academic_materials for update to authenticated
using((select auth.uid())=user_id)
with check((select auth.uid())=user_id and (course_id is null or exists(select 1 from public.academic_courses c where c.id=course_id and c.user_id=(select auth.uid()))));

drop policy if exists academic_study_sessions_insert_own on public.academic_study_sessions;
create policy academic_study_sessions_insert_own on public.academic_study_sessions for insert to authenticated with check(
  (select auth.uid())=user_id and (course_id is null or exists(select 1 from public.academic_courses c where c.id=course_id and c.user_id=(select auth.uid())))
);
drop policy if exists academic_study_sessions_update_own on public.academic_study_sessions;
create policy academic_study_sessions_update_own on public.academic_study_sessions for update to authenticated
using((select auth.uid())=user_id)
with check((select auth.uid())=user_id and (course_id is null or exists(select 1 from public.academic_courses c where c.id=course_id and c.user_id=(select auth.uid()))));

drop policy if exists academic_grades_insert_own on public.academic_grades;
create policy academic_grades_insert_own on public.academic_grades for insert to authenticated with check(
  (select auth.uid())=user_id and exists(select 1 from public.academic_courses c where c.id=course_id and c.user_id=(select auth.uid()))
);
drop policy if exists academic_grades_update_own on public.academic_grades;
create policy academic_grades_update_own on public.academic_grades for update to authenticated
using((select auth.uid())=user_id)
with check((select auth.uid())=user_id and exists(select 1 from public.academic_courses c where c.id=course_id and c.user_id=(select auth.uid())));

drop policy if exists academic_events_insert_own on public.academic_events;
create policy academic_events_insert_own on public.academic_events for insert to authenticated with check(
  (select auth.uid())=user_id and (course_id is null or exists(select 1 from public.academic_courses c where c.id=course_id and c.user_id=(select auth.uid())))
);
drop policy if exists academic_events_update_own on public.academic_events;
create policy academic_events_update_own on public.academic_events for update to authenticated
using((select auth.uid())=user_id)
with check((select auth.uid())=user_id and (course_id is null or exists(select 1 from public.academic_courses c where c.id=course_id and c.user_id=(select auth.uid()))));

-- KEBAB POLICIES: ownership + module access.
DO $$
declare t text;
begin
  foreach t in array array['kebab_suppliers','kebab_ingredients','kebab_recipes','kebab_recipe_items','kebab_purchases','kebab_stock_movements','kebab_productions','kebab_waste','kebab_stock_opnames'] loop
    execute format('drop policy if exists %I on public.%I',t||'_select_own',t);
    execute format('create policy %I on public.%I for select to authenticated using((select auth.uid())=user_id and exists(select 1 from public.user_modules m where m.user_id=(select auth.uid()) and m.module_key=''kebab'' and m.enabled=true))',t||'_select_own',t);
    execute format('drop policy if exists %I on public.%I',t||'_insert_own',t);
    execute format('create policy %I on public.%I for insert to authenticated with check((select auth.uid())=user_id and exists(select 1 from public.user_modules m where m.user_id=(select auth.uid()) and m.module_key=''kebab'' and m.enabled=true))',t||'_insert_own',t);
    execute format('drop policy if exists %I on public.%I',t||'_update_own',t);
    execute format('create policy %I on public.%I for update to authenticated using((select auth.uid())=user_id and exists(select 1 from public.user_modules m where m.user_id=(select auth.uid()) and m.module_key=''kebab'' and m.enabled=true)) with check((select auth.uid())=user_id and exists(select 1 from public.user_modules m where m.user_id=(select auth.uid()) and m.module_key=''kebab'' and m.enabled=true))',t||'_update_own',t);
    execute format('drop policy if exists %I on public.%I',t||'_delete_own',t);
    execute format('create policy %I on public.%I for delete to authenticated using((select auth.uid())=user_id and exists(select 1 from public.user_modules m where m.user_id=(select auth.uid()) and m.module_key=''kebab'' and m.enabled=true))',t||'_delete_own',t);
  end loop;
end $$;

-- Recipe composition may only connect the current user's recipe and ingredient.
drop policy if exists kebab_recipe_items_insert_own on public.kebab_recipe_items;
create policy kebab_recipe_items_insert_own on public.kebab_recipe_items for insert to authenticated with check(
  (select auth.uid())=user_id
  and exists(select 1 from public.user_modules m where m.user_id=(select auth.uid()) and m.module_key='kebab' and m.enabled=true)
  and exists(select 1 from public.kebab_recipes r where r.id=recipe_id and r.user_id=(select auth.uid()))
  and exists(select 1 from public.kebab_ingredients i where i.id=ingredient_id and i.user_id=(select auth.uid()))
);
drop policy if exists kebab_recipe_items_update_own on public.kebab_recipe_items;
create policy kebab_recipe_items_update_own on public.kebab_recipe_items for update to authenticated
using((select auth.uid())=user_id and exists(select 1 from public.user_modules m where m.user_id=(select auth.uid()) and m.module_key='kebab' and m.enabled=true))
with check(
  (select auth.uid())=user_id
  and exists(select 1 from public.user_modules m where m.user_id=(select auth.uid()) and m.module_key='kebab' and m.enabled=true)
  and exists(select 1 from public.kebab_recipes r where r.id=recipe_id and r.user_id=(select auth.uid()))
  and exists(select 1 from public.kebab_ingredients i where i.id=ingredient_id and i.user_id=(select auth.uid()))
);

-- Kebab child references are also ownership-checked, not only their user_id column.
drop policy if exists kebab_purchases_insert_own on public.kebab_purchases;
create policy kebab_purchases_insert_own on public.kebab_purchases for insert to authenticated with check(
  (select auth.uid())=user_id
  and exists(select 1 from public.user_modules m where m.user_id=(select auth.uid()) and m.module_key='kebab' and m.enabled=true)
  and exists(select 1 from public.kebab_ingredients i where i.id=ingredient_id and i.user_id=(select auth.uid()))
  and (supplier_id is null or exists(select 1 from public.kebab_suppliers s where s.id=supplier_id and s.user_id=(select auth.uid())))
);

drop policy if exists kebab_stock_movements_insert_own on public.kebab_stock_movements;
create policy kebab_stock_movements_insert_own on public.kebab_stock_movements for insert to authenticated with check(
  (select auth.uid())=user_id
  and exists(select 1 from public.user_modules m where m.user_id=(select auth.uid()) and m.module_key='kebab' and m.enabled=true)
  and exists(select 1 from public.kebab_ingredients i where i.id=ingredient_id and i.user_id=(select auth.uid()))
);

drop policy if exists kebab_productions_insert_own on public.kebab_productions;
create policy kebab_productions_insert_own on public.kebab_productions for insert to authenticated with check(
  (select auth.uid())=user_id
  and exists(select 1 from public.user_modules m where m.user_id=(select auth.uid()) and m.module_key='kebab' and m.enabled=true)
  and exists(select 1 from public.kebab_recipes r where r.id=recipe_id and r.user_id=(select auth.uid()))
);

drop policy if exists kebab_waste_insert_own on public.kebab_waste;
create policy kebab_waste_insert_own on public.kebab_waste for insert to authenticated with check(
  (select auth.uid())=user_id
  and exists(select 1 from public.user_modules m where m.user_id=(select auth.uid()) and m.module_key='kebab' and m.enabled=true)
  and exists(select 1 from public.kebab_ingredients i where i.id=ingredient_id and i.user_id=(select auth.uid()))
);

drop policy if exists kebab_stock_opnames_insert_own on public.kebab_stock_opnames;
create policy kebab_stock_opnames_insert_own on public.kebab_stock_opnames for insert to authenticated with check(
  (select auth.uid())=user_id
  and exists(select 1 from public.user_modules m where m.user_id=(select auth.uid()) and m.module_key='kebab' and m.enabled=true)
  and exists(select 1 from public.kebab_ingredients i where i.id=ingredient_id and i.user_id=(select auth.uid()))
);

-- ATOMIC KEBAB FUNCTIONS
create or replace function public.record_kebab_stock_movement(
  p_ingredient_id uuid,p_direction text,p_quantity numeric,p_unit_cost numeric default 0,p_note text default ''
) returns uuid language plpgsql security invoker set search_path=public as $$
declare v_user_id uuid:=auth.uid(); v_current numeric; v_id uuid:=gen_random_uuid();
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;
  if p_direction not in ('in','out') or p_quantity<=0 then raise exception 'Invalid stock movement'; end if;
  if not exists(select 1 from public.user_modules where user_id=v_user_id and module_key='kebab' and enabled=true) then raise exception 'Kebab module not enabled'; end if;
  select stock_quantity into v_current from public.kebab_ingredients where id=p_ingredient_id and user_id=v_user_id for update;
  if not found then raise exception 'Ingredient not found'; end if;
  if p_direction='out' and v_current<p_quantity then raise exception 'Stok tidak cukup'; end if;
  insert into public.kebab_stock_movements(id,user_id,ingredient_id,direction,quantity,unit_cost,movement_type,note)
  values(v_id,v_user_id,p_ingredient_id,p_direction,p_quantity,greatest(coalesce(p_unit_cost,0),0),'manual',coalesce(p_note,''));
  update public.kebab_ingredients set
    stock_quantity=case when p_direction='in' then stock_quantity+p_quantity else stock_quantity-p_quantity end,
    last_unit_cost=case when p_direction='in' and coalesce(p_unit_cost,0)>0 then p_unit_cost else last_unit_cost end
  where id=p_ingredient_id and user_id=v_user_id;
  return v_id;
end $$;
revoke all on function public.record_kebab_stock_movement(uuid,text,numeric,numeric,text) from public;
grant execute on function public.record_kebab_stock_movement(uuid,text,numeric,numeric,text) to authenticated;

create or replace function public.record_kebab_purchase(
  p_ingredient_id uuid,p_supplier_id uuid,p_quantity numeric,p_total_cost numeric,p_purchased_at date,p_expires_at date default null,p_note text default ''
) returns uuid language plpgsql security invoker set search_path=public as $$
declare v_user_id uuid:=auth.uid(); v_id uuid:=gen_random_uuid(); v_unit_cost numeric;
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;
  if p_quantity<=0 or p_total_cost<=0 then raise exception 'Invalid purchase'; end if;
  if not exists(select 1 from public.user_modules where user_id=v_user_id and module_key='kebab' and enabled=true) then raise exception 'Kebab module not enabled'; end if;
  if not exists(select 1 from public.kebab_ingredients where id=p_ingredient_id and user_id=v_user_id) then raise exception 'Ingredient not found'; end if;
  if p_supplier_id is not null and not exists(select 1 from public.kebab_suppliers where id=p_supplier_id and user_id=v_user_id) then raise exception 'Supplier not found'; end if;
  v_unit_cost:=p_total_cost/p_quantity;
  insert into public.kebab_purchases(id,user_id,ingredient_id,supplier_id,quantity,total_cost,purchased_at,expires_at,note)
  values(v_id,v_user_id,p_ingredient_id,p_supplier_id,p_quantity,p_total_cost,coalesce(p_purchased_at,current_date),p_expires_at,coalesce(p_note,''));
  insert into public.kebab_stock_movements(user_id,ingredient_id,direction,quantity,unit_cost,movement_type,reference_id,note)
  values(v_user_id,p_ingredient_id,'in',p_quantity,v_unit_cost,'purchase',v_id,coalesce(p_note,''));
  update public.kebab_ingredients set stock_quantity=stock_quantity+p_quantity,last_unit_cost=v_unit_cost,expires_at=coalesce(p_expires_at,expires_at)
  where id=p_ingredient_id and user_id=v_user_id;
  return v_id;
end $$;
revoke all on function public.record_kebab_purchase(uuid,uuid,numeric,numeric,date,date,text) from public;
grant execute on function public.record_kebab_purchase(uuid,uuid,numeric,numeric,date,date,text) to authenticated;

create or replace function public.record_kebab_production(
  p_recipe_id uuid,p_quantity integer,p_production_date date default current_date,p_notes text default ''
) returns uuid language plpgsql security invoker set search_path=public as $$
declare v_user_id uuid:=auth.uid(); v_id uuid:=gen_random_uuid(); v_count integer; r record; v_required numeric;
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;
  if p_quantity<=0 then raise exception 'Quantity must be positive'; end if;
  if not exists(select 1 from public.user_modules where user_id=v_user_id and module_key='kebab' and enabled=true) then raise exception 'Kebab module not enabled'; end if;
  if not exists(select 1 from public.kebab_recipes where id=p_recipe_id and user_id=v_user_id and active=true) then raise exception 'Recipe not found'; end if;
  select count(*) into v_count from public.kebab_recipe_items where recipe_id=p_recipe_id and user_id=v_user_id;
  if v_count=0 then raise exception 'Resep belum memiliki komposisi'; end if;
  for r in
    select ri.ingredient_id,ri.quantity_per_unit,i.name,i.stock_quantity
    from public.kebab_recipe_items ri join public.kebab_ingredients i on i.id=ri.ingredient_id and i.user_id=v_user_id
    where ri.recipe_id=p_recipe_id and ri.user_id=v_user_id order by i.id for update of i
  loop
    v_required:=r.quantity_per_unit*p_quantity;
    if r.stock_quantity<v_required then raise exception 'Stok % tidak cukup. Butuh %, tersedia %',r.name,v_required,r.stock_quantity; end if;
  end loop;
  insert into public.kebab_productions(id,user_id,recipe_id,quantity,production_date,notes)
  values(v_id,v_user_id,p_recipe_id,p_quantity,coalesce(p_production_date,current_date),coalesce(p_notes,''));
  for r in select ingredient_id,quantity_per_unit from public.kebab_recipe_items where recipe_id=p_recipe_id and user_id=v_user_id loop
    v_required:=r.quantity_per_unit*p_quantity;
    insert into public.kebab_stock_movements(user_id,ingredient_id,direction,quantity,movement_type,reference_id,note)
    values(v_user_id,r.ingredient_id,'out',v_required,'production',v_id,'Pemakaian otomatis dari produksi');
    update public.kebab_ingredients set stock_quantity=stock_quantity-v_required where id=r.ingredient_id and user_id=v_user_id;
  end loop;
  return v_id;
end $$;
revoke all on function public.record_kebab_production(uuid,integer,date,text) from public;
grant execute on function public.record_kebab_production(uuid,integer,date,text) to authenticated;

create or replace function public.record_kebab_waste(
  p_ingredient_id uuid,p_quantity numeric,p_reason text,p_waste_date date default current_date
) returns uuid language plpgsql security invoker set search_path=public as $$
declare v_user_id uuid:=auth.uid(); v_current numeric; v_id uuid:=gen_random_uuid();
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;
  if p_quantity<=0 then raise exception 'Invalid waste quantity'; end if;
  if not exists(select 1 from public.user_modules where user_id=v_user_id and module_key='kebab' and enabled=true) then raise exception 'Kebab module not enabled'; end if;
  select stock_quantity into v_current from public.kebab_ingredients where id=p_ingredient_id and user_id=v_user_id for update;
  if not found then raise exception 'Ingredient not found'; end if;
  if v_current<p_quantity then raise exception 'Stok tidak cukup'; end if;
  insert into public.kebab_waste(id,user_id,ingredient_id,quantity,reason,waste_date)
  values(v_id,v_user_id,p_ingredient_id,p_quantity,coalesce(nullif(p_reason,''),'Waste'),coalesce(p_waste_date,current_date));
  insert into public.kebab_stock_movements(user_id,ingredient_id,direction,quantity,movement_type,reference_id,note)
  values(v_user_id,p_ingredient_id,'out',p_quantity,'waste',v_id,coalesce(p_reason,''));
  update public.kebab_ingredients set stock_quantity=stock_quantity-p_quantity where id=p_ingredient_id and user_id=v_user_id;
  return v_id;
end $$;
revoke all on function public.record_kebab_waste(uuid,numeric,text,date) from public;
grant execute on function public.record_kebab_waste(uuid,numeric,text,date) to authenticated;

create or replace function public.perform_kebab_stock_opname(
  p_ingredient_id uuid,p_actual_quantity numeric,p_note text default ''
) returns uuid language plpgsql security invoker set search_path=public as $$
declare v_user_id uuid:=auth.uid(); v_current numeric; v_diff numeric; v_id uuid:=gen_random_uuid();
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;
  if p_actual_quantity<0 then raise exception 'Actual quantity cannot be negative'; end if;
  if not exists(select 1 from public.user_modules where user_id=v_user_id and module_key='kebab' and enabled=true) then raise exception 'Kebab module not enabled'; end if;
  select stock_quantity into v_current from public.kebab_ingredients where id=p_ingredient_id and user_id=v_user_id for update;
  if not found then raise exception 'Ingredient not found'; end if;
  v_diff:=p_actual_quantity-v_current;
  insert into public.kebab_stock_opnames(id,user_id,ingredient_id,system_quantity,actual_quantity,difference,note)
  values(v_id,v_user_id,p_ingredient_id,v_current,p_actual_quantity,v_diff,coalesce(p_note,''));
  if v_diff<>0 then
    insert into public.kebab_stock_movements(user_id,ingredient_id,direction,quantity,movement_type,reference_id,note)
    values(v_user_id,p_ingredient_id,case when v_diff>0 then 'in' else 'out' end,abs(v_diff),'opname',v_id,coalesce(p_note,''));
  end if;
  update public.kebab_ingredients set stock_quantity=p_actual_quantity where id=p_ingredient_id and user_id=v_user_id;
  return v_id;
end $$;
revoke all on function public.perform_kebab_stock_opname(uuid,numeric,text) from public;
grant execute on function public.perform_kebab_stock_opname(uuid,numeric,text) to authenticated;

-- Service-role-only function for verified WhatsApp webhook.
create or replace function public.admin_record_kebab_production(
  p_user_id uuid,p_recipe_id uuid,p_quantity integer,p_production_date date default current_date,p_notes text default ''
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid:=gen_random_uuid(); v_count integer; r record; v_required numeric;
begin
  if p_quantity<=0 then raise exception 'Quantity must be positive'; end if;
  if not exists(select 1 from public.user_modules where user_id=p_user_id and module_key='kebab' and enabled=true) then raise exception 'Kebab module not enabled'; end if;
  if not exists(select 1 from public.kebab_recipes where id=p_recipe_id and user_id=p_user_id and active=true) then raise exception 'Recipe not found'; end if;
  select count(*) into v_count from public.kebab_recipe_items where recipe_id=p_recipe_id and user_id=p_user_id;
  if v_count=0 then raise exception 'Resep belum memiliki komposisi'; end if;
  for r in
    select ri.ingredient_id,ri.quantity_per_unit,i.name,i.stock_quantity
    from public.kebab_recipe_items ri join public.kebab_ingredients i on i.id=ri.ingredient_id and i.user_id=p_user_id
    where ri.recipe_id=p_recipe_id and ri.user_id=p_user_id order by i.id for update of i
  loop
    v_required:=r.quantity_per_unit*p_quantity;
    if r.stock_quantity<v_required then raise exception 'Stok % tidak cukup',r.name; end if;
  end loop;
  insert into public.kebab_productions(id,user_id,recipe_id,quantity,production_date,notes)
  values(v_id,p_user_id,p_recipe_id,p_quantity,coalesce(p_production_date,current_date),coalesce(p_notes,''));
  for r in select ingredient_id,quantity_per_unit from public.kebab_recipe_items where recipe_id=p_recipe_id and user_id=p_user_id loop
    v_required:=r.quantity_per_unit*p_quantity;
    insert into public.kebab_stock_movements(user_id,ingredient_id,direction,quantity,movement_type,reference_id,note)
    values(p_user_id,r.ingredient_id,'out',v_required,'production',v_id,'Pemakaian otomatis via WhatsApp');
    update public.kebab_ingredients set stock_quantity=stock_quantity-v_required where id=r.ingredient_id and user_id=p_user_id;
  end loop;
  return v_id;
end $$;
revoke all on function public.admin_record_kebab_production(uuid,uuid,integer,date,text) from public,anon,authenticated;
grant execute on function public.admin_record_kebab_production(uuid,uuid,integer,date,text) to service_role;

-- STORAGE
insert into storage.buckets(id,name,public,file_size_limit) values
('academic-materials','academic-materials',false,10485760),('receipts','receipts',false,8388608)
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit;

drop policy if exists academic_materials_storage_select on storage.objects;
create policy academic_materials_storage_select on storage.objects for select to authenticated using(bucket_id='academic-materials' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists academic_materials_storage_insert on storage.objects;
create policy academic_materials_storage_insert on storage.objects for insert to authenticated with check(bucket_id='academic-materials' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists academic_materials_storage_delete on storage.objects;
create policy academic_materials_storage_delete on storage.objects for delete to authenticated using(bucket_id='academic-materials' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists receipts_storage_select on storage.objects;
create policy receipts_storage_select on storage.objects for select to authenticated using(bucket_id='receipts' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists receipts_storage_insert on storage.objects;
create policy receipts_storage_insert on storage.objects for insert to authenticated with check(bucket_id='receipts' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists receipts_storage_delete on storage.objects;
create policy receipts_storage_delete on storage.objects for delete to authenticated using(bucket_id='receipts' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- EXPLICIT DATA API GRANTS
grant select,update on public.profiles to authenticated;
grant select on public.user_modules to authenticated;
grant select,update,delete on public.notifications to authenticated;
grant select,insert,update,delete on
  public.finance_transactions,public.finance_budgets,public.finance_recurring,public.shopping_entries,public.shopping_wishlist,
  public.academic_courses,public.academic_assignments,public.academic_assignment_steps,public.academic_schedules,public.academic_notes,
  public.academic_materials,public.academic_study_sessions,public.academic_grades,public.academic_targets,public.academic_events,
  public.kebab_suppliers,public.kebab_ingredients,public.kebab_recipes,public.kebab_recipe_items,public.kebab_purchases,
  public.kebab_stock_movements,public.kebab_productions,public.kebab_waste,public.kebab_stock_opnames
  to authenticated;

