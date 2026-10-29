begin;

-- Capacity is modeled per professional in this version. Requiring assignment
-- guarantees the exclusion constraint protects every active booking.
alter table public.appointments
  alter column professional_member_id set not null;

-- A response follows the visibility of its review and space. The customer who
-- wrote the review may still read its response after a space leaves the catalog.
drop policy if exists review_responses_public_read on public.review_responses;
create policy review_responses_public_read on public.review_responses for select to anon
using (
  exists (
    select 1
    from public.reviews r
    join public.beauty_spaces bs on bs.id = r.space_id
    where r.id = review_id
      and r.status = 'published'
      and bs.status = 'published'
      and bs.is_active
  )
);

drop policy if exists review_responses_authenticated_read on public.review_responses;
create policy review_responses_authenticated_read on public.review_responses for select to authenticated
using (
  exists (
    select 1
    from public.reviews r
    left join public.beauty_spaces bs on bs.id = r.space_id
    where r.id = review_id
      and (
        (
          r.status = 'published'
          and bs.status = 'published'
          and bs.is_active
        )
        or r.customer_id = (select auth.uid())
      )
  )
  or (select private.is_space_member(space_id))
  or (select private.has_platform_role('platform_admin'))
);

commit;


