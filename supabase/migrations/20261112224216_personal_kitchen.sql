-- Additive migration: preserves the shared library and legacy favourites.
begin;
create table public.kitchen_records (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('favourite','recipe','entry','history','collection','meal','grocery','profile')),
  id text not null check (length(id) between 1 and 240),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 524288),
  version bigint not null default 1 check (version > 0),
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, id)
);
alter table public.kitchen_records enable row level security;
create policy kitchen_owner on public.kitchen_records for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.kitchen_records from anon;
grant select, insert, update on public.kitchen_records to authenticated;
-- Tombstones retain versions so stale edits cannot resurrect deleted records.
create function public.save_kitchen_records(changes jsonb)
returns setof public.kitchen_records language plpgsql security invoker set search_path = '' as $$
declare
  change jsonb;
  saved public.kitchen_records;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if jsonb_typeof(changes) <> 'array' or jsonb_array_length(changes) > 1000 then raise exception 'Invalid changes'; end if;
  for change in select value from jsonb_array_elements(changes) order by value->>'kind', value->>'id' loop
    insert into public.kitchen_records as existing (user_id, kind, id, data, deleted, version)
      select auth.uid(), change->>'kind', change->>'id', coalesce(change->'data','{}'::jsonb), coalesce((change->>'deleted')::boolean,false), 1
      where (change->>'expected_version')::bigint = 0
      on conflict do nothing returning * into saved;
    if saved.user_id is null then
      update public.kitchen_records set data = coalesce(change->'data','{}'::jsonb),
        deleted = coalesce((change->>'deleted')::boolean,false), version = version + 1, updated_at = now()
      where user_id = auth.uid() and kind = change->>'kind' and id = change->>'id'
        and version = (change->>'expected_version')::bigint
      returning * into saved;
      if saved.user_id is null then
        raise exception 'This item changed on another device. Review the latest version before saving again.' using errcode = '40001';
      end if;
    end if;
    return next saved;
    saved := null;
  end loop;
end $$;
create function public.import_kitchen_guest(records jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if jsonb_typeof(records) <> 'array' or jsonb_array_length(records) > 10000 then raise exception 'Invalid import'; end if;
  -- A single transaction. Existing account records and tombstones always win.
  insert into public.kitchen_records(user_id, kind, id, data)
    select auth.uid(), r->>'kind', r->>'id', r->'data' from jsonb_array_elements(records) r
    on conflict (user_id, kind, id) do nothing;
end $$;
revoke all on function public.save_kitchen_records(jsonb) from public, anon;
revoke all on function public.import_kitchen_guest(jsonb) from public, anon;
grant execute on function public.save_kitchen_records(jsonb) to authenticated;
grant execute on function public.import_kitchen_guest(jsonb) to authenticated;
-- Copy existing account favourites once without changing their original table.
do $$ begin
  if to_regclass('public.recipe_favourites') is not null then
    insert into public.kitchen_records(user_id,kind,id,data)
      select user_id,'favourite',recipe_id,'{}'::jsonb from public.recipe_favourites
      on conflict do nothing;
  end if;
end $$;
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('kitchen-photos','kitchen-photos',false,8388608,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
create policy kitchen_photo_read on storage.objects for select to authenticated
  using (bucket_id = 'kitchen-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy kitchen_photo_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'kitchen-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy kitchen_photo_delete on storage.objects for delete to authenticated
  using (bucket_id = 'kitchen-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
commit;
