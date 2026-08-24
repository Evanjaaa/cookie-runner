-- supabase/schema.sql
-- ─────────────────────────────────────────────────────────────
-- โครงฐานข้อมูลของ Speed Cat
--
-- วิธีใช้: เปิด Supabase Dashboard → SQL Editor → New query
--          วางไฟล์นี้ทั้งไฟล์แล้วกด Run ครั้งเดียวจบ
--          รันซ้ำได้ ไม่พัง (ทุกคำสั่งเช็ค if not exists / or replace)
--
-- ก่อนรัน ต้องตั้งสามอย่างนี้ใน Dashboard ก่อน:
--
--   1. Authentication → Sign In / Providers → Anonymous Sign-Ins → เปิด
--      (ปุ่ม "เล่นแบบผู้มาเยือน" ในเกมใช้อันนี้)
--
--   2. Authentication → Sign In / Providers → Email → เปิด
--      (ปุ่ม "เชื่อมอีเมล" กับ "เข้าด้วยอีเมล" ใช้อันนี้)
--
--   3. Authentication → Emails → Templates → ใส่ {{ .Token }} ลงในสองแม่แบบ:
--        Magic Link          ← ใช้ตอน "เข้าด้วยอีเมล"
--        Change Email Address ← ใช้ตอน "เชื่อมอีเมล"
--
--      ข้อนี้ลืมไม่ได้ แม่แบบเริ่มต้นส่งไปแต่ลิงก์ ({{ .ConfirmationURL }})
--      แต่เกมถามหารหัส 6 หลัก ผู้เล่นจะได้เมลที่ไม่มีรหัสให้กรอก
--      เหตุผลที่เลือกรหัสแทนลิงก์: บนมือถือ ลิงก์ในเมลเปิดในเบราว์เซอร์ของ
--      แอปเมล ซึ่งคนละที่กับแท็บที่เปิดเกมค้างไว้ แล้ว session ไปลงผิดที่
--
-- หลักคิดเรื่องความปลอดภัย:
--   anon key ฝังอยู่ในโค้ดฝั่งผู้เล่น ใครก็อ่านได้ จึงห้ามพึ่งว่า
--   "ไคลเอนต์คงไม่ทำอะไรแปลก ๆ" ทุกตารางเปิด RLS และผูกสิทธิ์กับ auth.uid()
--   ผู้เล่นจึงแก้ได้เฉพาะแถวของตัวเอง แตะของคนอื่นไม่ได้เลย
-- ─────────────────────────────────────────────────────────────

