create table if not exists public.rate_limits (
  bucket text not null,
  identifier_hash text not null,
  window_started_at timestamptz not null,
  window_seconds integer not null check (window_seconds > 0),
  count integer not null default 0 check (count >= 0),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (bucket, identifier_hash)
);

create index if not exists rate_limits_updated_at_idx
  on public.rate_limits (updated_at);

alter table public.rate_limits enable row level security;

create or replace function public.consume_rate_limit(
  p_bucket text,
  p_identifier_hash text,
  p_window_seconds integer,
  p_max_requests integer
)
returns table (
  allowed boolean,
  remaining integer,
  reset_at timestamptz,
  current_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_window_seconds integer := greatest(p_window_seconds, 1);
  v_window_start timestamptz := to_timestamp(
    floor(extract(epoch from v_now) / v_window_seconds) * v_window_seconds
  );
  v_row public.rate_limits;
begin
  insert into public.rate_limits (
    bucket,
    identifier_hash,
    window_started_at,
    window_seconds,
    count,
    updated_at
  )
  values (
    p_bucket,
    p_identifier_hash,
    v_window_start,
    v_window_seconds,
    1,
    v_now
  )
  on conflict (bucket, identifier_hash) do update
  set
    window_started_at = excluded.window_started_at,
    window_seconds = excluded.window_seconds,
    count = case
      when public.rate_limits.window_started_at = excluded.window_started_at
        then public.rate_limits.count + 1
      else 1
    end,
    updated_at = v_now
  returning * into v_row;

  return query
  select
    v_row.count <= p_max_requests,
    greatest(p_max_requests - v_row.count, 0),
    v_row.window_started_at + make_interval(secs => v_window_seconds),
    v_row.count;
end;
$$;

revoke all on public.rate_limits from anon, authenticated;
