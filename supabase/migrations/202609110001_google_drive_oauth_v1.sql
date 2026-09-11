-- OURJOURNAL Google Drive OAuth v1
-- Stores only encrypted OAuth tokens. Files themselves stay in each user's Google Drive.

create table if not exists public.google_drive_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  google_email text not null default '',
  access_token_encrypted text not null default '',
  refresh_token_encrypted text not null default '',
  expires_at timestamptz,
  root_folder_id text not null default '',
  thesis_folder_id text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_drive_connections enable row level security;
revoke all on public.google_drive_connections from anon, authenticated;

-- Intentionally no user-facing RLS policies: OAuth credentials are server-only.
drop trigger if exists set_updated_at on public.google_drive_connections;
create trigger set_updated_at
before update on public.google_drive_connections
for each row execute function private.set_updated_at();

alter table public.thesis_files
  add column if not exists drive_file_id text not null default '';

create unique index if not exists thesis_files_user_drive_file_uidx
  on public.thesis_files(user_id, drive_file_id)
  where drive_file_id <> '';
