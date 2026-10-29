begin;

-- Beauty Hub database foundation.
-- This migration is intentionally independent from Barber Hub.

create schema if not exists private;
create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;
set local search_path = public, extensions, pg_catalog;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  phone_e164 text,
  avatar_path text,
  city text,
  state_code text,
  bio text,
  preferences jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (char_length(display_name) between 2 and 100),
  constraint profiles_phone_e164_format check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  constraint profiles_state_code_format check (state_code is null or state_code ~ '^[A-Z]{2}$'),
  constraint profiles_preferences_object check (jsonb_typeof(preferences) = 'object'),
  constraint profiles_status_check check (status in ('active', 'suspended', 'deleted'))
);

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  primary key (user_id, role),
  constraint user_roles_role_check check (role in ('customer', 'professional', 'platform_admin'))
);

create table public.beauty_spaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete restrict,
  name text not null,
  slug text not null unique,
  kind text not null default 'salon',
  description text,
  cover_path text,
  logo_path text,
  phone_e164 text,
  whatsapp_e164 text,
  email text,
  website_url text,
  instagram_handle text,
  address_line text,
  address_number text,
  address_extra text,
  neighborhood text,
  city text not null,
  state_code text not null,
  postal_code text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  timezone text not null default 'America/Sao_Paulo',
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  is_active boolean not null default true,
  rating numeric(3, 2) not null default 0,
  review_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beauty_spaces_name_length check (char_length(name) between 2 and 120),
  constraint beauty_spaces_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint beauty_spaces_kind_check check (kind in ('salon', 'studio', 'independent', 'spa', 'clinic')),
  constraint beauty_spaces_phone_e164_format check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  constraint beauty_spaces_whatsapp_e164_format check (whatsapp_e164 is null or whatsapp_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  constraint beauty_spaces_state_code_format check (state_code ~ '^[A-Z]{2}$'),
  constraint beauty_spaces_latitude_range check (latitude is null or latitude between -90 and 90),
  constraint beauty_spaces_longitude_range check (longitude is null or longitude between -180 and 180),
  constraint beauty_spaces_status_check check (status in ('draft', 'published', 'suspended', 'archived')),
  constraint beauty_spaces_verification_check check (verification_status in ('unverified', 'pending', 'verified', 'rejected')),
  constraint beauty_spaces_rating_range check (rating between 0 and 5),
  constraint beauty_spaces_review_count_nonnegative check (review_count >= 0),
  unique (id, owner_id)
);

create table public.space_members (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.beauty_spaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null,
  display_name text not null,
  professional_title text,
  bio text,
  avatar_path text,
  is_bookable boolean not null default false,
  is_active boolean not null default true,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint space_members_role_check check (role in ('owner', 'manager', 'receptionist', 'professional')),
  constraint space_members_display_name_length check (char_length(display_name) between 2 and 100),
  unique (space_id, user_id),
  unique (id, space_id)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  icon text,
  sort_order smallint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint categories_name_length check (char_length(name) between 2 and 80),
  constraint categories_sort_order_nonnegative check (sort_order >= 0)
);

