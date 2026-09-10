-- OURJOURNAL Thesis Workspace v1
-- Private per-user academic thesis workspace. Files remain in Google Drive;
-- Supabase stores only metadata and Drive links.

create table if not exists public.thesis_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  title text not null default '',
  institution text not null default '',
  program text not null default '',
  supervisor text not null default '',
  co_supervisor text not null default '',
  current_stage text not null default 'Persiapan',
  progress smallint not null default 0 check(progress between 0 and 100),
  target_graduation date,
  quote text not null default 'Sedikit progres tetap progres.',
  drive_folder_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.thesis_supervisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scheduled_at timestamptz not null,
  lecturer text not null default '',
  mode text not null default 'offline' check(mode in ('offline','online')),
  location text not null default '',
  topic text not null,
  notes text not null default '',
  revision text not null default '',
  status text not null default 'upcoming' check(status in ('upcoming','done','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.thesis_research_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  target_date date,
  status text not null default 'todo' check(status in ('todo','active','done')),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.thesis_references (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  authors text not null default '',
  publication_year integer check(publication_year is null or publication_year between 1800 and 2200),
  journal text not null default '',
  tags text[] not null default '{}',
  notes text not null default '',
  drive_url text not null default '',
  source_url text not null default '',
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.thesis_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  version_label text not null default '',
  category text not null default 'Skripsi',
  status text not null default 'draft' check(status in ('draft','sent','revision','approved')),
  drive_url text not null,
  file_size_text text not null default '',
  notes text not null default '',
  document_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.thesis_admin_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phase text not null default 'umum' check(phase in ('sempro','semhas','sidang','yudisium','umum')),
  title text not null,
  due_date date,
  notes text not null default '',
  is_done boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.thesis_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  details text not null default '',
  due_at timestamptz,
  priority text not null default 'normal' check(priority in ('low','normal','high')),
  focus_minutes integer not null default 45 check(focus_minutes between 5 and 240),
  is_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.thesis_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null default '',
  kind text not null default 'info' check(kind in ('info','supervision','deadline','feedback','system')),
  notify_at timestamptz,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.thesis_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  target_date date,
  completed_at timestamptz,
  is_done boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists thesis_supervisions_user_schedule_idx on public.thesis_supervisions(user_id,scheduled_at);
create index if not exists thesis_research_user_position_idx on public.thesis_research_steps(user_id,position,created_at);
create index if not exists thesis_references_user_created_idx on public.thesis_references(user_id,created_at desc);
create index if not exists thesis_files_user_date_idx on public.thesis_files(user_id,document_date desc,created_at desc);
create index if not exists thesis_admin_user_phase_idx on public.thesis_admin_items(user_id,phase,position);
create index if not exists thesis_tasks_user_due_idx on public.thesis_tasks(user_id,is_done,due_at);
create index if not exists thesis_notifications_user_created_idx on public.thesis_notifications(user_id,is_read,created_at desc);
create index if not exists thesis_milestones_user_position_idx on public.thesis_milestones(user_id,position,target_date);

-- Keep updated_at consistent with the rest of OURJOURNAL.
do $$
declare t text;
begin
  foreach t in array array[
    'thesis_workspaces','thesis_supervisions','thesis_research_steps','thesis_references',
    'thesis_files','thesis_admin_items','thesis_tasks','thesis_notifications','thesis_milestones'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I',t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function private.set_updated_at()',t);
  end loop;
end $$;

-- Every thesis row is private and requires the Academic module.
do $$
declare t text;
begin
  foreach t in array array[
    'thesis_workspaces','thesis_supervisions','thesis_research_steps','thesis_references',
    'thesis_files','thesis_admin_items','thesis_tasks','thesis_notifications','thesis_milestones'
  ] loop
    execute format('alter table public.%I enable row level security',t);

    execute format('drop policy if exists %I on public.%I',t||'_select_own',t);
    execute format(
      'create policy %I on public.%I for select to authenticated using((select auth.uid())=user_id and exists(select 1 from public.user_modules m where m.user_id=(select auth.uid()) and m.module_key=''academic'' and m.enabled=true))',
      t||'_select_own',t
    );

    execute format('drop policy if exists %I on public.%I',t||'_insert_own',t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check((select auth.uid())=user_id and exists(select 1 from public.user_modules m where m.user_id=(select auth.uid()) and m.module_key=''academic'' and m.enabled=true))',
      t||'_insert_own',t
    );

    execute format('drop policy if exists %I on public.%I',t||'_update_own',t);
    execute format(
      'create policy %I on public.%I for update to authenticated using((select auth.uid())=user_id and exists(select 1 from public.user_modules m where m.user_id=(select auth.uid()) and m.module_key=''academic'' and m.enabled=true)) with check((select auth.uid())=user_id and exists(select 1 from public.user_modules m where m.user_id=(select auth.uid()) and m.module_key=''academic'' and m.enabled=true))',
      t||'_update_own',t
    );

    execute format('drop policy if exists %I on public.%I',t||'_delete_own',t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using((select auth.uid())=user_id and exists(select 1 from public.user_modules m where m.user_id=(select auth.uid()) and m.module_key=''academic'' and m.enabled=true))',
      t||'_delete_own',t
    );
  end loop;
end $$;
