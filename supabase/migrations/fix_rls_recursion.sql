-- ============================================================
-- MIGRATION: Fix infinite recursion in RLS policies
-- Run this in your Supabase Dashboard → SQL Editor
-- ============================================================

-- Step 1: Drop the problematic policies
drop policy if exists "Users can view members of their companies" on company_members;
drop policy if exists "Users can view their companies" on companies;
drop policy if exists "Admins can update their companies" on companies;
drop policy if exists "Users can insert themselves as admin to new company" on company_members;
drop policy if exists "Admins can manage invites" on company_invites;

-- Step 2: Create helper functions (SECURITY DEFINER bypasses RLS)
create or replace function public.get_user_company_ids(p_user_id uuid)
returns setof uuid as $$
  select company_id from public.company_members where user_id = p_user_id;
$$ language sql security definer stable;

create or replace function public.get_user_admin_company_ids(p_user_id uuid)
returns setof uuid as $$
  select company_id from public.company_members where user_id = p_user_id and role = 'admin';
$$ language sql security definer stable;

create or replace function public.company_has_members(p_company_id uuid)
returns boolean as $$
  select exists (select 1 from public.company_members where company_id = p_company_id);
$$ language sql security definer stable;

-- Step 3: Recreate policies using the helper functions
create policy "Users can view members of their companies" on company_members for select 
using (
  company_id in (select public.get_user_company_ids(auth.uid()))
);

create policy "Users can view their companies" on companies for select 
using (
  id in (select public.get_user_company_ids(auth.uid()))
);

create policy "Admins can update their companies" on companies for update 
using (
  id in (select public.get_user_admin_company_ids(auth.uid()))
);

create policy "Users can insert themselves as admin to new company" on company_members for insert 
with check (
  auth.role() = 'authenticated' 
  and user_id = auth.uid() 
  and role = 'admin'
  and not public.company_has_members(company_id)
);

create policy "Admins can manage invites" on company_invites for all 
using (
  company_id in (select public.get_user_admin_company_ids(auth.uid()))
);