-- ── ตารางผู้เล่น ─────────────────────────────────────────────
-- หนึ่งแถวต่อหนึ่งบัญชี เก็บทุกอย่างที่เดิมอยู่ใน localStorage
create table if not exists public.players (
  id          uuid primary key references auth.users on delete cascade,
  name        text        not null default 'แมวนิรนาม',
  gold        bigint      not null default 999999,
  owned       text[]      not null default '{}',      -- id ชุดที่สุ่มได้แล้ว
  outfit      text        not null default 'none',
  skin        text        not null default 'orange',
  stage       text        not null default 'night',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.players enable row level security;

drop policy if exists "อ่านได้เฉพาะของตัวเอง" on public.players;
create policy "อ่านได้เฉพาะของตัวเอง" on public.players
  for select using (auth.uid() = id);

drop policy if exists "แก้ได้เฉพาะของตัวเอง" on public.players;
create policy "แก้ได้เฉพาะของตัวเอง" on public.players
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "สร้างได้เฉพาะของตัวเอง" on public.players;
create policy "สร้างได้เฉพาะของตัวเอง" on public.players
  for insert with check (auth.uid() = id);

-- ── สถิติสูงสุดแยกตามด่าน ────────────────────────────────────
create table if not exists public.best_scores (
  player_id   uuid        not null references public.players on delete cascade,
  stage_id    text        not null,
  score       bigint      not null default 0,
  distance    integer     not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (player_id, stage_id)
);

alter table public.best_scores enable row level security;

-- อ่านได้หมดเพราะต้องเอาไปทำกระดานคะแนน แต่เขียนได้เฉพาะของตัวเอง
drop policy if exists "ใครอ่านก็ได้" on public.best_scores;
create policy "ใครอ่านก็ได้" on public.best_scores for select using (true);

drop policy if exists "เขียนได้เฉพาะของตัวเอง" on public.best_scores;
create policy "เขียนได้เฉพาะของตัวเอง" on public.best_scores
  for all using (auth.uid() = player_id) with check (auth.uid() = player_id);

create index if not exists best_scores_rank on public.best_scores (stage_id, score desc);

-- ── ประวัติการสุ่มกาช่า ──────────────────────────────────────
create table if not exists public.pulls (
  id          bigserial   primary key,
  player_id   uuid        not null references public.players on delete cascade,
  outfit_id   text,
  rarity      text,
  gold_won    integer     not null default 0,
  is_new      boolean     not null default false,
  created_at  timestamptz not null default now()
);

alter table public.pulls enable row level security;

drop policy if exists "ดูประวัติตัวเอง" on public.pulls;
create policy "ดูประวัติตัวเอง" on public.pulls
  for select using (auth.uid() = player_id);

drop policy if exists "บันทึกประวัติตัวเอง" on public.pulls;
create policy "บันทึกประวัติตัวเอง" on public.pulls
  for insert with check (auth.uid() = player_id);

create index if not exists pulls_by_player on public.pulls (player_id, created_at desc);

-- ── สร้างแถวผู้เล่นให้อัตโนมัติตอนสมัคร ──────────────────────
-- ทำที่ฐานข้อมูลไม่ใช่ที่ไคลเอนต์ ผู้เล่นจึงมีแถวเสมอแม้ปิดเว็บหนีตอนโหลด
create or replace function public.on_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.players (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.on_user_created();

-- ── อัปเดต updated_at ให้เอง ─────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists players_touch on public.players;
create trigger players_touch before update on public.players
  for each row execute function public.touch_updated_at();

-- ── ส่งคะแนน ─────────────────────────────────────────────────
-- ให้ฐานข้อมูลเป็นคนตัดสินว่าคะแนนใหม่สูงกว่าเดิมมั้ย
-- ถ้าปล่อยให้ไคลเอนต์เขียนทับตรง ๆ ผู้เล่นจะเผลอ (หรือจงใจ) ลดสถิติตัวเองได้
create or replace function public.submit_score(
  p_stage text, p_score bigint, p_distance integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'ต้องเข้าสู่ระบบก่อน';
  end if;

  insert into public.best_scores (player_id, stage_id, score, distance)
  values (auth.uid(), p_stage, greatest(p_score, 0), greatest(p_distance, 0))
  on conflict (player_id, stage_id) do update
    set score      = greatest(public.best_scores.score, excluded.score),
        distance   = case
                       when excluded.score > public.best_scores.score
                       then excluded.distance
                       else public.best_scores.distance
                     end,
        updated_at = now();
end;
$$;

-- ── กระดานคะแนนรวม ──────────────────────────────────────────
-- ใช้ view เพื่อให้เห็นชื่อผู้เล่นได้โดยไม่ต้องเปิดตาราง players ทั้งตาราง
-- (ในนั้นมีจำนวนทองซึ่งไม่ควรให้คนอื่นเห็น)
create or replace view public.leaderboard
with (security_invoker = off) as
  select
    b.stage_id,
    p.name,
    b.score,
    b.distance,
    b.updated_at
  from public.best_scores b
  join public.players p on p.id = b.player_id;

grant select on public.leaderboard to anon, authenticated;

-- ═══════════════════════════════════════════════════════════
-- ระบบที่มาทีหลัง: เพชร สมบัติ เลเวล สถิติ กิจกรรม กล่องจดหมาย
-- ═══════════════════════════════════════════════════════════
-- ของพวกนี้เคยเก็บแค่ใน localStorage ซึ่งมีปัญหาสองข้อ:
--   1. ผู้เล่นล้างข้อมูลเบราว์เซอร์ = เพชรกับสมบัติหายหมด ทั้งที่ล็อกอินไว้แล้ว
--   2. รางวัลกิจกรรมกับของขวัญกดรับซ้ำได้ ถ้าย้ายเครื่องหรือล้างข้อมูล
--      เพราะ "เคยกดรับแล้ว" อยู่ในเครื่องอย่างเดียว
--
-- เก็บต่อในตาราง players เดิม ไม่แตกตารางใหม่ เพราะทั้งหมดเป็นของผู้เล่น
-- คนเดียวแบบหนึ่งต่อหนึ่ง แตกตารางแล้วต้อง join เพิ่มโดยไม่ได้อะไรกลับมา
--
-- ── ทำไมทุกคอลัมน์ต้องยอมให้เป็น null และห้ามมี default ──
-- ถ้าใส่ "not null default 300" แถวของผู้เล่นเดิมที่มีอยู่แล้วจะถูกเติมค่าตั้งต้น
-- ทันทีที่รันคำสั่งนี้ พอเขาเปิดเกมครั้งถัดไป ชั้นซิงก์จะเห็นว่าคลาวด์มีข้อมูล
-- (เพราะทองกับชุดของเขาไม่ใช่ค่าตั้งต้น) แล้วเทค่าจากคลาวด์ลงเครื่องตามปกติ
-- = เพชร 8,400 กับสมบัติที่ตีบวกมาทั้งหมด ถูกทับด้วยค่าตั้งต้นจนหายเกลี้ยง
--
-- ปล่อยเป็น null แทน แล้ว writeLocal() ใน sync.js จะข้ามคอลัมน์ที่เป็น null
-- ของในเครื่องจึงรอด และถูกดันขึ้นมาเติมให้เองในการซิงก์ครั้งแรก
--
-- รันซ้ำได้ ไม่พังของเดิม
alter table public.players
  add column if not exists gems           bigint,
  -- { id ของสมบัติ: ขั้นตีบวก } — ขั้นตีบวกติดอยู่กับสมบัติชิ้นนั้น ไม่ใช่ของผู้เล่นรวม
  add column if not exists treasures      jsonb,
  add column if not exists equip          text[],
  add column if not exists xp             bigint,
  -- ตัวนับตลอดชีพ { runs, seconds, meters, score, pulls, upgrades } — เพิ่มอย่างเดียว
  add column if not exists stats          jsonb,
  -- id กิจกรรมที่กดรับรางวัลไปแล้ว กันกดรับซ้ำข้ามเครื่อง
  add column if not exists quests_claimed text[],
  -- กล่องจดหมายทั้งกล่อง รวมสถานะอ่านแล้ว/รับของแล้ว
  add column if not exists mail           jsonb;
