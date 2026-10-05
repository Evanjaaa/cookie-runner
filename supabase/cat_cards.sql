-- supabase/cat_cards.sql
-- ─────────────────────────────────────────────────────────────
-- การ์ดส่งต่อน้อง — หาบ้านใหม่ให้ลูกแมว (Lv1-2) กับเพื่อน
--
-- วิธีใช้: Supabase Dashboard → SQL Editor → New query → วางทั้งไฟล์ → Run
--          ต้องรัน friends.sql + friend_requests.sql มาก่อน / รันซ้ำได้ ไม่พัง
--
-- ── ขั้นตอนของการ์ดหนึ่งใบ ──
--   open       ผู้ส่งสร้างการ์ดถึงเพื่อน (น้องยังอยู่บ้านผู้ส่ง ผู้รับไปเยี่ยมดูได้)
--   accepted   ผู้รับกดรับ รอผู้ส่งยืนยัน
--   done       ผู้ส่งยืนยันแล้ว (หรือตั้ง "ส่งให้อัตโนมัติ" ไว้ = ผู้รับกดรับแล้วข้ามมาที่นี่เลย)
--              ผู้ส่งเอาน้องออกจากบ้าน / ผู้รับเอาน้องเข้าบ้าน
--   claimed    ผู้รับรับน้องเข้าบ้านเรียบร้อย
--   declined / cancelled / expired   จบโดยไม่ได้ย้ายบ้าน น้องอยู่กับผู้ส่งต่อ
--
-- การ์ดหมดอายุใน 3 วัน (นับจากตอนส่ง) ถ้ายังไม่ถึง done
--
-- ── ทำไมข้อมูลน้องอยู่ในการ์ด ──
-- น้องแต่ละตัวเก็บในเครื่องผู้เล่น (pref 'cats' ที่ซิงก์ผ่าน players.extra) ไม่มีตารางน้องกลาง
-- การ์ดจึงพกสำเนาน้อง (สายพันธุ์ เพศ หน้า ชื่อ) ไปให้ผู้รับสร้างตัวใหม่ในบ้านตัวเอง
-- ค่าการเลี้ยงเริ่มใหม่กับบ้านใหม่ ไม่ได้ย้ายตามไป
--
-- ทุกอย่างเขียนผ่านฟังก์ชันเท่านั้น (เหมือน friend_requests.sql) คำตอบเป็นคำสั้น ๆ ให้เกมเลือกข้อความเอง
-- ─────────────────────────────────────────────────────────────

