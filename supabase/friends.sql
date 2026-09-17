-- supabase/friends.sql
-- ─────────────────────────────────────────────────────────────
-- ระบบเพื่อน + โปรไฟล์ที่คนอื่นส่องดูได้
--
-- วิธีใช้: Supabase Dashboard → SQL Editor → New query → วางทั้งไฟล์ → Run
--          ต้องรัน schema.sql มาก่อนแล้ว (ใช้ตาราง players) / รันซ้ำได้ ไม่พัง
--
-- ยังไม่รันไฟล์นี้ เกมก็เล่นได้ปกติทุกอย่าง แค่หน้าโปรไฟล์จะขึ้นว่า
-- "ระบบเพื่อนยังไม่พร้อม" ตรงปุ่มส่องโปรไฟล์/เพิ่มเพื่อน
--
-- ── สิ่งที่ไฟล์นี้เพิ่ม ──
--   players.friend_code     รหัสเพื่อน 8 ตัว ฐานข้อมูลสุ่มให้เอง แก้เองไม่ได้
--   players.last_seen       เวลาที่เห็นผู้เล่นคนนี้ล่าสุด (บอกสถานะออนไลน์)
--   players.public_profile  ภาพรวมโปรไฟล์ที่ยอมให้คนอื่นเห็น (เลเวล สเตตัส ตัวเลขสะสม ฯลฯ)
--   public_profiles (view)  คนอื่นอ่านได้เฉพาะคอลัมน์ข้างบน — ทอง/เพชร/ของในกระเป๋าไม่หลุดออกไป
--   friends (table)         ใครเพิ่มใครเป็นเพื่อน
--   my_friends (view)       รายชื่อเพื่อนของเรา (ไว้ทำหน้ารายชื่อเพื่อนต่อ)
--   touch_presence()        อัปเดต last_seen ด้วยเวลาของเซิร์ฟเวอร์
--
-- ── ความปลอดภัย ──
-- ตาราง players ยังอ่านได้เฉพาะแถวตัวเองเหมือนเดิม คนอื่นเห็นผ่าน view ที่คัดคอลัมน์แล้วเท่านั้น
-- view เปิดให้ผู้ที่เข้าสู่ระบบแล้ว (รวมผู้มาเยือน) ไม่เปิดให้คนที่ยังไม่มีบัญชี
-- ─────────────────────────────────────────────────────────────

alter table public.players
  add column if not exists friend_code    text,
  add column if not exists last_seen      timestamptz,
  add column if not exists public_profile jsonb;

create unique index if not exists players_friend_code_key on public.players (friend_code);

-- ── สุ่มรหัสเพื่อน ──
-- ตัดตัวที่อ่านสับสนทิ้ง (0/O, 1/I/L) เพราะรหัสนี้ต้องบอกกันด้วยปากหรือพิมพ์ตาม
-- security definer: ต้องเห็นรหัสของทุกคนเพื่อกันซ้ำ ซึ่ง RLS ของผู้เรียกมองไม่เห็น
create or replace function public.gen_friend_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.players where friend_code = code);
  end loop;
  return code;
end;
$$;

-- ── รหัสเพื่อนตั้งให้อัตโนมัติ และเปลี่ยนเองไม่ได้ ──
-- นโยบาย "แก้ได้เฉพาะของตัวเอง" ของ players ยอมให้อัปเดตทุกคอลัมน์ของแถวตัวเอง
-- ถ้าไม่ล็อกไว้ ผู้เล่นตั้งรหัสสวย ๆ เองได้ หรือเปลี่ยนรหัสหนีคนที่มีรหัสเก่าอยู่
create or replace function public.players_friend_code()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.friend_code is not null then
    new.friend_code := old.friend_code;
  end if;
  if new.friend_code is null then
    new.friend_code := public.gen_friend_code();
  end if;
  return new;
end;
$$;

drop trigger if exists players_friend_code on public.players;
create trigger players_friend_code
  before insert or update on public.players
  for each row execute function public.players_friend_code();

-- เติมรหัสให้ผู้เล่นที่มีอยู่แล้ว (ทริกเกอร์ข้างบนเป็นคนสุ่มให้)
update public.players set friend_code = null where friend_code is null;

-- ── สถานะออนไลน์ ──
-- ใช้เวลาของเซิร์ฟเวอร์ ไม่เชื่อเวลาในเครื่องผู้เล่น (นาฬิกาเครื่องเพี้ยนได้)
create or replace function public.touch_presence()
returns void
language sql
security invoker
as $$
  update public.players set last_seen = now() where id = auth.uid();
$$;

grant execute on function public.touch_presence() to authenticated;

-- ── โปรไฟล์สาธารณะ ──
create or replace view public.public_profiles
with (security_invoker = off) as
  select id, name, friend_code, last_seen, public_profile
  from public.players;

revoke all on public.public_profiles from anon;
grant select on public.public_profiles to authenticated;

-- ── เพื่อน ──
-- แถวเดียว = "player_id เพิ่ม friend_id เป็นเพื่อน" (ทางเดียว แบบติดตาม)
-- ยังไม่ต้องรออีกฝ่ายตอบรับ — ถ้าวันหลังอยากทำแบบขอเป็นเพื่อน ให้เพิ่มคอลัมน์สถานะที่ตารางนี้
create table if not exists public.friends (
  player_id  uuid        not null references public.players on delete cascade,
  friend_id  uuid        not null references public.players on delete cascade,
  created_at timestamptz not null default now(),
  primary key (player_id, friend_id),
  check (player_id <> friend_id)
);

alter table public.friends enable row level security;

-- อ่านได้ทั้งฝั่งที่เพิ่มและฝั่งที่ถูกเพิ่ม (ไว้ทำ "ใครเพิ่มเราเป็นเพื่อน" ทีหลัง)
drop policy if exists "อ่านความเป็นเพื่อนที่เกี่ยวกับตัวเอง" on public.friends;
create policy "อ่านความเป็นเพื่อนที่เกี่ยวกับตัวเอง" on public.friends
  for select using (auth.uid() = player_id or auth.uid() = friend_id);

drop policy if exists "เพิ่มเพื่อนได้ในชื่อตัวเอง" on public.friends;
create policy "เพิ่มเพื่อนได้ในชื่อตัวเอง" on public.friends
  for insert with check (auth.uid() = player_id);

drop policy if exists "ลบเพื่อนของตัวเอง" on public.friends;
create policy "ลบเพื่อนของตัวเอง" on public.friends
  for delete using (auth.uid() = player_id);

create index if not exists friends_by_friend on public.friends (friend_id);

-- ── รายชื่อเพื่อนของเรา ──
-- security_invoker off เพื่อ join โปรไฟล์ของเพื่อนได้ จึงต้องกรองด้วย auth.uid() ในตัว view เอง
create or replace view public.my_friends
with (security_invoker = off) as
  select
    f.friend_id as id,
    p.name,
    p.friend_code,
    p.last_seen,
    p.public_profile,
    f.created_at
  from public.friends f
  join public.players p on p.id = f.friend_id
  where f.player_id = auth.uid();

revoke all on public.my_friends from anon;
grant select on public.my_friends to authenticated;