create table public.space_categories (
  space_id uuid not null references public.beauty_spaces (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (space_id, category_id)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.beauty_spaces (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  name text not null,
  description text,
  duration_minutes smallint not null,
  price numeric(12, 2) not null,
  deposit_amount numeric(12, 2) not null default 0,
  status text not null default 'active',
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint services_name_length check (char_length(name) between 2 and 120),
  constraint services_duration_range check (duration_minutes between 5 and 720),
  constraint services_price_nonnegative check (price >= 0),
  constraint services_deposit_range check (deposit_amount >= 0 and deposit_amount <= price),
  constraint services_status_check check (status in ('draft', 'active', 'inactive', 'archived')),
  unique (id, space_id)
);

create table public.member_services (
  member_id uuid not null,
  service_id uuid not null,
  space_id uuid not null,
  custom_duration_minutes smallint,
  custom_price numeric(12, 2),
  created_at timestamptz not null default now(),
  primary key (member_id, service_id),
  constraint member_services_member_space_fkey foreign key (member_id, space_id)
    references public.space_members (id, space_id) on delete cascade,
  constraint member_services_service_space_fkey foreign key (service_id, space_id)
    references public.services (id, space_id) on delete cascade,
  constraint member_services_duration_range check (custom_duration_minutes is null or custom_duration_minutes between 5 and 720),
  constraint member_services_price_nonnegative check (custom_price is null or custom_price >= 0)
);

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.beauty_spaces (id) on delete cascade,
  member_id uuid,
  weekday smallint not null,
  start_time time not null,
  end_time time not null,
  valid_from date,
  valid_until date,
  slot_interval_minutes smallint not null default 15,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_rules_member_space_fkey foreign key (member_id, space_id)
    references public.space_members (id, space_id) on delete cascade,
  constraint availability_rules_weekday_range check (weekday between 0 and 6),
  constraint availability_rules_time_order check (start_time < end_time),
  constraint availability_rules_validity_order check (valid_until is null or valid_from is null or valid_from <= valid_until),
  constraint availability_rules_slot_interval check (slot_interval_minutes between 5 and 120)
);

create table public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.beauty_spaces (id) on delete cascade,
  member_id uuid,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  kind text not null default 'blocked',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_exceptions_member_space_fkey foreign key (member_id, space_id)
    references public.space_members (id, space_id) on delete cascade,
  constraint availability_exceptions_time_order check (starts_at < ends_at),
  constraint availability_exceptions_kind_check check (kind in ('blocked', 'available'))
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users (id) on delete restrict,
  space_id uuid not null references public.beauty_spaces (id) on delete restrict,
  professional_member_id uuid,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'pending',
  source text not null default 'web',
  customer_notes text,
  total_amount numeric(12, 2) not null default 0,
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_professional_space_fkey foreign key (professional_member_id, space_id)
    references public.space_members (id, space_id) on delete restrict,
  constraint appointments_time_order check (starts_at < ends_at),
  constraint appointments_status_check check (status in ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  constraint appointments_source_check check (source in ('web', 'mobile', 'dashboard', 'import')),
  constraint appointments_customer_notes_length check (customer_notes is null or char_length(customer_notes) <= 2000),
  constraint appointments_total_nonnegative check (total_amount >= 0),
  constraint appointments_cancelled_consistency check (
    (status = 'cancelled') = (cancelled_at is not null)
  ),
  unique (id, space_id),
  unique (id, customer_id, space_id),
  constraint appointments_professional_time_excl exclude using gist (
    professional_member_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (professional_member_id is not null and status in ('pending', 'confirmed', 'in_progress'))
);

create table public.appointment_items (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null,
  space_id uuid not null,
  service_id uuid not null,
  professional_member_id uuid,
  service_name_snapshot text not null,
  duration_minutes_snapshot smallint not null,
  unit_price numeric(12, 2) not null,
  quantity smallint not null default 1,
  line_total numeric(12, 2) generated always as (unit_price * quantity) stored,
  created_at timestamptz not null default now(),
  constraint appointment_items_appointment_space_fkey foreign key (appointment_id, space_id)
    references public.appointments (id, space_id) on delete cascade,
  constraint appointment_items_service_space_fkey foreign key (service_id, space_id)
    references public.services (id, space_id) on delete restrict,
  constraint appointment_items_professional_space_fkey foreign key (professional_member_id, space_id)
    references public.space_members (id, space_id) on delete restrict,
  constraint appointment_items_duration_range check (duration_minutes_snapshot between 5 and 720),
  constraint appointment_items_unit_price_nonnegative check (unit_price >= 0),
  constraint appointment_items_quantity_range check (quantity between 1 and 10)
);

create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  space_id uuid not null references public.beauty_spaces (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, space_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique,
  customer_id uuid not null,
  space_id uuid not null,
  rating smallint not null,
  comment text,
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_appointment_customer_space_fkey foreign key (appointment_id, customer_id, space_id)
    references public.appointments (id, customer_id, space_id) on delete restrict,
  constraint reviews_rating_range check (rating between 1 and 5),
  constraint reviews_comment_length check (comment is null or char_length(comment) between 3 and 2000),
  constraint reviews_status_check check (status in ('published', 'hidden', 'reported')),
  unique (id, space_id)
);

create table public.review_responses (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null unique,
  space_id uuid not null references public.beauty_spaces (id) on delete cascade,
  author_member_id uuid,
  response text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_responses_review_space_fkey foreign key (review_id, space_id)
    references public.reviews (id, space_id) on delete cascade,
  constraint review_responses_author_space_fkey foreign key (author_member_id, space_id)
    references public.space_members (id, space_id) on delete set null (author_member_id),
  constraint review_responses_text_length check (char_length(response) between 2 and 1200)
);

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.beauty_spaces (id) on delete cascade,
  member_id uuid,
  category_id uuid references public.categories (id) on delete set null,
  title text,
  description text,
  media_path text not null,
  thumbnail_path text,
  alt_text text not null,
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portfolio_items_member_space_fkey foreign key (member_id, space_id)
    references public.space_members (id, space_id) on delete set null (member_id),
  constraint portfolio_items_title_length check (title is null or char_length(title) <= 120),
  constraint portfolio_items_alt_text_length check (char_length(alt_text) between 2 and 240),
  constraint portfolio_items_sort_order_nonnegative check (sort_order >= 0)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  href text,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notifications_type_check check (type in ('appointment', 'reminder', 'review', 'favorite', 'system')),
  constraint notifications_title_length check (char_length(title) between 2 and 160),
  constraint notifications_body_length check (char_length(body) between 2 and 2000),
  constraint notifications_payload_object check (jsonb_typeof(payload) = 'object')
);

-- Supporting indexes, including every foreign key and RLS lookup column.
create index user_roles_role_user_idx on public.user_roles (role, user_id);
create index user_roles_created_by_idx on public.user_roles (created_by) where created_by is not null;
create index beauty_spaces_owner_id_idx on public.beauty_spaces (owner_id);
create index beauty_spaces_public_city_idx on public.beauty_spaces (city, state_code, rating desc)
  where status = 'published' and is_active;
create index space_members_user_id_idx on public.space_members (user_id);
create index space_members_space_active_idx on public.space_members (space_id, is_active);
create index space_categories_category_id_idx on public.space_categories (category_id);
create index services_space_status_idx on public.services (space_id, status);
create index services_category_id_idx on public.services (category_id);
create index member_services_service_id_idx on public.member_services (service_id);
create index member_services_space_id_idx on public.member_services (space_id);
create index availability_rules_space_weekday_idx on public.availability_rules (space_id, weekday)
  where is_active;
create index availability_rules_member_id_idx on public.availability_rules (member_id) where member_id is not null;
create index availability_exceptions_space_time_idx on public.availability_exceptions (space_id, starts_at, ends_at);
create index availability_exceptions_member_id_idx on public.availability_exceptions (member_id) where member_id is not null;
create index appointments_customer_created_idx on public.appointments (customer_id, created_at desc);
create index appointments_space_start_idx on public.appointments (space_id, starts_at);
create index appointments_professional_start_idx on public.appointments (professional_member_id, starts_at)
  where professional_member_id is not null and status in ('pending', 'confirmed', 'in_progress');
create index appointments_status_start_idx on public.appointments (status, starts_at);
create index appointments_cancelled_by_idx on public.appointments (cancelled_by) where cancelled_by is not null;
create index appointment_items_appointment_id_idx on public.appointment_items (appointment_id);
create index appointment_items_space_id_idx on public.appointment_items (space_id);
create index appointment_items_service_id_idx on public.appointment_items (service_id);
create index appointment_items_professional_id_idx on public.appointment_items (professional_member_id)
  where professional_member_id is not null;
create index favorites_space_id_idx on public.favorites (space_id);
create index reviews_customer_id_idx on public.reviews (customer_id);
create index reviews_space_published_idx on public.reviews (space_id, created_at desc) where status = 'published';
create index review_responses_space_id_idx on public.review_responses (space_id);
create index review_responses_author_member_idx on public.review_responses (author_member_id)
  where author_member_id is not null;
create index portfolio_items_space_published_idx on public.portfolio_items (space_id, sort_order, created_at desc)
  where is_published;
create index portfolio_items_space_id_idx on public.portfolio_items (space_id);
create index portfolio_items_member_id_idx on public.portfolio_items (member_id) where member_id is not null;
create index portfolio_items_category_id_idx on public.portfolio_items (category_id) where category_id is not null;
create index notifications_user_unread_idx on public.notifications (user_id, created_at desc) where read_at is null;
create index notifications_user_id_idx on public.notifications (user_id);

-- Shared updated_at trigger, unavailable as a public RPC.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger beauty_spaces_set_updated_at before update on public.beauty_spaces
for each row execute function public.set_updated_at();
create trigger space_members_set_updated_at before update on public.space_members
for each row execute function public.set_updated_at();
create trigger services_set_updated_at before update on public.services
for each row execute function public.set_updated_at();
create trigger availability_rules_set_updated_at before update on public.availability_rules
for each row execute function public.set_updated_at();
create trigger availability_exceptions_set_updated_at before update on public.availability_exceptions
for each row execute function public.set_updated_at();
create trigger appointments_set_updated_at before update on public.appointments
for each row execute function public.set_updated_at();
create trigger reviews_set_updated_at before update on public.reviews
for each row execute function public.set_updated_at();
create trigger review_responses_set_updated_at before update on public.review_responses
for each row execute function public.set_updated_at();
create trigger portfolio_items_set_updated_at before update on public.portfolio_items
for each row execute function public.set_updated_at();
create trigger notifications_set_updated_at before update on public.notifications
for each row execute function public.set_updated_at();

-- Authorization helpers live outside the exposed public schema.
create or replace function private.has_platform_role(requested_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.user_roles ur
      where ur.user_id = (select auth.uid())
        and ur.role = requested_role
    );
$$;

create or replace function private.is_space_member(requested_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.space_members sm
      where sm.space_id = requested_space_id
        and sm.user_id = (select auth.uid())
        and sm.is_active
    );
$$;

create or replace function private.can_manage_space(requested_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and (
      exists (
        select 1
        from public.beauty_spaces bs
        where bs.id = requested_space_id
          and bs.owner_id = (select auth.uid())
      )
      or exists (
        select 1
        from public.space_members sm
        where sm.space_id = requested_space_id
          and sm.user_id = (select auth.uid())
          and sm.role in ('owner', 'manager')
          and sm.is_active
      )
      or (select private.has_platform_role('platform_admin'))
    );
$$;

revoke execute on function private.has_platform_role(text) from public, anon, authenticated;
revoke execute on function private.is_space_member(uuid) from public, anon, authenticated;
revoke execute on function private.can_manage_space(uuid) from public, anon, authenticated;
grant execute on function private.has_platform_role(text) to authenticated;
grant execute on function private.is_space_member(uuid) to authenticated;
grant execute on function private.can_manage_space(uuid) to authenticated;

-- A newly authenticated account receives a profile and safe, self-selectable roles.
-- raw_user_meta_data is copied only as onboarding input; it is never consulted by RLS.
create or replace function private.handle_beauty_hub_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_account_type text;
begin
  requested_account_type := lower(coalesce(new.raw_user_meta_data ->> 'account_type', 'customer'));

  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Cliente Beauty Hub'
    )
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

drop trigger if exists on_auth_user_created_beauty_hub on auth.users;
create trigger on_auth_user_created_beauty_hub
after insert on auth.users
for each row execute function private.handle_beauty_hub_user();

insert into public.profiles (id, display_name)
select
  au.id,
  coalesce(
    nullif(trim(au.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(au.email, ''), '@', 1), ''),
    'Cliente Beauty Hub'
  )
from auth.users au
on conflict (id) do nothing;

insert into public.user_roles (user_id, role, created_by)
select au.id, 'customer', au.id
from auth.users au
on conflict (user_id, role) do nothing;

-- The space owner is permanent in this first version. A future audited RPC can transfer ownership.
create or replace function private.create_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.space_members (space_id, user_id, role, display_name, is_bookable)
  values (
    new.id,
    new.owner_id,
    'owner',
    coalesce((select p.display_name from public.profiles p where p.id = new.owner_id), 'Responsável'),
    false
  )
  on conflict (space_id, user_id) do update
    set role = 'owner', is_active = true;

  return new;
end;
$$;

create or replace function private.protect_space_owner()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'Beauty Hub: ownership transfer requires an audited server operation.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function private.protect_owner_membership()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.role = 'owner' then
    raise exception 'Beauty Hub: the owner membership cannot be deleted.'
      using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' then
    if old.role = 'owner' and (
      new.role is distinct from old.role
      or new.user_id is distinct from old.user_id
      or new.space_id is distinct from old.space_id
    ) then
      raise exception 'Beauty Hub: the owner membership cannot be reassigned.'
        using errcode = '42501';
    end if;

    if old.role <> 'owner' and new.role = 'owner' then
      raise exception 'Beauty Hub: only the registered space owner can hold the owner role.'
        using errcode = '42501';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke execute on function private.create_owner_membership() from public, anon, authenticated;
revoke execute on function private.protect_space_owner() from public, anon, authenticated;
revoke execute on function private.protect_owner_membership() from public, anon, authenticated;

create trigger beauty_spaces_create_owner_member
after insert on public.beauty_spaces
for each row execute function private.create_owner_membership();

create trigger beauty_spaces_protect_owner
before update on public.beauty_spaces
for each row execute function private.protect_space_owner();

create trigger space_members_protect_owner
before update or delete on public.space_members
for each row execute function private.protect_owner_membership();

-- Maintain the public rating summary without trusting client-provided aggregates.
create or replace function private.refresh_space_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_space_id uuid;
begin
  target_space_id := case when tg_op = 'DELETE' then old.space_id else new.space_id end;

  update public.beauty_spaces bs
  set
    rating = coalesce((
      select round(avg(r.rating)::numeric, 2)
      from public.reviews r
      where r.space_id = target_space_id and r.status = 'published'
    ), 0),
    review_count = (
      select count(*)::integer
      from public.reviews r
      where r.space_id = target_space_id and r.status = 'published'
    )
  where bs.id = target_space_id;

  if tg_op = 'UPDATE' and old.space_id is distinct from new.space_id then
    update public.beauty_spaces bs
    set
      rating = coalesce((
        select round(avg(r.rating)::numeric, 2)
        from public.reviews r
        where r.space_id = old.space_id and r.status = 'published'
      ), 0),
      review_count = (
        select count(*)::integer
        from public.reviews r
        where r.space_id = old.space_id and r.status = 'published'
      )
    where bs.id = old.space_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke execute on function private.refresh_space_rating() from public, anon, authenticated;

create trigger reviews_refresh_space_rating
after insert or update or delete on public.reviews
for each row execute function private.refresh_space_rating();

-- Transactional booking implementation. It is kept outside the exposed schema,
-- validates auth.uid() explicitly, and is reachable only through the public wrapper below.
create or replace function private.create_booking_internal(
  p_space_id uuid,
  p_professional_member_id uuid,
  p_starts_at timestamptz,
  p_customer_notes text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  requested_count integer;
  matched_count integer;
  total_duration integer;
  total_price numeric(12, 2);
  space_timezone text;
  appointment_ends_at timestamptz;
  new_appointment_id uuid;
begin
  if current_user_id is null then
    raise exception 'Beauty Hub: authentication is required.' using errcode = '28000';
  end if;

  if p_starts_at <= now() then
    raise exception 'Beauty Hub: the appointment must start in the future.' using errcode = '22023';
  end if;

  if p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) = 0
    or jsonb_array_length(p_items) > 10 then
    raise exception 'Beauty Hub: choose between 1 and 10 service items.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) item
    where not (item ? 'service_id')
      or coalesce((item ->> 'quantity')::integer, 1) not between 1 and 10
  ) then
    raise exception 'Beauty Hub: every item needs a valid service and quantity.' using errcode = '22023';
  end if;

  select bs.timezone
  into space_timezone
  from public.beauty_spaces bs
  where bs.id = p_space_id
    and bs.status = 'published'
    and bs.is_active;

  if not found then
    raise exception 'Beauty Hub: this space is unavailable for booking.' using errcode = '22023';
  end if;

  if p_professional_member_id is not null and not exists (
    select 1
    from public.space_members sm
    where sm.id = p_professional_member_id
      and sm.space_id = p_space_id
      and sm.is_active
      and sm.is_bookable
  ) then
    raise exception 'Beauty Hub: the selected professional is unavailable.' using errcode = '22023';
  end if;

  requested_count := jsonb_array_length(p_items);

  with requested as (
    select
      (item ->> 'service_id')::uuid as service_id,
      coalesce((item ->> 'quantity')::integer, 1) as quantity
    from jsonb_array_elements(p_items) item
  ), matched as (
    select
      s.id,
      s.duration_minutes,
      s.price,
      r.quantity
    from requested r
    join public.services s on s.id = r.service_id
    where s.space_id = p_space_id and s.status = 'active'
  )
  select
    count(*)::integer,
    coalesce(sum(m.duration_minutes * m.quantity), 0)::integer,
    coalesce(sum(m.price * m.quantity), 0)::numeric(12, 2)
  into matched_count, total_duration, total_price
  from matched m;

  if matched_count <> requested_count or total_duration <= 0 then
    raise exception 'Beauty Hub: one or more selected services are unavailable.' using errcode = '22023';
  end if;

  appointment_ends_at := p_starts_at + make_interval(mins => total_duration);

  if not (
    exists (
      select 1
      from public.availability_rules ar
      where ar.space_id = p_space_id
        and ar.is_active
        and (ar.member_id is null or ar.member_id = p_professional_member_id)
        and ar.weekday = extract(dow from (p_starts_at at time zone space_timezone))::smallint
        and (p_starts_at at time zone space_timezone)::date
          = (appointment_ends_at at time zone space_timezone)::date
        and ar.start_time <= (p_starts_at at time zone space_timezone)::time
        and ar.end_time >= (appointment_ends_at at time zone space_timezone)::time
        and (ar.valid_from is null or ar.valid_from <= (p_starts_at at time zone space_timezone)::date)
        and (ar.valid_until is null or ar.valid_until >= (p_starts_at at time zone space_timezone)::date)
    )
    or exists (
      select 1
      from public.availability_exceptions ae
      where ae.space_id = p_space_id
        and (ae.member_id is null or ae.member_id = p_professional_member_id)
        and ae.kind = 'available'
        and ae.starts_at <= p_starts_at
        and ae.ends_at >= appointment_ends_at
    )
  ) then
    raise exception 'Beauty Hub: the selected time is outside the available schedule.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.availability_exceptions ae
    where ae.space_id = p_space_id
      and (ae.member_id is null or ae.member_id = p_professional_member_id)
      and ae.kind = 'blocked'
      and tstzrange(ae.starts_at, ae.ends_at, '[)') && tstzrange(p_starts_at, appointment_ends_at, '[)')
  ) then
    raise exception 'Beauty Hub: the selected time is blocked.' using errcode = '23P01';
  end if;

  insert into public.appointments (
    customer_id,
    space_id,
    professional_member_id,
    starts_at,
    ends_at,
    status,
    source,
    customer_notes,
    total_amount
  )
  values (
    current_user_id,
    p_space_id,
    p_professional_member_id,
    p_starts_at,
    appointment_ends_at,
    'pending',
    'web',
    nullif(trim(p_customer_notes), ''),
    total_price
  )
  returning id into new_appointment_id;

  insert into public.appointment_items (
    appointment_id,
    space_id,
    service_id,
    professional_member_id,
    service_name_snapshot,
    duration_minutes_snapshot,
    unit_price,
    quantity
  )
  select
    new_appointment_id,
    p_space_id,
    s.id,
    p_professional_member_id,
    s.name,
    s.duration_minutes,
    s.price,
    requested.quantity
  from (
    select
      (item ->> 'service_id')::uuid as service_id,
      coalesce((item ->> 'quantity')::integer, 1) as quantity
    from jsonb_array_elements(p_items) item
  ) requested
  join public.services s on s.id = requested.service_id
  where s.space_id = p_space_id and s.status = 'active';

  return new_appointment_id;
