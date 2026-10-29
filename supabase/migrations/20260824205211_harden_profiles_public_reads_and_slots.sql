begin;

-- RLS controls rows, while grants control columns. Users may edit only profile fields
-- that belong to their own presentation and preferences.
revoke update on table public.profiles from authenticated;
grant update (
  display_name,
  phone_e164,
  avatar_path,
  city,
  state_code,
  bio,
  preferences
) on table public.profiles to authenticated;

-- A public team is a booking catalog, not a directory of every internal role.
drop policy if exists space_members_public_read on public.space_members;
create policy space_members_public_read on public.space_members for select to anon
using (
  is_active
  and is_bookable
  and exists (
    select 1 from public.beauty_spaces bs
    where bs.id = space_id and bs.status = 'published' and bs.is_active
  )
);

drop policy if exists space_members_authenticated_read on public.space_members;
create policy space_members_authenticated_read on public.space_members for select to authenticated
using (
  (
    is_active
    and is_bookable
    and exists (
      select 1 from public.beauty_spaces bs
      where bs.id = space_id and bs.status = 'published' and bs.is_active
    )
  )
  or user_id = (select auth.uid())
  or (select private.is_space_member(space_id))
  or (select private.has_platform_role('platform_admin'))
);

-- Authenticated visitors receive the same public boundary as anonymous visitors.
drop policy if exists member_services_authenticated_read on public.member_services;
create policy member_services_authenticated_read on public.member_services for select to authenticated
using (
  (
    exists (
      select 1 from public.services s
      where s.id = service_id and s.status = 'active'
    )
    and exists (
      select 1 from public.space_members sm
      where sm.id = member_id and sm.is_active and sm.is_bookable
    )
    and exists (
      select 1 from public.beauty_spaces bs
      where bs.id = space_id and bs.status = 'published' and bs.is_active
    )
  )
  or (select private.is_space_member(space_id))
);

drop policy if exists reviews_authenticated_read on public.reviews;
create policy reviews_authenticated_read on public.reviews for select to authenticated
using (
  (
    status = 'published'
    and exists (
      select 1 from public.beauty_spaces bs
      where bs.id = space_id and bs.status = 'published' and bs.is_active
    )
  )
  or customer_id = (select auth.uid())
  or (select private.is_space_member(space_id))
  or (select private.has_platform_role('platform_admin'))
);

-- Enforce the interval exposed by each weekly availability rule. Explicit
-- availability exceptions use a conservative 15-minute grid.
create or replace function private.validate_appointment_slot_alignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  space_timezone text;
begin
  select bs.timezone
  into space_timezone
  from public.beauty_spaces bs
  where bs.id = new.space_id;

  if space_timezone is null then
    raise exception 'Beauty Hub: booking space timezone is unavailable.' using errcode = '22023';
  end if;

  if not (
    exists (
      select 1
      from public.availability_rules ar
      where ar.space_id = new.space_id
        and ar.is_active
        and (ar.member_id is null or ar.member_id = new.professional_member_id)
        and ar.weekday = extract(dow from (new.starts_at at time zone space_timezone))::smallint
        and (new.starts_at at time zone space_timezone)::date
          = (new.ends_at at time zone space_timezone)::date
        and ar.start_time <= (new.starts_at at time zone space_timezone)::time
        and ar.end_time >= (new.ends_at at time zone space_timezone)::time
        and (ar.valid_from is null or ar.valid_from <= (new.starts_at at time zone space_timezone)::date)
        and (ar.valid_until is null or ar.valid_until >= (new.starts_at at time zone space_timezone)::date)
        and mod(
          floor(extract(epoch from (
            (new.starts_at at time zone space_timezone)::time - ar.start_time
          )) / 60)::integer,
          ar.slot_interval_minutes
        ) = 0
    )
    or exists (
      select 1
      from public.availability_exceptions ae
      where ae.space_id = new.space_id
        and (ae.member_id is null or ae.member_id = new.professional_member_id)
        and ae.kind = 'available'
        and ae.starts_at <= new.starts_at
        and ae.ends_at >= new.ends_at
        and mod(
          floor(extract(epoch from (new.starts_at - ae.starts_at)) / 60)::integer,
          15
        ) = 0
    )
  ) then
    raise exception 'Beauty Hub: choose a start time aligned with the available slots.'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke execute on function private.validate_appointment_slot_alignment()
from public, anon, authenticated;

drop trigger if exists appointments_validate_slot_alignment on public.appointments;
create trigger appointments_validate_slot_alignment
before insert or update of space_id, professional_member_id, starts_at, ends_at
on public.appointments
for each row execute function private.validate_appointment_slot_alignment();

commit;


