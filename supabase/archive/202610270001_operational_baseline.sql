-- Bootstrap for a verified empty Beauty Hub schema only. Never overwrite an existing deployment.
begin;
do $$ begin
  if to_regclass('public.beauty_spaces') is not null or to_regclass('public.profiles') is not null then
    raise exception 'Existing Beauty Hub schema detected. Audit and reconcile before applying this baseline.';
  end if;
end $$;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check(length(display_name) between 1 and 120), phone_e164 text,
 city text, state_code text, bio text, avatar_path text, preferences jsonb not null default '{}',
 created_at timestamptz not null default now()
);
create table public.user_roles (
 user_id uuid references public.profiles(id) on delete cascade,
 role text check(role in ('customer','professional')), primary key(user_id,role)
);
create table public.beauty_spaces (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id),
 name text not null check(length(name) between 2 and 120), slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 kind text not null default 'salon', description text not null default '', city text not null, state_code text not null,
 address text not null default '', phone text not null default '', timezone text not null default 'America/Sao_Paulo',
 cover_path text, logo_path text, is_published boolean not null default false,
 verification_status text not null default 'unverified', rating numeric not null default 0, review_count integer not null default 0,
 created_at timestamptz not null default now(), unique(owner_id)
);
create table public.categories (
 id uuid primary key default gen_random_uuid(), slug text unique not null, name text not null,
 description text, icon text, sort_order integer not null default 0
);
insert into public.categories(slug,name,sort_order) values ('hair','Cabelo',1),('nails','Unhas',2),('brows','Sobrancelhas',3),('makeup','Maquiagem',4),('wellness','Bem-estar',5);
create table public.space_categories(space_id uuid references public.beauty_spaces(id) on delete cascade,category_id uuid references public.categories(id),primary key(space_id,category_id));
create table public.services (
 id uuid primary key default gen_random_uuid(), space_id uuid not null references public.beauty_spaces(id), category_id uuid references public.categories(id),
 name text not null check(length(name) between 2 and 120), description text not null default '',
 duration_minutes integer not null check(duration_minutes between 5 and 480), price numeric(12,2) not null check(price>=0),
 deposit_amount numeric not null default 0, is_featured boolean not null default false, is_active boolean not null default true
);
create table public.space_members (
 id uuid primary key default gen_random_uuid(),space_id uuid not null references public.beauty_spaces(id),
 display_name text not null check(length(display_name) between 2 and 120),professional_title text not null default '',bio text,avatar_path text,
 is_active boolean not null default true,is_bookable boolean not null default true
);
create table public.availability_rules (
 id uuid primary key default gen_random_uuid(),space_id uuid not null references public.beauty_spaces(id),member_id uuid references public.space_members(id),
 weekday integer not null check(weekday between 0 and 6),start_time time not null,end_time time not null,
 is_active boolean not null default true,check(end_time>start_time)
);
create table public.availability_exceptions (
 id uuid primary key default gen_random_uuid(),space_id uuid not null references public.beauty_spaces(id),member_id uuid references public.space_members(id),
 starts_at timestamptz not null,ends_at timestamptz not null,check(ends_at>starts_at)
);
create table public.appointments (
 id uuid primary key default gen_random_uuid(),space_id uuid not null references public.beauty_spaces(id),customer_id uuid not null references public.profiles(id),
 professional_member_id uuid not null references public.space_members(id), starts_at timestamptz not null, ends_at timestamptz not null,
 status text not null default 'confirmed' check(status in ('confirmed','completed','cancelled','no_show')),
 total_price numeric(12,2) not null,customer_notes text,cancelled_at timestamptz,cancelled_by uuid references public.profiles(id),
 created_at timestamptz not null default now(),check(ends_at>starts_at)
);
create index appointments_member_time on public.appointments(professional_member_id,starts_at,ends_at);
create table public.appointment_items (
 id uuid primary key default gen_random_uuid(),appointment_id uuid not null references public.appointments(id),service_id uuid not null references public.services(id),
 name text not null,price numeric(12,2) not null,duration_minutes integer not null,quantity integer not null default 1 check(quantity=1)
);
create table public.favorites(user_id uuid references public.profiles(id) on delete cascade,space_id uuid references public.beauty_spaces(id),primary key(user_id,space_id));
create table public.reviews (
 id uuid primary key default gen_random_uuid(),appointment_id uuid not null unique references public.appointments(id),space_id uuid not null references public.beauty_spaces(id),
 customer_id uuid not null references public.profiles(id),rating integer not null check(rating between 1 and 5),comment text not null check(length(comment)<=2000),created_at timestamptz not null default now()
);
create function public.beauty_owns(p_space uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.beauty_spaces where id=p_space and owner_id=auth.uid());
$$;
create function public.beauty_visible(p_space uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.beauty_spaces where id=p_space and (is_published or owner_id=auth.uid()));
$$;
create function public.beauty_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,display_name,phone_e164) values(new.id,left(coalesce(nullif(new.raw_user_meta_data->>'full_name',''),'Minha conta'),120),new.raw_user_meta_data->>'phone_e164');
 insert into public.user_roles values(new.id,'customer');
 if new.raw_user_meta_data->>'account_type' in ('professional','both') then insert into public.user_roles values(new.id,'professional'); end if;
 return new;