create table if not exists public.cat_cards (
  id         uuid        primary key default gen_random_uuid(),
  from_id    uuid        not null references public.players on delete cascade,
  to_id      uuid        not null references public.players on delete cascade,
  cat_id     text        not null,
  cat        jsonb       not null,
  auto       boolean     not null default false,
  status     text        not null default 'open'
             check (status in ('open', 'accepted', 'done', 'claimed', 'declined', 'cancelled', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '3 days',
  updated_at timestamptz not null default now(),
  check (from_id <> to_id)
);

create index if not exists cat_cards_to on public.cat_cards (to_id);
create index if not exists cat_cards_from on public.cat_cards (from_id);
-- น้องหนึ่งตัวมีการ์ดที่ยังไม่จบได้ใบเดียว
create unique index if not exists cat_cards_live
  on public.cat_cards (from_id, cat_id) where status in ('open', 'accepted');

alter table public.cat_cards enable row level security;

drop policy if exists "อ่านการ์ดที่เกี่ยวกับตัวเอง" on public.cat_cards;
create policy "อ่านการ์ดที่เกี่ยวกับตัวเอง" on public.cat_cards
  for select using (auth.uid() = from_id or auth.uid() = to_id);

revoke all on public.cat_cards from anon, authenticated;
grant select on public.cat_cards to authenticated;

-- การ์ดของเราทั้งสองทาง พร้อมชื่อของอีกฝ่าย — สถานะหมดอายุคิดสดตอนอ่าน
create or replace view public.my_cat_cards
with (security_invoker = on) as
  select
    c.id,
    case when c.from_id = auth.uid() then 'out' else 'in' end as dir,
    c.from_id, c.to_id, c.cat_id, c.cat, c.auto,
    case when c.status in ('open', 'accepted') and c.expires_at < now() then 'expired' else c.status end as status,
    c.created_at, c.expires_at, c.updated_at,
    pf.name as from_name,
    pt.name as to_name
  from public.cat_cards c
  left join public.public_profiles pf on pf.id = c.from_id
  left join public.public_profiles pt on pt.id = c.to_id
  where c.from_id = auth.uid() or c.to_id = auth.uid();

revoke all on public.my_cat_cards from anon;
grant select on public.my_cat_cards to authenticated;

-- ตั้งการ์ดที่เลยเวลาแล้วของเราให้เป็น expired จริง ๆ (ปลดล็อกให้ส่งน้องตัวเดิมใหม่ได้)
create or replace function public.sweep_cat_cards(me uuid)
returns void
language sql as $$
  update public.cat_cards
     set status = 'expired', updated_at = now()
   where status in ('open', 'accepted') and expires_at < now()
     and (from_id = me or to_id = me);
$$;

-- ── ส่งการ์ด ──
--   ok:<uuid> / notfriend / dup (น้องตัวนี้มีการ์ดค้างอยู่) / limit / bad / self / signed_out
create or replace function public.send_cat_card(p_to uuid, p_cat jsonb, p_auto boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  new_id uuid;
begin
  if me is null then return 'signed_out'; end if;
  if p_to = me then return 'self'; end if;
  if p_cat is null or jsonb_typeof(p_cat) <> 'object'
     or coalesce(p_cat->>'id', '') = '' or coalesce(p_cat->>'breed', '') = ''
     or octet_length(p_cat::text) > 4000 then
    return 'bad';
  end if;
  -- ส่งได้เฉพาะลูกแมว Lv1-2 (เกมเช็คก่อนแล้ว ตรงนี้กันข้อมูลแปลก ๆ)
  if coalesce((p_cat->>'lv')::int, 1) > 2 then return 'bad'; end if;
  if not exists (select 1 from friends where player_id = me and friend_id = p_to) then
    return 'notfriend';
  end if;

  perform sweep_cat_cards(me);

  if exists (select 1 from cat_cards
             where from_id = me and cat_id = p_cat->>'id' and status in ('open', 'accepted')) then
    return 'dup';
  end if;
  if (select count(*) from cat_cards where from_id = me and status in ('open', 'accepted')) >= 6 then
    return 'limit';
  end if;

  insert into cat_cards (from_id, to_id, cat_id, cat, auto)
  values (me, p_to, p_cat->>'id', p_cat, coalesce(p_auto, false))
  returning id into new_id;
  return 'ok:' || new_id::text;
end;
$$;

-- ── ผู้รับตอบการ์ด ──
--   accepted (รอผู้ส่งยืนยัน) / done (ส่งอัตโนมัติ) / declined / gone / expired / signed_out
create or replace function public.respond_cat_card(p_id uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  c cat_cards%rowtype;
begin
  if me is null then return 'signed_out'; end if;
  select * into c from cat_cards where id = p_id and to_id = me for update;
  if not found or c.status <> 'open' then return 'gone'; end if;
  if c.expires_at < now() then
    update cat_cards set status = 'expired', updated_at = now() where id = p_id;
    return 'expired';
  end if;
  if not p_accept then
    update cat_cards set status = 'declined', updated_at = now() where id = p_id;
    return 'declined';
  end if;
  update cat_cards
     set status = case when c.auto then 'done' else 'accepted' end, updated_at = now()
   where id = p_id;
  return case when c.auto then 'done' else 'accepted' end;
end;
$$;

-- ── ผู้ส่งยืนยันส่งน้อง (การ์ดที่ผู้รับกดรับแล้ว) ──
--   done / gone / expired / signed_out
create or replace function public.confirm_cat_card(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  c cat_cards%rowtype;
begin
  if me is null then return 'signed_out'; end if;
  select * into c from cat_cards where id = p_id and from_id = me for update;
  if not found or c.status <> 'accepted' then return 'gone'; end if;
  if c.expires_at < now() then
    update cat_cards set status = 'expired', updated_at = now() where id = p_id;
    return 'expired';
  end if;
  update cat_cards set status = 'done', updated_at = now() where id = p_id;
  return 'done';
end;
$$;

-- ── ผู้ส่งยกเลิกการ์ด (ก่อนส่งจริง) ──
--   cancelled / gone / signed_out
create or replace function public.cancel_cat_card(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare me uuid := auth.uid();
begin
  if me is null then return 'signed_out'; end if;
  update cat_cards set status = 'cancelled', updated_at = now()
   where id = p_id and from_id = me and status in ('open', 'accepted');
  return case when found then 'cancelled' else 'gone' end;
end;
$$;

-- ── ผู้รับรับน้องเข้าบ้านแล้ว ── (เรียกซ้ำได้ — การ์ดที่ claimed แล้วตอบ claimed เหมือนเดิม)
--   claimed / gone / signed_out
create or replace function public.claim_cat_card(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare me uuid := auth.uid();
begin
  if me is null then return 'signed_out'; end if;
  update cat_cards set status = 'claimed', updated_at = now()
   where id = p_id and to_id = me and status = 'done';
  if found then return 'claimed'; end if;
  if exists (select 1 from cat_cards where id = p_id and to_id = me and status = 'claimed') then
    return 'claimed';
  end if;
  return 'gone';
end;
$$;

revoke all on function public.sweep_cat_cards(uuid) from public, anon, authenticated;
grant execute on function public.send_cat_card(uuid, jsonb, boolean) to authenticated;
grant execute on function public.respond_cat_card(uuid, boolean) to authenticated;
grant execute on function public.confirm_cat_card(uuid) to authenticated;
grant execute on function public.cancel_cat_card(uuid) to authenticated;
grant execute on function public.claim_cat_card(uuid) to authenticated;
