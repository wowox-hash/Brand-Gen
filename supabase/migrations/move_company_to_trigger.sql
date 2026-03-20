-- ============================================================
-- MIGRATION: Move company creation into the signup trigger
-- Run this in your Supabase Dashboard → SQL Editor
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
