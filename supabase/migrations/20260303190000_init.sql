create extension if not exists "pgcrypto";

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('owner','member')),
  token uuid not null unique,
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 day'
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  full_name text not null,
  birth_year int not null,
  positions text[] not null default '{}',
  foot text not null check (foot in ('L','R','B')),
  team text not null,
  league text not null,
  height_cm int,
  weight_kg int,
  status text not null check (status in ('tracking','shortlist','rejected')),
  tags text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  match_date date not null,
  competition text not null,
  home_team text not null,
  away_team text not null,
  video_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  match_id uuid references public.matches(id) on delete set null,
  report_type text not null check (report_type in ('live','post','final')),
  executive_summary text not null,
  strengths text[] not null default '{}',
  weaknesses text[] not null default '{}',
  tactical_fit text not null check (tactical_fit in ('high','medium','low')),
  overall_score numeric(3,1) not null check (overall_score >= 0 and overall_score <= 10),
  recommendation text not null check (recommendation in ('sign','monitor','reject')),
  evidence jsonb not null default '[]'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  match_id uuid references public.matches(id) on delete set null,
  report_id uuid references public.reports(id) on delete set null,
  kind text not null check (kind in ('report_summary','infographic_layout','comparison')),
  input jsonb not null,
  output jsonb not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_players_updated before update on public.players for each row execute function public.set_updated_at();
create trigger trg_matches_updated before update on public.matches for each row execute function public.set_updated_at();
create trigger trg_reports_updated before update on public.reports for each row execute function public.set_updated_at();

create or replace function public.add_owner_membership() returns trigger language plpgsql security definer as $$
begin
  insert into public.workspace_members(workspace_id, user_id, role) values (new.id, new.created_by, 'owner') on conflict do nothing;
  return new;
end;
$$;

create trigger trg_workspace_owner after insert on public.workspaces for each row execute function public.add_owner_membership();

create or replace function public.enforce_workspace_limit() returns trigger language plpgsql as $$
begin
  if (select count(*) from public.workspace_members where workspace_id = new.workspace_id) >= 10 then
    raise exception 'workspace member limit reached';
  end if;
  return new;
end;
$$;

create trigger trg_workspace_limit before insert on public.workspace_members for each row execute function public.enforce_workspace_limit();

create or replace function public.is_workspace_member(wid uuid) returns boolean language sql stable as $$
  select exists(select 1 from public.workspace_members wm where wm.workspace_id = wid and wm.user_id = auth.uid());
$$;

create or replace function public.is_workspace_owner(wid uuid) returns boolean language sql stable as $$
  select exists(select 1 from public.workspace_members wm where wm.workspace_id = wid and wm.user_id = auth.uid() and wm.role='owner');
$$;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.invitations enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.reports enable row level security;
alter table public.ai_generations enable row level security;

create policy "members can view workspace" on public.workspaces for select using (public.is_workspace_member(id));
create policy "owner creates workspace" on public.workspaces for insert with check (created_by = auth.uid());
create policy "owner updates workspace" on public.workspaces for update using (public.is_workspace_owner(id));

create policy "members view members" on public.workspace_members for select using (public.is_workspace_member(workspace_id));
create policy "owner manage members" on public.workspace_members for all using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));

create policy "members view invites" on public.invitations for select using (public.is_workspace_member(workspace_id));
create policy "owner manage invites" on public.invitations for all using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));

create policy "members crud players" on public.players for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "members crud matches" on public.matches for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "members crud reports" on public.reports for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "members crud ai" on public.ai_generations for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