end;
$$;

revoke execute on function private.create_booking_internal(uuid, uuid, timestamptz, text, jsonb)
from public, anon, authenticated;
grant execute on function private.create_booking_internal(uuid, uuid, timestamptz, text, jsonb)
to authenticated;

create or replace function public.create_booking(
  p_space_id uuid,
  p_professional_member_id uuid,
  p_starts_at timestamptz,
  p_customer_notes text,
  p_items jsonb
)
returns uuid
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.create_booking_internal($1, $2, $3, $4, $5);
$$;

revoke execute on function public.create_booking(uuid, uuid, timestamptz, text, jsonb)
from public, anon, authenticated;
grant execute on function public.create_booking(uuid, uuid, timestamptz, text, jsonb) to authenticated;

-- Explicit Data API grants (required on projects with locked-down Data API defaults).
grant usage on schema public to anon, authenticated;

revoke all on table
  public.profiles,
  public.user_roles,
  public.beauty_spaces,
  public.space_members,
  public.categories,
  public.space_categories,
  public.services,
  public.member_services,
  public.availability_rules,
  public.availability_exceptions,
  public.appointments,
  public.appointment_items,
  public.favorites,
  public.reviews,
  public.review_responses,
  public.portfolio_items,
  public.notifications
from anon, authenticated;