end $$;
create trigger beauty_new_user after insert on auth.users for each row execute function public.beauty_new_user();

alter table public.profiles enable row level security;
create policy own_profile on public.profiles for select to authenticated using(id=auth.uid());
create policy update_profile on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
grant select on public.profiles to authenticated;
grant update(display_name,phone_e164,city,state_code,bio,avatar_path,preferences) on public.profiles to authenticated;
alter table public.user_roles enable row level security;
create policy own_roles on public.user_roles for select to authenticated using(user_id=auth.uid());
grant select on public.user_roles to authenticated;
alter table public.beauty_spaces enable row level security;
create policy public_spaces on public.beauty_spaces for select to anon,authenticated using(is_published or owner_id=auth.uid());
create policy own_spaces_insert on public.beauty_spaces for insert to authenticated with check(owner_id=auth.uid() and exists(select 1 from public.user_roles where user_id=auth.uid() and role='professional'));
create policy own_spaces_update on public.beauty_spaces for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
grant select on public.beauty_spaces to anon,authenticated;
grant insert(owner_id,name,slug,kind,description,city,state_code,address,phone),update(name,slug,kind,description,city,state_code,address,phone,is_published) on public.beauty_spaces to authenticated;
alter table public.categories enable row level security;
create policy public_categories on public.categories for select to anon,authenticated using(true);
grant select on public.categories to anon,authenticated;
do $$ declare t text; begin
 foreach t in array array['services','space_members','availability_rules','availability_exceptions','space_categories'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy public_read on public.%I for select to anon,authenticated using(public.beauty_visible(space_id))',t);
  execute format('create policy owner_write on public.%I for all to authenticated using(public.beauty_owns(space_id)) with check(public.beauty_owns(space_id))',t);
  execute format('grant select on public.%I to anon,authenticated',t);
  execute format('grant insert,update,delete on public.%I to authenticated',t);
 end loop;
end $$;
alter table public.appointments enable row level security;
create policy own_appointments on public.appointments for select to authenticated using(customer_id=auth.uid() or public.beauty_owns(space_id));
grant select on public.appointments to authenticated;
alter table public.appointment_items enable row level security;
create policy own_items on public.appointment_items for select to authenticated using(exists(select 1 from public.appointments a where a.id=appointment_id));
grant select on public.appointment_items to authenticated;
alter table public.favorites enable row level security;
create policy own_favorites on public.favorites for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and public.beauty_visible(space_id));
grant select,insert,delete on public.favorites to authenticated;
alter table public.reviews enable row level security;
create policy public_reviews on public.reviews for select to anon,authenticated using(public.beauty_visible(space_id));
create policy verified_review on public.reviews for insert to authenticated with check(customer_id=auth.uid() and exists(select 1 from public.appointments a where a.id=appointment_id and a.space_id=reviews.space_id and a.customer_id=auth.uid() and a.status='completed'));
grant select on public.reviews to anon,authenticated;
grant insert(appointment_id,space_id,customer_id,rating,comment) on public.reviews to authenticated;
create function public.beauty_review_rating() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.beauty_spaces set rating=(select avg(rating) from public.reviews where space_id=new.space_id),review_count=(select count(*) from public.reviews where space_id=new.space_id) where id=new.space_id;
 return new;
end $$;
create trigger beauty_review_rating after insert on public.reviews for each row execute function public.beauty_review_rating();

-- Availability exposes timestamps only, never another customer's appointment data.
create function public.beauty_slots(p_space_id uuid,p_member_id uuid,p_day date,p_service_ids uuid[],p_ignore uuid default null)
returns table(starts_at timestamptz) language plpgsql stable security definer set search_path='' as $$
declare mins integer; n integer; tz text;
begin
 if p_day<current_date-1 or p_day>current_date+120 or cardinality(p_service_ids) not between 1 and 20 then return; end if;
 select timezone into tz from public.beauty_spaces where id=p_space_id and is_published;
 if tz is null or not exists(select 1 from public.space_members where id=p_member_id and space_id=p_space_id and is_active and is_bookable) then return; end if;
 select sum(duration_minutes),count(*) into mins,n from public.services where id=any(p_service_ids) and space_id=p_space_id and is_active;
 if n<>cardinality(p_service_ids) then return; end if;
 if p_ignore is not null and not exists(select 1 from public.appointments where id=p_ignore and customer_id=auth.uid() and status='confirmed') then return; end if;
 return query select distinct slot from public.availability_rules r
 cross join lateral generate_series((p_day+r.start_time) at time zone tz,((p_day+r.end_time) at time zone tz)-make_interval(mins=>mins),interval '15 minutes') slot
 where r.space_id=p_space_id and (r.member_id is null or r.member_id=p_member_id) and r.is_active and r.weekday=extract(dow from p_day)
 and slot>now()+interval '15 minutes'
 and not exists(select 1 from public.appointments a where a.professional_member_id=p_member_id and a.status in ('confirmed','completed') and (p_ignore is null or a.id<>p_ignore) and tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(slot,slot+make_interval(mins=>mins),'[)'))
 and not exists(select 1 from public.availability_exceptions e where e.space_id=p_space_id and (e.member_id is null or e.member_id=p_member_id) and tstzrange(e.starts_at,e.ends_at,'[)') && tstzrange(slot,slot+make_interval(mins=>mins),'[)')) order by slot;
