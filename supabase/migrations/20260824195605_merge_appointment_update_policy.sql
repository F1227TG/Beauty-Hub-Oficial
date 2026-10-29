begin;
drop policy if exists appointments_cancel_customer on public.appointments;
drop policy if exists appointments_update_team on public.appointments;
create policy appointments_update_participants on public.appointments for update to authenticated using (((customer_id = (select auth.uid())) and status in ('pending','confirmed')) or (select private.is_space_member(space_id))) with check (((customer_id = (select auth.uid())) and status = 'cancelled' and cancelled_at is not null and cancelled_by = (select auth.uid())) or (select private.is_space_member(space_id)));
commit;
