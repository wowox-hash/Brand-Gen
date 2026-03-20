-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. COMPANIES TABLE
create table public.companies (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. PROFILES TABLE (Extends auth.users)
create table public.profiles (
    id uuid references auth.users(id) on delete cascade primary key,
    account_type text check (account_type in ('private', 'company')) not null default 'private',
    full_name text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. COMPANY_MEMBERS TABLE (For role-based access)
create table public.company_members (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id) on delete cascade,
    company_id uuid references public.companies(id) on delete cascade,
    role text check (role in ('admin', 'member')) not null default 'member',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, company_id)
);

-- ============================================================
-- HELPER FUNCTIONS (SECURITY DEFINER) to avoid RLS recursion
-- These bypass RLS when called from within policies
-- ============================================================

-- Returns all company_ids a user belongs to
create or replace function public.get_user_company_ids(p_user_id uuid)
returns setof uuid as $$
  select company_id from public.company_members where user_id = p_user_id;
$$ language sql security definer stable;

-- Returns all company_ids where user is admin
create or replace function public.get_user_admin_company_ids(p_user_id uuid)
returns setof uuid as $$
  select company_id from public.company_members where user_id = p_user_id and role = 'admin';
$$ language sql security definer stable;

-- Checks if a company has any members (used for first-admin insert check)
create or replace function public.company_has_members(p_company_id uuid)
returns boolean as $$
  select exists (select 1 from public.company_members where company_id = p_company_id);
$$ language sql security definer stable;

-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.company_members enable row level security;

-- Profiles: Users can see and update their own profile
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Company Members: Users can see members of companies they belong to
create policy "Users can view members of their companies" on company_members for select 
using (
  company_id in (select public.get_user_company_ids(auth.uid()))
);

-- Companies: Users can view their own companies
create policy "Users can view their companies" on companies for select 
using (
  id in (select public.get_user_company_ids(auth.uid()))
);

-- Admins can update their companies
create policy "Admins can update their companies" on companies for update 
using (
  id in (select public.get_user_admin_company_ids(auth.uid()))
);

-- Insert policies
create policy "Users can insert companies" on companies for insert with check (auth.role() = 'authenticated');

create policy "Users can insert themselves as admin to new company" on company_members for insert 
with check (
  auth.role() = 'authenticated' 
  and user_id = auth.uid() 
  and role = 'admin'
  and not public.company_has_members(company_id)
);

-- ============================================================
-- 5. TRIGGER ON USER SIGNUP
-- ============================================================

create or replace function public.handle_new_user() 
returns trigger as $$
declare
  new_company_id uuid;
begin
  -- Create profile
  insert into public.profiles (id, full_name, account_type)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'account_type', 'private')
  );

  -- If company account, create company and assign as admin
  if new.raw_user_meta_data->>'account_type' = 'company' then
    insert into public.companies (name)
    values (coalesce(new.raw_user_meta_data->>'company_name', new.raw_user_meta_data->>'full_name' || '''s Company'))
    returning id into new_company_id;

    insert into public.company_members (user_id, company_id, role)
    values (new.id, new_company_id, 'admin');
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 6. COMPANY_INVITES TABLE
-- ============================================================

create table public.company_invites (
    id uuid default uuid_generate_v4() primary key,
    company_id uuid references public.companies(id) on delete cascade,
    email text not null,
    invited_by uuid references public.profiles(id) on delete cascade,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(company_id, email)
);

alter table public.company_invites enable row level security;

-- Admins can view and insert invites for their company
create policy "Admins can manage invites" on company_invites for all 
using (
  company_id in (select public.get_user_admin_company_ids(auth.uid()))
);

-- Users can read their own invites
create policy "Users can read their own invites" on company_invites for select 
using (
  email = auth.jwt()->>'email'
);

-- Handle invite acceptance on signup
create or replace function public.handle_invite_acceptance() 
returns trigger as $$
declare
  invite_record record;
begin
  for invite_record in select * from public.company_invites where email = new.raw_user_meta_data->>'email' loop
    insert into public.company_members (user_id, company_id, role)
    values (new.id, invite_record.company_id, 'member');
    delete from public.company_invites where id = invite_record.id;
  end loop;
  return new;
end;
$$ language plpgsql security definer;

-- Add trigger after the profile creation trigger
create trigger on_auth_user_created_invites
  after insert on auth.users
  for each row execute procedure public.handle_invite_acceptance();
