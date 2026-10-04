alter table public.restaurants add column if not exists pos_url text;
alter table public.restaurants add column if not exists subscription_starts_at date;

create table public.restaurant_members (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  app_user_id uuid not null references public.app_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (restaurant_id, app_user_id)
);
grant select, insert, update, delete on public.restaurant_members to authenticated;
grant all on public.restaurant_members to service_role;
alter table public.restaurant_members enable row level security;
create policy "super admin manage members" on public.restaurant_members for all to authenticated
  using (public.has_role(auth.uid(),'super_admin')) with check (public.has_role(auth.uid(),'super_admin'));

-- Existing LamaHamar staff stay linked to LamaHamar Cafe.
insert into public.restaurant_members (restaurant_id, app_user_id)
select r.id, u.id from public.restaurants r cross join public.app_users u
where r.restaurant_code = 'lamahamar-cafe'
on conflict do nothing;