grant all on table
  public.profiles,
  public.user_roles,
  public.beauty_spaces,
  public.space_members,
  public.categories,
  public.space_categories,
  public.services,
  public.member_services,
  public.availability_rules,
  public.availability_exceptions,
  public.appointments,
  public.appointment_items,
  public.favorites,
  public.reviews,
  public.review_responses,
  public.portfolio_items,
  public.notifications
to service_role;

grant select (
  id, name, slug, kind, description, cover_path, logo_path, phone_e164, whatsapp_e164,
  email, website_url, instagram_handle, address_line, address_number, address_extra,
  neighborhood, city, state_code, postal_code, latitude, longitude, timezone, status,
  verification_status, is_active, rating, review_count, created_at, updated_at
) on table public.beauty_spaces to anon;
grant select (
  id, space_id, role, display_name, professional_title, bio, avatar_path,
  is_bookable, is_active, joined_at, updated_at
) on table public.space_members to anon;
grant select on table public.categories, public.space_categories, public.services,
  public.member_services, public.availability_rules, public.availability_exceptions,
  public.review_responses, public.portfolio_items to anon;
grant select (id, space_id, rating, comment, status, created_at, updated_at)
  on table public.reviews to anon;

grant select on table public.profiles, public.user_roles to authenticated;
grant update on table public.profiles to authenticated;
grant select, delete on table public.beauty_spaces to authenticated;
grant insert (
  owner_id,
  name,
  slug,
  kind,
  description,
  cover_path,
  logo_path,
  phone_e164,
  whatsapp_e164,
  email,
  website_url,
  instagram_handle,
  address_line,
  address_number,
  address_extra,
  neighborhood,
  city,
  state_code,
  postal_code,
  latitude,
  longitude,
  timezone,
  status,
  is_active
) on table public.beauty_spaces to authenticated;
grant update (
  name,
  slug,
  kind,
  description,
  cover_path,
  logo_path,
  phone_e164,
  whatsapp_e164,
  email,
  website_url,
  instagram_handle,
  address_line,
  address_number,
  address_extra,
  neighborhood,
  city,
  state_code,
  postal_code,
  latitude,
  longitude,
  timezone,
  status,
  is_active,
  updated_at
) on table public.beauty_spaces to authenticated;
grant select, insert, update, delete on table
  public.space_members,
  public.space_categories,
  public.services,
  public.member_services,
  public.availability_rules,
  public.availability_exceptions,
  public.favorites,
  public.review_responses,
  public.portfolio_items
