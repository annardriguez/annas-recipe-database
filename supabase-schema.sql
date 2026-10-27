create table if not exists public.recipe_favourites (
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

alter table public.recipe_favourites enable row level security;

drop policy if exists "Users can read their own recipe favourites." on public.recipe_favourites;
create policy "Users can read their own recipe favourites."
on public.recipe_favourites
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their own recipe favourites." on public.recipe_favourites;
create policy "Users can add their own recipe favourites."
on public.recipe_favourites
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own recipe favourites." on public.recipe_favourites;
create policy "Users can delete their own recipe favourites."
on public.recipe_favourites
for delete
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists recipe_favourites_user_id_idx
on public.recipe_favourites(user_id);
