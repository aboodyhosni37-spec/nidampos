create type public.app_role as enum ('super_admin','admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "own roles readable" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'super_admin'));

-- First signed-in account may claim Super Admin only while none exists.
create or replace function public.claim_first_super_admin()
returns boolean language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then return false; end if;
  perform pg_advisory_xact_lock(4242);
  if exists (select 1 from public.user_roles where role = 'super_admin') then
    return public.has_role(auth.uid(),'super_admin');
  end if;
  insert into public.user_roles(user_id, role) values (auth.uid(),'super_admin');
  return true;
end $$;
revoke all on function public.claim_first_super_admin() from public, anon;
grant execute on function public.claim_first_super_admin() to authenticated;

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  restaurant_code text not null unique,
  name text not null,
  owner_name text,
  owner_email text,
  phone text,
  address text,
  status text not null default 'active',
  subscription_plan text not null default 'standard',
  subscription_status text not null default 'active',
  subscription_ends_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.restaurants to authenticated;
grant all on public.restaurants to service_role;
alter table public.restaurants enable row level security;
create policy "super admin manage restaurants" on public.restaurants for all to authenticated
  using (public.has_role(auth.uid(),'super_admin')) with check (public.has_role(auth.uid(),'super_admin'));

create or replace function public.validate_restaurant() returns trigger language plpgsql set search_path = public as $$
begin
  if new.status not in ('active','suspended','inactive') then raise exception 'Invalid status'; end if;
  if new.subscription_status not in ('trial','active','past_due','cancelled') then raise exception 'Invalid subscription status'; end if;
  new.updated_at = now();
  return new;
end $$;
create trigger trg_validate_restaurant before insert or update on public.restaurants
  for each row execute function public.validate_restaurant();

insert into public.restaurants (restaurant_code, name, status, subscription_status)
values ('lamahamar-cafe','LamaHamar Cafe','active','active');