to authenticated;
grant select on table public.categories to authenticated;
grant select on table public.appointments, public.appointment_items to authenticated;
grant update (status, cancelled_at, cancelled_by, updated_at) on table public.appointments to authenticated;
grant insert, delete on table public.reviews to authenticated;
grant select (id, space_id, rating, comment, status, created_at, updated_at)
  on table public.reviews to authenticated;
grant select, delete on table public.notifications to authenticated;
grant update (read_at, updated_at) on table public.notifications to authenticated;

-- RLS is enabled on every table exposed through public.
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.beauty_spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.categories enable row level security;
alter table public.space_categories enable row level security;
alter table public.services enable row level security;
alter table public.member_services enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_items enable row level security;
alter table public.favorites enable row level security;
alter table public.reviews enable row level security;
alter table public.review_responses enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.notifications enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated
using ((select auth.uid()) = id or (select private.has_platform_role('platform_admin')));
create policy profiles_update_own on public.profiles for update to authenticated
using ((select auth.uid()) = id or (select private.has_platform_role('platform_admin')))
with check ((select auth.uid()) = id or (select private.has_platform_role('platform_admin')));

create policy user_roles_select_own on public.user_roles for select to authenticated
using ((select auth.uid()) = user_id or (select private.has_platform_role('platform_admin')));

