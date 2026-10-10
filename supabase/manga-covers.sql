create table if not exists public.manga_covers (
  id text primary key,
  cover_path text not null,
  updated_at timestamptz not null default now()
);

alter table public.manga_covers enable row level security;

drop policy if exists "Public can read manga covers" on public.manga_covers;
create policy "Public can read manga covers"
  on public.manga_covers for select to anon, authenticated
  using (true);

grant select on public.manga_covers to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('manga-covers', 'manga-covers', true)
on conflict (id) do update set public = excluded.public;

insert into public.manga_covers (id, cover_path)
values
  ('love-question', 'Screenshot 2026-10-04 170628.png'),
  ('big', '147156804_p0_master1200.jpg'),
  ('umaru-8', '710k-kYQlOL._AC_UF1000,1000_QL80_.jpg'),
  ('umaru-9', '718K+wn8r5L._AC_UF1000,1000_QL80_.jpg'),
  ('wolf', '81Xm4LXz5kL._UF1000,1000_QL80_.jpg'),
  ('knight-jusco', '2L.jpg')
on conflict (id) do update set
  cover_path = excluded.cover_path,
  updated_at = now();
