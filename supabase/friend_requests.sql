-- supabase/friend_requests.sql
-- ─────────────────────────────────────────────────────────────
-- คำขอเป็นเพื่อน: ส่งคำขอ → อีกฝ่ายตอบรับ → เป็นเพื่อนกันทั้งสองฝั่ง
--
-- วิธีใช้: Supabase Dashboard → SQL Editor → New query → วางทั้งไฟล์ → Run
--          ต้องรัน friends.sql มาก่อน (ใช้ตาราง friends และ view public_profiles) / รันซ้ำได้ ไม่พัง
--
-- ── เปลี่ยนจากเดิมยังไง ──
-- friends.sql เดิมเป็น "เพิ่มฝ่ายเดียว" (กดแล้วเป็นเพื่อนทันที อีกฝ่ายไม่รู้เรื่อง)
-- ไฟล์นี้เปลี่ยนเป็นแบบขอก่อน: ตาราง friends ยังใช้เหมือนเดิม แต่จะมีแถวได้
-- ก็ต่อเมื่ออีกฝ่ายตอบรับแล้วเท่านั้น และเป็นคู่เสมอ (A→B กับ B→A)
-- my_friends ของเดิมจึงใช้ต่อได้โดยไม่ต้องแก้
--
-- แถวเพิ่มเพื่อนฝ่ายเดียวที่มีอยู่ก่อน ถูกย้ายไปเป็น "คำขอที่รอตอบ" แทน
-- (ไม่ถือว่าเป็นเพื่อนกันเอง เพราะอีกฝ่ายยังไม่เคยตกลง)
--
-- ── ทำไมทุกอย่างผ่านฟังก์ชัน ไม่ให้เขียนตารางตรง ๆ ──
-- การตอบรับต้องเขียนสองแถวใน friends + ลบคำขอ พร้อมกันในคำสั่งเดียว
-- ถ้าให้เครื่องผู้เล่นเขียนเอง ใครก็แทรกแถวเพื่อนเข้าไปได้โดยไม่ต้องมีคนตอบรับ
--
-- คำตอบของทุกฟังก์ชันเป็นคำสั้น ๆ ให้เกมเลือกข้อความเอง (ดู src/friends.js)
-- ─────────────────────────────────────────────────────────────

create table if not exists public.friend_requests (
  from_id    uuid        not null references public.players on delete cascade,
  to_id      uuid        not null references public.players on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id),
  check (from_id <> to_id)
);

create index if not exists friend_requests_to on public.friend_requests (to_id);

alter table public.friend_requests enable row level security;

drop policy if exists "อ่านคำขอที่เกี่ยวกับตัวเอง" on public.friend_requests;
create policy "อ่านคำขอที่เกี่ยวกับตัวเอง" on public.friend_requests
  for select using (auth.uid() = from_id or auth.uid() = to_id);

-- อ่านได้อย่างเดียว เขียนผ่านฟังก์ชันข้างล่างเท่านั้น
revoke all on public.friend_requests from anon, authenticated;
grant select on public.friend_requests to authenticated;

-- ── ปิดทางเพิ่มเพื่อนตรง ๆ ของเดิม ──
drop policy if exists "เพิ่มเพื่อนได้ในชื่อตัวเอง" on public.friends;

-- ย้ายแถวฝ่ายเดียวไปเป็นคำขอ
insert into public.friend_requests (from_id, to_id, created_at)
  select f.player_id, f.friend_id, f.created_at
  from public.friends f
  where not exists (
    select 1 from public.friends r
    where r.player_id = f.friend_id and r.friend_id = f.player_id
  )
on conflict do nothing;

delete from public.friends f
where not exists (
  select 1 from public.friends r
  where r.player_id = f.friend_id and r.friend_id = f.player_id
);

-- เพดานกันสแปม: คำขอค้างที่ส่งออกไป 50 / เพื่อน 200 คน
-- ปรับได้ที่ฟังก์ชันนี้ที่เดียว (เกมไม่ได้เก็บตัวเลขพวกนี้ไว้เอง)
drop function if exists public.friend_limits();
create or replace function public.friend_limit(kind text)
returns int
language sql immutable as $$
  select case kind when 'pending' then 50 else 200 end;
$$;

-- ล็อกตาม "คู่" ไม่ใช่ตามคน — สองคนกดส่งหากันพร้อมกันต้องได้ผลเดียว
create or replace function public.lock_friend_pair(a uuid, b uuid)
returns void
language sql as $$
  select pg_advisory_xact_lock(hashtext(least(a, b)::text || greatest(a, b)::text));
$$;