create policy beauty_spaces_public_read on public.beauty_spaces for select to anon
using (status = 'published' and is_active);
create policy beauty_spaces_authenticated_read on public.beauty_spaces for select to authenticated
using (
  (status = 'published' and is_active)
  or owner_id = (select auth.uid())
  or (select private.is_space_member(id))
  or (select private.has_platform_role('platform_admin'))
);
create policy beauty_spaces_insert_owner on public.beauty_spaces for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and status = 'draft'
  and verification_status = 'unverified'
  and rating = 0
  and review_count = 0
);
create policy beauty_spaces_update_managers on public.beauty_spaces for update to authenticated
using ((select private.can_manage_space(id)))
with check ((select private.can_manage_space(id)));
create policy beauty_spaces_delete_owner on public.beauty_spaces for delete to authenticated
using (owner_id = (select auth.uid()) or (select private.has_platform_role('platform_admin')));

create policy space_members_public_read on public.space_members for select to anon
using (
  is_active and exists (
    select 1 from public.beauty_spaces bs
    where bs.id = space_id and bs.status = 'published' and bs.is_active
  )
);
create policy space_members_authenticated_read on public.space_members for select to authenticated
using (
  (is_active and exists (
    select 1 from public.beauty_spaces bs
    where bs.id = space_id and bs.status = 'published' and bs.is_active
  ))
  or user_id = (select auth.uid())
  or (select private.is_space_member(space_id))
  or (select private.has_platform_role('platform_admin'))
);
create policy space_members_insert_managers on public.space_members for insert to authenticated
with check ((select private.can_manage_space(space_id)) and role <> 'owner');
create policy space_members_update_managers on public.space_members for update to authenticated
using ((select private.can_manage_space(space_id)) and role <> 'owner')
with check ((select private.can_manage_space(space_id)) and role <> 'owner');
create policy space_members_delete_managers on public.space_members for delete to authenticated
using ((select private.can_manage_space(space_id)) and role <> 'owner');

create policy categories_public_read on public.categories for select to anon, authenticated
using (is_active);

create policy space_categories_public_read on public.space_categories for select to anon
using (exists (
  select 1 from public.beauty_spaces bs
  where bs.id = space_id and bs.status = 'published' and bs.is_active
));
create policy space_categories_authenticated_read on public.space_categories for select to authenticated
using (
  exists (
    select 1 from public.beauty_spaces bs
    where bs.id = space_id and bs.status = 'published' and bs.is_active
  ) or (select private.is_space_member(space_id))
);
create policy space_categories_insert_managers on public.space_categories for insert to authenticated
with check ((select private.can_manage_space(space_id)));
create policy space_categories_update_managers on public.space_categories for update to authenticated
using ((select private.can_manage_space(space_id)))
with check ((select private.can_manage_space(space_id)));
create policy space_categories_delete_managers on public.space_categories for delete to authenticated
using ((select private.can_manage_space(space_id)));

create policy services_public_read on public.services for select to anon
using (
  status = 'active' and exists (
    select 1 from public.beauty_spaces bs
    where bs.id = space_id and bs.status = 'published' and bs.is_active
  )
);
create policy services_authenticated_read on public.services for select to authenticated
using (
  (status = 'active' and exists (
    select 1 from public.beauty_spaces bs
    where bs.id = space_id and bs.status = 'published' and bs.is_active
  )) or (select private.is_space_member(space_id))
);
create policy services_insert_managers on public.services for insert to authenticated
with check ((select private.can_manage_space(space_id)));
create policy services_update_managers on public.services for update to authenticated
using ((select private.can_manage_space(space_id)))
with check ((select private.can_manage_space(space_id)));
create policy services_delete_managers on public.services for delete to authenticated
using ((select private.can_manage_space(space_id)));

