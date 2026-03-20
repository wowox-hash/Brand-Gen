-- ============================================================
-- Brand Presets Sharing & Team Permissions Migration
-- ============================================================

-- 1. BRAND_PRESETS TABLE (server-side shared presets)
create table public.brand_presets (
    id uuid default uuid_generate_v4() primary key,
    company_id uuid references public.companies(id) on delete cascade not null,
    created_by uuid references public.profiles(id) on delete set null,
    name text not null,
    industry text not null default '',
    colors jsonb not null default '[]'::jsonb,
    style text not null default '',
    target_audience text not null default '',
    tone_of_voice text not null default '',
    typography text not null default '',
    logo_description text not null default '',
    guidelines text not null default '',
    pdf_context text,
    assets jsonb not null default '[]'::jsonb,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- 2. ADD PERMISSIONS COLUMN TO COMPANY_MEMBERS
alter table public.company_members
    add column permissions jsonb not null default '{"can_edit_brand": false, "can_generate": true}'::jsonb;

-- 3. HELPER FUNCTIONS FOR PERMISSION CHECKS
create or replace function public.member_can_edit_brand(p_user_id uuid, p_company_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.company_members
    where user_id = p_user_id
      and company_id = p_company_id
      and (role = 'admin' or (permissions->>'can_edit_brand')::boolean = true)
  );
$$ language sql security definer stable;

create or replace function public.member_can_generate(p_user_id uuid, p_company_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.company_members
    where user_id = p_user_id
      and company_id = p_company_id
      and (role = 'admin' or (permissions->>'can_generate')::boolean = true)
  );
$$ language sql security definer stable;

-- 4. RLS ON BRAND_PRESETS
alter table public.brand_presets enable row level security;

-- Any company member can view their company's presets
create policy "Members can view company presets" on brand_presets for select
using (company_id in (select public.get_user_company_ids(auth.uid())));

-- Only editors (admins or members with can_edit_brand) can insert
create policy "Editors can create presets" on brand_presets for insert
with check (public.member_can_edit_brand(auth.uid(), company_id));

-- Only editors can update
create policy "Editors can update presets" on brand_presets for update
using (public.member_can_edit_brand(auth.uid(), company_id));

-- Only editors can delete
create policy "Editors can delete presets" on brand_presets for delete
using (public.member_can_edit_brand(auth.uid(), company_id));

-- 5. ALLOW ADMINS TO UPDATE COMPANY MEMBERS (for permission changes)
create policy "Admins can update members of their companies" on company_members for update
using (company_id in (select public.get_user_admin_company_ids(auth.uid())));