-- ── สถานะระหว่างเรากับอีกคน ──
--   self / friends / sent (เราขอไปแล้ว) / received (เขาขอมา) / none
create or replace function public.friend_status(p_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare me uuid := auth.uid();
begin
  if me is null then return 'signed_out'; end if;
  if p_id = me then return 'self'; end if;
  if exists (select 1 from friends where player_id = me and friend_id = p_id) then return 'friends'; end if;
  if exists (select 1 from friend_requests where from_id = me and to_id = p_id) then return 'sent'; end if;
  if exists (select 1 from friend_requests where from_id = p_id and to_id = me) then return 'received'; end if;
  return 'none';
end;
$$;

-- ── ส่งคำขอ ──
-- ถ้าอีกฝ่ายขอเรามาก่อนแล้ว = ตอบรับให้เลย (สองคนอยากเป็นเพื่อนกันอยู่แล้ว)
--   sent / accepted / friends / pending (ขอไปแล้ว) / notfound / self / limit / full / signed_out
create or replace function public.send_friend_request(p_to uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare me uuid := auth.uid();
begin
  if me is null then return 'signed_out'; end if;
  if p_to = me then return 'self'; end if;
  if not exists (select 1 from players where id = p_to) then return 'notfound'; end if;

  perform lock_friend_pair(me, p_to);

  if exists (select 1 from friends where player_id = me and friend_id = p_to) then return 'friends'; end if;
  if exists (select 1 from friend_requests where from_id = me and to_id = p_to) then return 'pending'; end if;

  if exists (select 1 from friend_requests where from_id = p_to and to_id = me) then
    if (select count(*) from friends where player_id = me) >= friend_limit('friends') then return 'full'; end if;
    delete from friend_requests where from_id = p_to and to_id = me;
    insert into friends (player_id, friend_id) values (me, p_to), (p_to, me) on conflict do nothing;
    return 'accepted';
  end if;

  if (select count(*) from friend_requests where from_id = me) >= friend_limit('pending') then return 'limit'; end if;
  if (select count(*) from friends where player_id = me) >= friend_limit('friends') then return 'full'; end if;

  insert into friend_requests (from_id, to_id) values (me, p_to);
  return 'sent';
end;
$$;

-- ── ตอบคำขอที่ส่งมาหาเรา ──
--   accepted / declined / gone (คำขอถูกยกเลิกไปแล้ว) / full / signed_out
create or replace function public.respond_friend_request(p_from uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare me uuid := auth.uid();
begin
  if me is null then return 'signed_out'; end if;
  perform lock_friend_pair(me, p_from);

  if not exists (select 1 from friend_requests where from_id = p_from and to_id = me) then
    return 'gone';
  end if;

  if p_accept and (select count(*) from friends where player_id = me) >= friend_limit('friends') then
    return 'full';
  end if;

  delete from friend_requests where from_id = p_from and to_id = me;
  if not p_accept then return 'declined'; end if;

  insert into friends (player_id, friend_id) values (me, p_from), (p_from, me) on conflict do nothing;
  -- ถ้าเราเคยขอเขาไว้ด้วย ก็ไม่ต้องค้างอีกแล้ว
  delete from friend_requests where from_id = me and to_id = p_from;
  return 'accepted';
end;
$$;

-- ── ยกเลิกคำขอที่เราส่งไป ──
create or replace function public.cancel_friend_request(p_to uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return 'signed_out'; end if;
  delete from friend_requests where from_id = auth.uid() and to_id = p_to;
  return 'ok';
end;
$$;

-- ── เลิกเป็นเพื่อน — ลบทั้งสองฝั่ง ──
create or replace function public.remove_friend(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare me uuid := auth.uid();
begin
  if me is null then return 'signed_out'; end if;
  perform lock_friend_pair(me, p_id);
  delete from friends
  where (player_id = me and friend_id = p_id) or (player_id = p_id and friend_id = me);
  return 'ok';
end;
$$;

revoke all on function public.lock_friend_pair(uuid, uuid) from public, anon, authenticated;
grant execute on function public.friend_status(uuid) to authenticated;
grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.cancel_friend_request(uuid) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;

-- ── รายการคำขอ ──
-- security_invoker off เพื่อ join โปรไฟล์ของอีกฝ่ายได้ จึงกรองด้วย auth.uid() ในตัว view เอง
create or replace view public.my_friend_requests_in
with (security_invoker = off) as
  select p.id, p.name, p.friend_code, p.last_seen, p.public_profile, r.created_at
  from public.friend_requests r
  join public.players p on p.id = r.from_id
  where r.to_id = auth.uid();

create or replace view public.my_friend_requests_out
with (security_invoker = off) as
  select p.id, p.name, p.friend_code, p.last_seen, p.public_profile, r.created_at
  from public.friend_requests r
  join public.players p on p.id = r.to_id
  where r.from_id = auth.uid();

revoke all on public.my_friend_requests_in from anon;
revoke all on public.my_friend_requests_out from anon;
grant select on public.my_friend_requests_in to authenticated;
grant select on public.my_friend_requests_out to authenticated;