create policy member_services_public_read on public.member_services for select to anon
using (
  exists (
    select 1 from public.services s
    where s.id = service_id and s.status = 'active'
  ) and exists (
    select 1 from public.space_members sm
    where sm.id = member_id and sm.is_active and sm.is_bookable
  ) and exists (
    select 1 from public.beauty_spaces bs
    where bs.id = space_id and bs.status = 'published' and bs.is_active
  )
);
create policy member_services_authenticated_read on public.member_services for select to authenticated
using (
  (exists (
    select 1 from public.services s
    where s.id = service_id and s.status = 'active'
  ) and exists (
    select 1 from public.space_members sm
    where sm.id = member_id and sm.is_active and sm.is_bookable
  )) or (select private.is_space_member(space_id))
);
create policy member_services_insert_managers on public.member_services for insert to authenticated
with check ((select private.can_manage_space(space_id)));
create policy member_services_update_managers on public.member_services for update to authenticated
using ((select private.can_manage_space(space_id)))
with check ((select private.can_manage_space(space_id)));
create policy member_services_delete_managers on public.member_services for delete to authenticated
using ((select private.can_manage_space(space_id)));

create policy availability_rules_public_read on public.availability_rules for select to anon
using (
  is_active and exists (
    select 1 from public.beauty_spaces bs
    where bs.id = space_id and bs.status = 'published' and bs.is_active
  )
);
create policy availability_rules_authenticated_read on public.availability_rules for select to authenticated
using (
  (is_active and exists (
    select 1 from public.beauty_spaces bs
    where bs.id = space_id and bs.status = 'published' and bs.is_active
  )) or (select private.is_space_member(space_id))
);
create policy availability_rules_insert_managers on public.availability_rules for insert to authenticated
with check ((select private.can_manage_space(space_id)));
create policy availability_rules_update_managers on public.availability_rules for update to authenticated
using ((select private.can_manage_space(space_id)))
with check ((select private.can_manage_space(space_id)));
create policy availability_rules_delete_managers on public.availability_rules for delete to authenticated
using ((select private.can_manage_space(space_id)));

create policy availability_exceptions_public_read on public.availability_exceptions for select to anon
using (exists (
  select 1 from public.beauty_spaces bs
  where bs.id = space_id and bs.status = 'published' and bs.is_active
));
create policy availability_exceptions_authenticated_read on public.availability_exceptions for select to authenticated
using (
  exists (
    select 1 from public.beauty_spaces bs
    where bs.id = space_id and bs.status = 'published' and bs.is_active
  ) or (select private.is_space_member(space_id))
);
create policy availability_exceptions_insert_managers on public.availability_exceptions for insert to authenticated
with check ((select private.can_manage_space(space_id)));
create policy availability_exceptions_update_managers on public.availability_exceptions for update to authenticated
using ((select private.can_manage_space(space_id)))
with check ((select private.can_manage_space(space_id)));
create policy availability_exceptions_delete_managers on public.availability_exceptions for delete to authenticated
using ((select private.can_manage_space(space_id)));

create policy appointments_select_participants on public.appointments for select to authenticated
using (
  customer_id = (select auth.uid())
  or (select private.is_space_member(space_id))
  or (select private.has_platform_role('platform_admin'))
);
create policy appointments_insert_customer on public.appointments for insert to authenticated
with check (
  customer_id = (select auth.uid())
  and status = 'pending'
  and starts_at > now()
  and exists (
    select 1 from public.beauty_spaces bs
    where bs.id = space_id and bs.status = 'published' and bs.is_active
  )
);
create policy appointments_cancel_customer on public.appointments for update to authenticated
using (customer_id = (select auth.uid()) and status in ('pending', 'confirmed'))
with check (
  customer_id = (select auth.uid())
  and status = 'cancelled'
  and cancelled_at is not null
  and cancelled_by = (select auth.uid())
);
create policy appointments_update_team on public.appointments for update to authenticated
using ((select private.is_space_member(space_id)))
with check ((select private.is_space_member(space_id)));

create policy appointment_items_select_participants on public.appointment_items for select to authenticated
using (exists (
  select 1
  from public.appointments a
  where a.id = appointment_id
    and (a.customer_id = (select auth.uid()) or (select private.is_space_member(a.space_id)))
));
create policy appointment_items_insert_customer on public.appointment_items for insert to authenticated
with check (
  exists (
    select 1
    from public.appointments a
    where a.id = appointment_id
      and a.space_id = space_id
      and a.customer_id = (select auth.uid())
      and a.status = 'pending'
  )
  and exists (
    select 1
    from public.services s
    where s.id = service_id and s.space_id = space_id and s.status = 'active'
  )
);

create policy favorites_select_own on public.favorites for select to authenticated
using (user_id = (select auth.uid()));
create policy favorites_insert_own on public.favorites for insert to authenticated
with check (user_id = (select auth.uid()));
create policy favorites_update_own on public.favorites for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy favorites_delete_own on public.favorites for delete to authenticated
using (user_id = (select auth.uid()));

create policy reviews_public_read on public.reviews for select to anon
using (
  status = 'published' and exists (
    select 1 from public.beauty_spaces bs
    where bs.id = space_id and bs.status = 'published' and bs.is_active
  )
);
create policy reviews_authenticated_read on public.reviews for select to authenticated
using (
  status = 'published'
  or customer_id = (select auth.uid())
  or (select private.is_space_member(space_id))
  or (select private.has_platform_role('platform_admin'))
);
create policy reviews_insert_completed_customer on public.reviews for insert to authenticated
with check (
  customer_id = (select auth.uid())
  and status = 'published'
  and exists (
    select 1 from public.appointments a
    where a.id = appointment_id
      and a.customer_id = (select auth.uid())
      and a.space_id = space_id
      and a.status = 'completed'
  )
);
create policy reviews_delete_own on public.reviews for delete to authenticated
using (customer_id = (select auth.uid()) or (select private.has_platform_role('platform_admin')));

