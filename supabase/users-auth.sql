begin;

alter table public.users
  add column if not exists auth_user_id uuid
  references auth.users (id) on delete cascade;

alter table public.users
  alter column password_hash drop not null,
  alter column first_name set default '',
  alter column last_name set default '',
  alter column role set default 'learner';

create unique index if not exists users_auth_user_id_uidx
  on public.users (auth_user_id)
  where auth_user_id is not null;

create unique index if not exists users_user_name_lower_uidx
  on public.users (lower(user_name))
  where user_name is not null and btrim(user_name) <> '';

update public.users as profile
set auth_user_id = auth_user.id,
    user_name = coalesce(
      nullif(btrim(auth_user.raw_user_meta_data ->> 'user_name'), ''),
      profile.user_name
    ),
    password_hash = null
from auth.users as auth_user
where lower(profile.email) = lower(auth_user.email)
  and profile.auth_user_id is null;

alter table public.users enable row level security;

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'users'
  loop
    execute format('drop policy %I on public.users', existing_policy.policyname);
  end loop;
end
$$;

create policy "Users can read their own profile"
  on public.users for select to authenticated
  using (auth.uid() = auth_user_id);

revoke all privileges on table public.users from anon, authenticated;
grant select on table public.users to authenticated;

create or replace function public.sync_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
begin
  profile_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'user_name'), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );

  update public.users as profile
  set auth_user_id = new.id,
      user_name = profile_name,
      email = new.email,
      password_hash = null,
      role = coalesce(profile.role, 'learner')
  where lower(profile.email) = lower(new.email)
    and profile.auth_user_id is null;

  if not found then
    insert into public.users
      (auth_user_id, user_name, first_name, last_name, email, password_hash, role)
    values
      (new.id, profile_name, profile_name, '', new.email, null, 'learner');
  end if;

  return new;
end;
$$;

revoke all privileges on function public.sync_auth_user_profile()
  from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.sync_auth_user_profile();

commit;
