begin;
-- Evolves the existing Beauty database. No data from Barber Hub is accessed.
alter table public.beauty_spaces add column attendance_mode text not null default 'onsite' check(attendance_mode in ('onsite','home','both')),
 add column service_area text not null default '', add column travel_fee numeric(12,2) not null default 0 check(travel_fee>=0),
 add column accessibility_notes text not null default '', add column cancellation_policy text not null default '';
alter table public.services add column pricing_mode text not null default 'fixed' check(pricing_mode in ('fixed','quote'));
alter table public.space_members alter column user_id drop not null;
alter table public.appointments add column attendance_mode text not null default 'onsite' check(attendance_mode in ('onsite','home')),
 add column customer_address text, add column payment_status text not null default 'unpaid' check(payment_status in ('unpaid','paid'));
create table public.quote_requests (
 id uuid primary key default gen_random_uuid(), space_id uuid not null references public.beauty_spaces(id),
 customer_id uuid not null references public.profiles(id), service_id uuid not null references public.services(id),
 description text not null check(length(description) between 5 and 2000), attendance_mode text not null check(attendance_mode in ('onsite','home')),
 status text not null default 'requested' check(status in ('requested','offered','accepted','declined','booked')),
 amount numeric(12,2) check(amount>=0), professional_note text, expires_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index quote_requests_space on public.quote_requests(space_id,created_at desc);
create index quote_requests_customer on public.quote_requests(customer_id,created_at desc);
create index quote_requests_service on public.quote_requests(service_id);
alter table public.appointments add column quote_id uuid unique references public.quote_requests(id);
alter table public.quote_requests enable row level security;
create policy quote_participants on public.quote_requests for select to authenticated using(customer_id=(select auth.uid()) or (select private.can_manage_space(space_id)));
revoke all on public.quote_requests from public,anon,authenticated;
grant select on public.quote_requests to authenticated;
grant all on public.quote_requests to service_role;
grant select(attendance_mode,service_area,travel_fee,accessibility_notes,cancellation_policy) on public.beauty_spaces to anon,authenticated;
grant select(pricing_mode) on public.services to anon,authenticated;

create function private.beauty_active() returns uuid language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=auth.uid(); begin
 if uid is null or not exists(select 1 from public.profiles where id=uid and status='active') then raise exception 'Entre em uma conta ativa para continuar.' using errcode='42501'; end if;
 return uid;
end $$;
create function public.beauty_become_professional() returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.beauty_active(); begin
 insert into public.user_roles(user_id,role,created_by) values(uid,'professional',uid) on conflict do nothing;
end $$;
create function public.beauty_save_business(p_data jsonb,p_id uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.beauty_active(); bid uuid:=p_id; begin
 if p_id is not null and not exists(select 1 from public.beauty_spaces where id=p_id and owner_id=uid and status<>'suspended') then raise exception 'Negócio não disponível para edição.'; end if;
 if coalesce(length(trim(p_data->>'name')),0)<2 or coalesce(length(trim(p_data->>'city')),0)<2 then raise exception 'Informe nome e cidade do negócio.'; end if;
 if p_id is null then
  perform public.beauty_become_professional();
  if (select count(*) from public.beauty_spaces where owner_id=uid)>=5 then raise exception 'Limite de negócios atingido.'; end if;
  insert into public.beauty_spaces(owner_id,name,slug,city,state_code,kind)
  values(uid,trim(p_data->>'name'),'beauty-'||replace(gen_random_uuid()::text,'-',''),trim(p_data->>'city'),upper(p_data->>'state_code'),coalesce(p_data->>'kind','independent')) returning id into bid;
  update public.space_members set is_bookable=true where space_id=bid and user_id=uid;
 end if;
 update public.beauty_spaces set name=trim(p_data->>'name'),description=left(coalesce(p_data->>'description',''),3000),city=trim(p_data->>'city'),state_code=upper(p_data->>'state_code'),
 kind=coalesce(p_data->>'kind','independent'),address_line=left(coalesce(p_data->>'address_line',''),300),
 phone_e164=nullif(p_data->>'phone_e164',''),attendance_mode=coalesce(p_data->>'attendance_mode','onsite'),
 service_area=left(coalesce(p_data->>'service_area',''),1000),travel_fee=coalesce((p_data->>'travel_fee')::numeric,0),
 accessibility_notes=left(coalesce(p_data->>'accessibility_notes',''),1500),cancellation_policy=left(coalesce(p_data->>'cancellation_policy',''),1500),
 status=case when p_data->>'status'='published' then 'published' else 'draft' end
 where id=bid;
 return bid;
end $$;
create function public.beauty_save_service(p_space uuid,p_data jsonb,p_id uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.beauty_active(); sid uuid:=p_id; begin
 if not private.can_manage_space(p_space) then raise exception 'Acesso negado.'; end if;
 if p_id is not null and not exists(select 1 from public.services where id=p_id and space_id=p_space) then raise exception 'Serviço não encontrado.'; end if;
 if p_id is null then
  insert into public.services(space_id,category_id,name,duration_minutes,price) values(p_space,(p_data->>'category_id')::uuid,p_data->>'name',(p_data->>'duration_minutes')::integer,0) returning id into sid;
 end if;
 update public.services set name=trim(p_data->>'name'),description=left(coalesce(p_data->>'description',''),2000),category_id=(p_data->>'category_id')::uuid,
 duration_minutes=(p_data->>'duration_minutes')::integer,pricing_mode=coalesce(p_data->>'pricing_mode','fixed'),
 price=case when p_data->>'pricing_mode'='quote' then 0 else (p_data->>'price')::numeric end,deposit_amount=0,
 status=case when p_data->>'status'='inactive' then 'inactive' else 'active' end where id=sid;
 return sid;
end $$;
create function public.beauty_save_member(p_space uuid,p_data jsonb,p_id uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.beauty_active(); mid uuid:=p_id; begin
 if not private.can_manage_space(p_space) then raise exception 'Acesso negado.'; end if;
 if p_id is not null and not exists(select 1 from public.space_members where id=p_id and space_id=p_space) then raise exception 'Profissional não encontrado.'; end if;
 if p_id is null then insert into public.space_members(space_id,role,display_name,is_bookable) values(p_space,'professional',p_data->>'display_name',true) returning id into mid; end if;
 update public.space_members set display_name=trim(p_data->>'display_name'),professional_title=left(coalesce(p_data->>'professional_title',''),150),
 is_bookable=coalesce((p_data->>'is_bookable')::boolean,true),is_active=coalesce((p_data->>'is_active')::boolean,true) where id=mid;
 return mid;
end $$;
create function public.beauty_save_hours(p_space uuid,p_rules jsonb) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.beauty_active(); begin
 if not private.can_manage_space(p_space) then raise exception 'Acesso negado.'; end if;
 if jsonb_typeof(p_rules)<>'array' or jsonb_array_length(p_rules)>28 then raise exception 'Horários inválidos.'; end if;
 delete from public.availability_rules where space_id=p_space and member_id is null;
 insert into public.availability_rules(space_id,weekday,start_time,end_time) select p_space,(x->>'weekday')::smallint,(x->>'start')::time,(x->>'end')::time from jsonb_array_elements(p_rules)x;
end $$;
create function public.beauty_slots(p_space uuid,p_member uuid,p_service uuid,p_day date) returns table(starts_at timestamptz) language plpgsql stable security definer set search_path='' as $$
declare mins integer; tz text; begin
 if p_day<current_date-1 or p_day>current_date+120 then return; end if;
 select s.duration_minutes,b.timezone into mins,tz from public.services s join public.beauty_spaces b on b.id=s.space_id
 where s.id=p_service and s.space_id=p_space and s.status='active' and b.status='published' and b.is_active;
 if mins is null or not exists(select 1 from public.space_members where id=p_member and space_id=p_space and is_active and is_bookable) then return; end if;
 return query select distinct slot from public.availability_rules r
 cross join lateral generate_series((p_day+r.start_time) at time zone tz,((p_day+r.end_time) at time zone tz)-make_interval(mins=>mins),make_interval(mins=>r.slot_interval_minutes)) slot
 where r.space_id=p_space and (r.member_id is null or r.member_id=p_member) and r.is_active and r.weekday=extract(dow from p_day)
 and (r.valid_from is null or p_day>=r.valid_from) and (r.valid_until is null or p_day<=r.valid_until) and slot>now()+interval '30 minutes'
 and not exists(select 1 from public.appointments a where a.professional_member_id=p_member and a.status in ('pending','confirmed','in_progress') and tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(slot,slot+make_interval(mins=>mins),'[)'))
 and not exists(select 1 from public.availability_exceptions e where e.space_id=p_space and e.kind='blocked' and (e.member_id is null or e.member_id=p_member) and tstzrange(e.starts_at,e.ends_at,'[)') && tstzrange(slot,slot+make_interval(mins=>mins),'[)')) order by slot;
end $$;
create function public.beauty_request_quote(p_space uuid,p_service uuid,p_description text,p_mode text) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.beauty_active(); qid uuid; begin
 if not exists(select 1 from public.services s join public.beauty_spaces b on b.id=s.space_id where s.id=p_service and s.space_id=p_space and s.status='active' and b.status='published' and b.is_active and (b.attendance_mode=p_mode or b.attendance_mode='both')) then raise exception 'Serviço ou modalidade indisponível.'; end if;
 if (select count(*) from public.quote_requests where customer_id=uid and created_at>now()-interval '1 day')>=20 then raise exception 'Limite diário de pedidos atingido.'; end if;
 insert into public.quote_requests(space_id,customer_id,service_id,description,attendance_mode) values(p_space,uid,p_service,trim(p_description),p_mode) returning id into qid;
 return qid;
end $$;
create function public.beauty_quote_action(p_id uuid,p_action text,p_amount numeric default null,p_note text default '') returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.beauty_active(); q public.quote_requests; begin
 select * into q from public.quote_requests where id=p_id for update;
 if q.id is null then raise exception 'Orçamento não encontrado.'; end if;
 if p_action='offer' and private.can_manage_space(q.space_id) and q.status in ('requested','offered') then
  if p_amount is null or p_amount<0 or p_amount>100000 then raise exception 'Informe um valor válido.'; end if;
  update public.quote_requests set amount=p_amount,professional_note=left(p_note,2000),status='offered',expires_at=now()+interval '7 days',updated_at=now() where id=p_id;
 elsif p_action='accept' and q.customer_id=uid and q.status='offered' and q.expires_at>now() then
  update public.quote_requests set status='accepted',updated_at=now() where id=p_id;
 elsif p_action='decline' and q.customer_id=uid and q.status in ('requested','offered','accepted') then
  update public.quote_requests set status='declined',updated_at=now() where id=p_id;
 else raise exception 'Esta ação não está disponível para esse orçamento.'; end if;
end $$;
-- All booking entry points must use the same validated transaction.
revoke execute on function public.create_booking(uuid,uuid,timestamptz,text,jsonb),private.create_booking_internal(uuid,uuid,timestamptz,text,jsonb) from authenticated;
revoke insert,update,delete on public.appointments,public.appointment_items from authenticated;
revoke update(status,cancelled_at,cancelled_by,updated_at) on public.appointments from authenticated;
create function public.beauty_book(p_space uuid,p_member uuid,p_service uuid,p_start timestamptz,p_mode text,p_address text default '',p_notes text default '',p_quote uuid default null,p_reschedule uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.beauty_active(); s public.services; b public.beauty_spaces; q public.quote_requests; bid uuid; amount numeric; old public.appointments; begin
 perform 1 from public.space_members where id=p_member and space_id=p_space for update;
 select * into b from public.beauty_spaces where id=p_space;
 select * into s from public.services where id=p_service and space_id=p_space and status='active';
 if s.id is null or b.status<>'published' or not b.is_active or p_mode not in ('onsite','home') or (b.attendance_mode<>p_mode and b.attendance_mode<>'both') then raise exception 'Serviço ou modalidade indisponível.'; end if;
 if p_mode='home' and length(trim(coalesce(p_address,'')))<10 then raise exception 'Informe o endereço completo do atendimento.'; end if;
 if p_reschedule is not null then
  select * into old from public.appointments where id=p_reschedule and customer_id=uid and space_id=p_space and status in ('pending','confirmed') and starts_at>now() for update;
  if old.id is null or old.quote_id is not null then raise exception 'Este atendimento não permite remarcação direta.'; end if;
  update public.appointments set status='cancelled',cancelled_at=now(),cancelled_by=uid where id=old.id;
 end if;
 if not exists(select 1 from public.beauty_slots(p_space,p_member,p_service,(p_start at time zone b.timezone)::date) x where x.starts_at=p_start) then raise exception 'Horário indisponível. Escolha outro.'; end if;
 amount:=s.price;
 if s.pricing_mode='quote' or p_quote is not null then
  select * into q from public.quote_requests where id=p_quote and space_id=p_space and service_id=p_service and customer_id=uid and attendance_mode=p_mode and status='accepted' and expires_at>now() for update;
  if q.id is null then raise exception 'Aceite um orçamento válido antes de agendar.'; end if;
  amount:=q.amount;
 end if;
 insert into public.appointments(customer_id,space_id,professional_member_id,starts_at,ends_at,status,total_amount,customer_notes,attendance_mode,customer_address,quote_id)
 values(uid,p_space,p_member,p_start,p_start+make_interval(mins=>s.duration_minutes),'confirmed',amount+case when p_mode='home' then b.travel_fee else 0 end,left(p_notes,2000),p_mode,case when p_mode='home' then left(p_address,1000) end,q.id) returning id into bid;
 insert into public.appointment_items(appointment_id,space_id,service_id,professional_member_id,service_name_snapshot,duration_minutes_snapshot,unit_price,quantity)
 values(bid,p_space,p_service,p_member,s.name,s.duration_minutes,amount,1);
 if q.id is not null then update public.quote_requests set status='booked',updated_at=now() where id=q.id; end if;
 return bid;
end $$;
create function public.beauty_appointment_action(p_id uuid,p_action text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.beauty_active(); a public.appointments; manager boolean; begin
 select * into a from public.appointments where id=p_id for update;
 manager:=private.can_manage_space(a.space_id);
 if a.id is null or not(a.customer_id=uid or manager) then raise exception 'Acesso negado.'; end if;
 if p_action='paid' and manager and a.status='completed' then update public.appointments set payment_status='paid' where id=p_id; return; end if;
 if a.status not in ('pending','confirmed','in_progress') then raise exception 'Atendimento já encerrado.'; end if;
 if p_action='cancelled' and (manager or a.starts_at>now()) then
  update public.appointments set status='cancelled',cancelled_at=now(),cancelled_by=uid where id=p_id;
 elsif p_action in ('completed','no_show') and manager and a.ends_at<=now() then update public.appointments set status=p_action where id=p_id;
 else raise exception 'Ação indisponível. Confira o horário do atendimento.'; end if;
end $$;
create function public.beauty_clients(p_space uuid) returns table(id uuid,display_name text,phone_e164 text,visits bigint,total numeric) language plpgsql stable security definer set search_path='' as $$
begin
 perform private.beauty_active();
 if not private.can_manage_space(p_space) then raise exception 'Acesso negado.'; end if;
 return query select p.id,p.display_name,p.phone_e164,count(a.id),coalesce(sum(a.total_amount) filter(where a.status='completed'),0) from public.profiles p join public.appointments a on a.customer_id=p.id where a.space_id=p_space group by p.id,p.display_name,p.phone_e164 order by p.display_name limit 500;
end $$;
-- Presentation fields cannot be used to modify moderation, ratings, ownership or team access.
revoke insert,update,delete on public.beauty_spaces,public.services,public.space_members,public.availability_rules from authenticated;
-- Remove column-level grants as well as table grants on the managed tables.
do $$ declare r record; begin
 for r in select table_name,column_name,privilege_type from information_schema.column_privileges where table_schema='public' and grantee='authenticated' and table_name in ('beauty_spaces','services','space_members','availability_rules') and privilege_type in ('INSERT','UPDATE','REFERENCES') loop
 execute format('revoke %s (%I) on public.%I from authenticated',r.privilege_type,r.column_name,r.table_name);
 end loop;
end $$;
do $$ declare r record; begin
 for r in select p.oid::regprocedure sig,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'beauty_%' loop
 execute format('revoke all on function %s from public,anon,authenticated',r.sig);
 execute format('grant execute on function %s to authenticated',r.sig);
 end loop;
end $$;
grant execute on function public.beauty_slots(uuid,uuid,uuid,date) to anon;
revoke all on function private.beauty_active() from public,anon,authenticated;
commit;
