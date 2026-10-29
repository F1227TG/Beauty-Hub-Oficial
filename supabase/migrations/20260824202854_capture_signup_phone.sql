begin;

-- Keep the required signup phone aligned with the private profile created by Auth.
-- Metadata is only onboarding input for the user's own row and never authorizes access.
create or replace function private.handle_beauty_hub_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_account_type text;
  requested_phone text;
begin
  requested_account_type := lower(coalesce(new.raw_user_meta_data ->> 'account_type', 'customer'));
  requested_phone := nullif(trim(new.raw_user_meta_data ->> 'phone_e164'), '');

  if requested_phone is not null and requested_phone !~ '^\+[1-9][0-9]{7,14}$' then
    requested_phone := null;
  end if;

  insert into public.profiles (id, display_name, phone_e164)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Cliente Beauty Hub'
    ),
    requested_phone
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role, created_by)
  values (new.id, 'customer', new.id)
  on conflict (user_id, role) do nothing;

  if requested_account_type in ('professional', 'both') then
    insert into public.user_roles (user_id, role, created_by)
    values (new.id, 'professional', new.id)
    on conflict (user_id, role) do nothing;
  end if;

  return new;
end;
$$;

revoke execute on function private.handle_beauty_hub_user() from public, anon, authenticated;

commit;