end $$;
create function public.beauty_book(p_space_id uuid,p_member_id uuid,p_starts_at timestamptz,p_service_ids uuid[],p_notes text default '',p_reschedule uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare bid uuid; tz text; mins integer; amount numeric;
begin
 if auth.uid() is null then raise exception 'Entre na sua conta para agendar.'; end if;
 -- One member row serializes all writes for that calendar, including rescheduling.
 perform 1 from public.space_members where id=p_member_id and space_id=p_space_id for update;
 if not found then raise exception 'Profissional indisponível.'; end if;
 select timezone into tz from public.beauty_spaces where id=p_space_id;
 if p_reschedule is not null then
  perform 1 from public.appointments where id=p_reschedule and customer_id=auth.uid() and space_id=p_space_id and status='confirmed' and starts_at>now() for update;
  if not found then raise exception 'Este agendamento não pode ser remarcado.'; end if;
 end if;
 if not exists(select 1 from public.beauty_slots(p_space_id,p_member_id,(p_starts_at at time zone tz)::date,p_service_ids,p_reschedule) x where x.starts_at=p_starts_at) then raise exception 'Horário indisponível. Escolha outro horário.'; end if;
 select sum(duration_minutes),sum(price) into mins,amount from public.services where id=any(p_service_ids) and space_id=p_space_id and is_active;
 if p_reschedule is not null then
  update public.appointments set status='cancelled',cancelled_at=now(),cancelled_by=auth.uid() where id=p_reschedule;
 end if;
 insert into public.appointments(space_id,customer_id,professional_member_id,starts_at,ends_at,total_price,customer_notes)
 values(p_space_id,auth.uid(),p_member_id,p_starts_at,p_starts_at+make_interval(mins=>mins),amount,left(p_notes,1000)) returning id into bid;
 insert into public.appointment_items(appointment_id,service_id,name,price,duration_minutes)
 select bid,id,name,price,duration_minutes from public.services where id=any(p_service_ids) and space_id=p_space_id;
 return bid;
end $$;
create function public.beauty_set_status(p_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
declare a public.appointments;
begin
 select * into a from public.appointments where id=p_id for update;
 if auth.uid() is null or a.id is null or not(a.customer_id=auth.uid() or public.beauty_owns(a.space_id)) then raise exception 'Acesso negado.'; end if;
 if a.status<>'confirmed' or p_status not in ('cancelled','completed','no_show') then raise exception 'Transição de status inválida.'; end if;
 if p_status<>'cancelled' and (not public.beauty_owns(a.space_id) or a.ends_at>now()) then raise exception 'Aguarde o fim do atendimento.'; end if;
 if p_status='cancelled' and a.starts_at<=now() and not public.beauty_owns(a.space_id) then raise exception 'O atendimento já começou. Fale com o espaço.'; end if;
 update public.appointments set status=p_status,cancelled_at=case when p_status='cancelled' then now() end,cancelled_by=case when p_status='cancelled' then auth.uid() end where id=p_id;
end $$;
create function public.beauty_save_hours(p_space_id uuid,p_weekdays integer[],p_start time,p_end time) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.beauty_owns(p_space_id) then raise exception 'Acesso negado.'; end if;
 if cardinality(p_weekdays)<1 or p_start>=p_end then raise exception 'Defina os dias e um intervalo válido.'; end if;
 delete from public.availability_rules where space_id=p_space_id and member_id is null;
 insert into public.availability_rules(space_id,weekday,start_time,end_time) select p_space_id,weekday_value,p_start,p_end from (select distinct unnest(p_weekdays) as weekday_value) d;
end $$;
revoke all on function public.beauty_new_user(),public.beauty_review_rating() from public,anon,authenticated;
revoke all on function public.beauty_owns(uuid),public.beauty_visible(uuid),public.beauty_slots(uuid,uuid,date,uuid[],uuid),public.beauty_book(uuid,uuid,timestamptz,uuid[],text,uuid),public.beauty_set_status(uuid,text),public.beauty_save_hours(uuid,integer[],time,time) from public,anon,authenticated;
grant execute on function public.beauty_owns(uuid),public.beauty_visible(uuid),public.beauty_slots(uuid,uuid,date,uuid[],uuid) to anon,authenticated;
grant execute on function public.beauty_book(uuid,uuid,timestamptz,uuid[],text,uuid),public.beauty_set_status(uuid,text),public.beauty_save_hours(uuid,integer[],time,time) to authenticated;
commit;