create policy review_responses_public_read on public.review_responses for select to anon
using (exists (
  select 1 from public.reviews r
  where r.id = review_id and r.status = 'published'
));
create policy review_responses_authenticated_read on public.review_responses for select to authenticated
using (
  exists (
    select 1 from public.reviews r
    where r.id = review_id and r.status = 'published'
  ) or (select private.is_space_member(space_id))
);
create policy review_responses_insert_team on public.review_responses for insert to authenticated
with check ((select private.can_manage_space(space_id)));
create policy review_responses_update_team on public.review_responses for update to authenticated
using ((select private.can_manage_space(space_id)))
with check ((select private.can_manage_space(space_id)));
create policy review_responses_delete_team on public.review_responses for delete to authenticated
using ((select private.can_manage_space(space_id)));

create policy portfolio_items_public_read on public.portfolio_items for select to anon
using (
  is_published and exists (
    select 1 from public.beauty_spaces bs
    where bs.id = space_id and bs.status = 'published' and bs.is_active
  )
);
create policy portfolio_items_authenticated_read on public.portfolio_items for select to authenticated
using (
  (is_published and exists (
    select 1 from public.beauty_spaces bs
    where bs.id = space_id and bs.status = 'published' and bs.is_active
  )) or (select private.is_space_member(space_id))
);
create policy portfolio_items_insert_team on public.portfolio_items for insert to authenticated
with check ((select private.can_manage_space(space_id)));
create policy portfolio_items_update_team on public.portfolio_items for update to authenticated
using ((select private.can_manage_space(space_id)))
with check ((select private.can_manage_space(space_id)));
create policy portfolio_items_delete_team on public.portfolio_items for delete to authenticated
using ((select private.can_manage_space(space_id)));

create policy notifications_select_own on public.notifications for select to authenticated
using (user_id = (select auth.uid()));
create policy notifications_update_own on public.notifications for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy notifications_delete_own on public.notifications for delete to authenticated
using (user_id = (select auth.uid()));

-- Public media bucket. Paths are namespaced as profiles/<user-id>/... or spaces/<space-id>/....
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'beauty-public',
  'beauty-public',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy beauty_public_media_read
on storage.objects for select to anon, authenticated
using (bucket_id = 'beauty-public');

create policy beauty_public_media_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'beauty-public'
  and (
    (
      (storage.foldername(name))[1] = 'profiles'
      and (storage.foldername(name))[2] = (select auth.uid())::text
    )
    or (
      (storage.foldername(name))[1] = 'spaces'
      and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      and (select private.can_manage_space(
        case
          when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then (storage.foldername(name))[2]::uuid
          else null
        end
      ))
    )
  )
);

create policy beauty_public_media_update
on storage.objects for update to authenticated
using (
  bucket_id = 'beauty-public'
  and (
    ((storage.foldername(name))[1] = 'profiles' and (storage.foldername(name))[2] = (select auth.uid())::text)
    or (
      (storage.foldername(name))[1] = 'spaces'
      and (select private.can_manage_space(
        case
          when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then (storage.foldername(name))[2]::uuid
          else null
        end
      ))
    )
  )
)
with check (
  bucket_id = 'beauty-public'
  and (
    ((storage.foldername(name))[1] = 'profiles' and (storage.foldername(name))[2] = (select auth.uid())::text)
    or (
      (storage.foldername(name))[1] = 'spaces'
      and (select private.can_manage_space(
        case
          when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then (storage.foldername(name))[2]::uuid
          else null
        end
      ))
    )
  )
);

create policy beauty_public_media_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'beauty-public'
  and (
    ((storage.foldername(name))[1] = 'profiles' and (storage.foldername(name))[2] = (select auth.uid())::text)
    or (
      (storage.foldername(name))[1] = 'spaces'
      and (select private.can_manage_space(
        case
          when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then (storage.foldername(name))[2]::uuid
          else null
        end
      ))
    )
  )
);

insert into public.categories (slug, name, description, icon, sort_order)
values
  ('cabelos', 'Cabelos', 'Cortes, escovas, tratamentos e coloração.', 'sparkles', 10),
  ('unhas', 'Unhas', 'Manicure, pedicure, alongamento e nail art.', 'hand', 20),
  ('maquiagem', 'Maquiagem', 'Produções sociais, noivas e maquiagem profissional.', 'palette', 30),
  ('sobrancelhas', 'Sobrancelhas e cílios', 'Design, micropigmentação e extensão de cílios.', 'eye', 40),
  ('estetica', 'Estética', 'Cuidados faciais, corporais e bem-estar.', 'flower', 50),
  ('depilacao', 'Depilação', 'Depilação com cera, linha e tecnologias especializadas.', 'wand', 60),
  ('massagem', 'Massagem e spa', 'Relaxamento, drenagem e experiências de spa.', 'heart', 70),
  ('noivas', 'Noivas e eventos', 'Pacotes completos para ocasiões especiais.', 'crown', 80)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  is_active = true;

comment on schema private is 'Internal Beauty Hub helpers; not exposed through the Data API.';
comment on table public.beauty_spaces is 'Beauty salons, studios, spas, clinics and independent professionals.';
comment on table public.space_members is 'Role and public professional profile inside a Beauty Hub space.';
comment on table public.appointments is 'Appointment header. Service snapshots live in appointment_items.';
comment on function public.create_booking(uuid, uuid, timestamptz, text, jsonb) is
  'Creates one appointment and immutable service snapshots in a single transaction.';

commit;


