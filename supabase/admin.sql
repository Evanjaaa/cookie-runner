-- supabase/admin.sql
-- ─────────────────────────────────────────────────────────────
-- สิทธิ์แอดมินสำหรับหน้า /admin.html
--
-- วิธีใช้: Supabase Dashboard → SQL Editor → New query → วางทั้งไฟล์ → Run
--          รันซ้ำได้ ไม่พังของเดิม
--
-- แล้วตั้งตัวเองเป็นแอดมินด้วยคำสั่งท้ายไฟล์ (มีตัวอย่างให้)
--
-- ── ทำไมต้องบังคับสิทธิ์ที่ฐานข้อมูล ไม่ใช่ที่หน้าเว็บ ──
-- anon key ฝังอยู่ในโค้ดฝั่งผู้เล่น ใครเปิด DevTools ก็เห็น ถ้าเขียนแบบ
-- "ถ้าอีเมลตรงกับแอดมินค่อยโชว์ปุ่มลบ" คนอื่นก็แค่ยิง API ตรง ๆ ข้ามหน้าเว็บไป
-- สิทธิ์จึงต้องอยู่ในที่ที่ไคลเอนต์แก้ไม่ได้ = RLS ของ Postgres
--
-- ผลคือใครจะเปิด /admin.html ก็เปิดได้ แต่ถ้าไม่ใช่แอดมินจะไม่มีข้อมูลไหล
-- ออกมาสักแถว เพราะฐานข้อมูลปฏิเสธเอง ไม่ใช่หน้าเว็บซ่อนไว้เฉย ๆ
-- ─────────────────────────────────────────────────────────────

-- ── รายชื่อแอดมิน ────────────────────────────────────────────
create table if not exists public.admins (
  user_id    uuid primary key references auth.users on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);

-- เปิด RLS แต่ "ไม่ใส่ policy สักข้อ" โดยตั้งใจ
-- = ไม่มีใครอ่านหรือเขียนตารางนี้ผ่าน API ได้เลย แม้แต่แอดมินเอง
-- เพิ่ม/ลบแอดมินทำได้จาก SQL Editor เท่านั้น ซึ่งต้องเข้าถึง Dashboard ได้ก่อน
-- ถ้าเปิดให้แอดมินแก้ตารางนี้ผ่านเว็บ แอดมินคนเดียวที่โดนขโมยบัญชี
-- จะตั้งแอดมินเพิ่มเองได้ไม่รู้จบ
alter table public.admins enable row level security;

-- ── ฟังก์ชันเช็คสิทธิ์ ───────────────────────────────────────
-- security definer เพราะต้องอ่านตาราง admins ที่ปิดไม่ให้ใครอ่าน
-- stable เพราะภายในคำสั่งเดียวคำตอบไม่เปลี่ยน Postgres จึงเรียกซ้ำน้อยลง
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $fn$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$fn$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ── สิทธิ์แอดมินบนตารางเกม ──────────────────────────────────
-- policy หลายข้อบนตารางเดียวกันเป็น OR กัน กฎเดิมของผู้เล่นจึงยังทำงานปกติ
-- แค่เพิ่มทางให้แอดมินอีกทาง ไม่ได้ไปแทนที่ของเดิม

drop policy if exists "แอดมินอ่านผู้เล่นได้ทุกคน" on public.players;
create policy "แอดมินอ่านผู้เล่นได้ทุกคน" on public.players
  for select using (public.is_admin());

drop policy if exists "แอดมินแก้ผู้เล่นได้ทุกคน" on public.players;
create policy "แอดมินแก้ผู้เล่นได้ทุกคน" on public.players
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "แอดมินลบผู้เล่นได้" on public.players;
create policy "แอดมินลบผู้เล่นได้" on public.players
  for delete using (public.is_admin());

drop policy if exists "แอดมินแก้คะแนนได้" on public.best_scores;
create policy "แอดมินแก้คะแนนได้" on public.best_scores
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "แอดมินอ่านประวัติกาช่าได้ทุกคน" on public.pulls;
create policy "แอดมินอ่านประวัติกาช่าได้ทุกคน" on public.pulls
  for select using (public.is_admin());

drop policy if exists "แอดมินลบประวัติกาช่าได้" on public.pulls;
create policy "แอดมินลบประวัติกาช่าได้" on public.pulls
  for delete using (public.is_admin());

-- ── มุมมองผู้ใช้พร้อมข้อมูลบัญชี ─────────────────────────────
-- ตาราง auth.users เปิดให้ไคลเอนต์อ่านตรง ๆ ไม่ได้ (มีทั้งอีเมลและ token)
-- view นี้จึงดึงเฉพาะฟิลด์ที่หน้าแอดมินต้องใช้ แล้วต่อกับ players
--
-- security_invoker = off คือให้ view ทำงานด้วยสิทธิ์ของเจ้าของ view
-- ซึ่งอ่าน auth.users ได้ ส่วนการกันคนนอกอยู่ที่ where is_admin() บรรทัดสุดท้าย
-- ถ้าไม่ใช่แอดมิน where เป็นเท็จ ผลลัพธ์ว่างเปล่า ไม่ใช่ error
--
-- ผู้มาเยือน (anonymous sign-in) ไม่มีอีเมล จึงใช้ email is null แยกประเภท
-- ไม่พึ่งคอลัมน์ is_anonymous เพราะมันมาทีหลังและบางโปรเจกต์ยังไม่มี
create or replace view public.admin_players
with (security_invoker = off) as
  select
    p.id,
    p.name,
    p.gold,
    p.gems,
    p.xp,
    p.skin,
    p.outfit,
    p.stage,
    p.owned,
    p.equip,
    p.treasures,
    p.stats,
    p.quests_claimed,
    p.mail,
    p.created_at,
    p.updated_at,
    u.email,
    (u.email is null)      as is_guest,
    u.last_sign_in_at,
    u.created_at           as signed_up_at,
    (select coalesce(max(b.score), 0) from public.best_scores b where b.player_id = p.id) as best_score,
    (select count(*)                  from public.pulls pl     where pl.player_id = p.id) as pull_count
  from public.players p
  join auth.users u on u.id = p.id
  where public.is_admin();

revoke all on public.admin_players from anon;
grant select on public.admin_players to authenticated;

-- ── มุมมองคะแนนพร้อมชื่อและบัญชี ────────────────────────────
-- leaderboard เดิมไม่มี player_id (ตั้งใจ ไม่ให้คนนอกโยงคะแนนกับบัญชีได้)
-- แอดมินต้องโยงได้ เพราะต้องรู้ว่าจะลบคะแนนของใคร
create or replace view public.admin_scores
with (security_invoker = off) as
  select
    b.player_id,
    b.stage_id,
    b.score,
    b.distance,
    b.updated_at,
    p.name,
    u.email,
    (u.email is null) as is_guest
  from public.best_scores b
  join public.players p on p.id = b.player_id
  join auth.users u     on u.id = b.player_id
  where public.is_admin();

revoke all on public.admin_scores from anon;
grant select on public.admin_scores to authenticated;

-- ── มุมมองประวัติกาช่าพร้อมชื่อ ─────────────────────────────
create or replace view public.admin_pulls
with (security_invoker = off) as
  select
    pl.id,
    pl.player_id,
    pl.outfit_id,
    pl.rarity,
    pl.gold_won,
    pl.is_new,
    pl.created_at,
    p.name
  from public.pulls pl
  join public.players p on p.id = pl.player_id
  where public.is_admin();

revoke all on public.admin_pulls from anon;
grant select on public.admin_pulls to authenticated;

-- ── ตัวเลขภาพรวม ────────────────────────────────────────────
-- รวมเป็นฟังก์ชันเดียวแทนให้หน้าเว็บยิงนับทีละอัน
-- ประหยัดรอบไป-กลับ และได้ตัวเลขที่มาจากช่วงเวลาเดียวกันทั้งชุด
--
-- ตัวเลขใหญ่ ๆ (ทอง เพชร รอบวิ่ง) แปลงเป็น text ก่อนส่ง เพราะ bigint เกิน
-- ช่วงที่ JavaScript เก็บได้แม่นยำ (2^53) ถ้าปล่อยเป็นตัวเลขจะเพี้ยนเงียบ ๆ
create or replace function public.admin_overview()
returns json
language sql
security definer
stable
set search_path = public
as $fn$
  select case when not public.is_admin() then null else json_build_object(
    'players_total', (select count(*) from public.players),
    'guests',        (select count(*) from public.players p join auth.users u on u.id = p.id where u.email is null),
    'emails',        (select count(*) from public.players p join auth.users u on u.id = p.id where u.email is not null),
    'new_24h',       (select count(*) from public.players where created_at > now() - interval '24 hours'),
    'new_7d',        (select count(*) from public.players where created_at > now() - interval '7 days'),
    'active_24h',    (select count(*) from public.players where updated_at > now() - interval '24 hours'),
    'active_7d',     (select count(*) from public.players where updated_at > now() - interval '7 days'),
    'gold_total',    (select coalesce(sum(gold), 0)::text from public.players),
    'gems_total',    (select coalesce(sum(gems), 0)::text from public.players),
    'runs_total',    (select coalesce(sum((stats->>'runs')::bigint), 0)::text
                        from public.players where stats ? 'runs'),
    'pulls_total',   (select count(*) from public.pulls),
    'scores_total',  (select count(*) from public.best_scores),
    'top_score',     (select coalesce(max(score), 0)::text from public.best_scores)
  ) end;
$fn$;

revoke all on function public.admin_overview() from public;
grant execute on function public.admin_overview() to authenticated;

-- ── ลบบัญชี ─────────────────────────────────────────────────
--
-- ทำไมต้องเป็นฟังก์ชัน ไม่ใช่ให้หน้าเว็บลบเอง:
-- ข้อมูลเกมอยู่ใน public.players ซึ่งลบผ่าน RLS ได้ แต่ "บัญชีเข้าสู่ระบบ"
-- อยู่ใน auth.users ซึ่งไคลเอนต์แตะไม่ได้เลยไม่ว่าจะเป็นใคร
--
-- ถ้าลบแค่ players จะเหลือบัญชีลอย ๆ ที่ล็อกอินได้แต่ไม่มีข้อมูล และถ้าเจ้าของ
-- ยังมีข้อมูลค้างในเครื่อง เกมจะ upsert ดันขึ้นมาใหม่ทันทีที่เปิด = ลบไม่ขาด
--
-- security definer ทำให้ฟังก์ชันทำงานด้วยสิทธิ์เจ้าของ (ลบ auth.users ได้)
-- แต่บรรทัดแรกเช็ค is_admin() ก่อนเสมอ คนนอกเรียกมาก็โดนปฏิเสธ
-- และ auth.users -> players -> best_scores/pulls ผูกกันด้วย on delete cascade
-- ลบบัญชีทีเดียวจึงหายหมดทั้งสาย ไม่มีเศษค้าง

create or replace function public.admin_delete_user(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not public.is_admin() then
    raise exception 'ต้องเป็นแอดมินก่อน';
  end if;
  if p_id = auth.uid() then
    raise exception 'ลบบัญชีตัวเองไม่ได้';
  end if;
  -- กันลบแอดมินคนอื่นพลาดมือ ต้องถอดสิทธิ์ก่อนถึงจะลบได้
  if exists (select 1 from public.admins where user_id = p_id) then
    raise exception 'บัญชีนี้เป็นแอดมิน ถอดสิทธิ์ก่อนถึงจะลบได้';
  end if;

  delete from auth.users where id = p_id;
  return true;
end;
$fn$;

revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- ── เคลียร์บัญชีผู้มาเยือน ───────────────────────────────────
--
-- ผู้มาเยือนคือบัญชีที่ไม่มีอีเมลผูกไว้ (anonymous sign-in) มันเกิดใหม่ทุกครั้ง
-- ที่มีคนกด "เล่นแบบผู้มาเยือน" บนเครื่องใหม่หรือหลังล้างเบราว์เซอร์
-- นานไปจึงมีบัญชีร้างสะสมเรื่อย ๆ ซึ่งไม่มีใครกลับมาใช้อีกแล้ว
--
-- ── ทำไมนับกับลบอยู่ในฟังก์ชันเดียวกัน ──
-- p_dry_run = true คืนจำนวนที่ "จะโดนลบ" โดยยังไม่ลบ
-- เขียนรวมกันเพื่อให้เงื่อนไขที่ใช้นับกับที่ใช้ลบเป็นชุดเดียวกันเป๊ะ
-- ถ้าแยกเป็นสองฟังก์ชัน วันหนึ่งจะมีคนแก้อันเดียวแล้วตัวเลขที่พรีวิว
-- ไม่ตรงกับที่ลบจริง ซึ่งเป็นความผิดพลาดที่ราคาแพงมากสำหรับคำสั่งลบ
--
-- p_idle_only = true  ลบเฉพาะคนที่ไม่เคยวิ่งจบสักรอบและไม่มีคะแนน
--                     (คนที่แค่เปิดเข้ามาดูแล้วปิดไป)
-- p_idle_only = false ลบทุกคนที่เข้าเงื่อนไขวัน ไม่สนว่าเคยเล่นแค่ไหน
--
-- ── p_days นับจากอะไร ──
-- ใช้ "ครั้งล่าสุดที่มีร่องรอยว่ายังเล่นอยู่" ซึ่งต้องดูสองที่ ไม่ใช่ที่เดียว:
--
--   last_sign_in_at  ขยับเฉพาะตอน "เข้าสู่ระบบใหม่" แต่ผู้มาเยือนที่เปิดเกม
--                    ทุกวันจะใช้ session เดิมที่เก็บไว้ในเบราว์เซอร์ ไม่ได้
--                    เข้าสู่ระบบใหม่เลย ค่านี้จึงค้างอยู่ที่วันแรกที่กดเล่น
--   players.updated_at  ขยับทุกครั้งที่เกมซิงก์ข้อมูลขึ้นคลาวด์ = ทุกครั้งที่เล่นจริง
--
-- ถ้าดูแค่ last_sign_in_at คนที่เล่นทุกวันมาสองเดือนจะถูกนับว่า "หายไป 60 วัน"
-- แล้วโดนลบทั้งที่ยังเล่นอยู่ ซึ่งเป็นความผิดพลาดที่ผู้เล่นไม่มีทางกู้คืนได้เลย
-- จึงเอาค่าที่ใหม่ที่สุดของทั้งสองมาใช้ พลาดไปทางเก็บไว้นานเกินดีกว่าลบคนที่ยังเล่น
--
-- ส่ง 0 = ไม่สนเรื่องวัน (ใช้ตอนอยากล้างทั้งหมด เช่นล้างข้อมูลตอนทดสอบ)

create or replace function public.admin_purge_guests(
  p_days      integer default 3,      -- ตรงกับที่บอกผู้เล่นไว้ในหน้าเข้าสู่ระบบ
  p_idle_only boolean default true,
  p_dry_run   boolean default true
)
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  n integer;
begin
  if not public.is_admin() then
    raise exception 'ต้องเป็นแอดมินก่อน';
  end if;

  create temp table _victims on commit drop as
    select u.id
    from auth.users u
    left join public.players p on p.id = u.id
    where u.email is null                                  -- ผู้มาเยือนเท่านั้น
      and u.id <> auth.uid()                               -- ไม่แตะตัวเอง
      and not exists (select 1 from public.admins a where a.user_id = u.id)
      and (
        p_days <= 0
        or greatest(
             coalesce(u.last_sign_in_at, u.created_at),
             coalesce(p.updated_at,      u.created_at)
           ) < now() - make_interval(days => p_days)
      )
      and (
        not p_idle_only
        or (
          coalesce((p.stats->>'runs')::bigint, 0) = 0
          and not exists (select 1 from public.best_scores b where b.player_id = u.id)
        )
      );

  select count(*) into n from _victims;

  if not p_dry_run then
    delete from auth.users where id in (select id from _victims);
  end if;

  return n;
end;
$fn$;

revoke all on function public.admin_purge_guests(integer, boolean, boolean) from public;
grant execute on function public.admin_purge_guests(integer, boolean, boolean) to authenticated;

-- ═══════════════════════════════════════════════════════════
-- ตั้งตัวเองเป็นแอดมิน — แก้อีเมลข้างล่างเป็นของคุณแล้วรัน
-- ═══════════════════════════════════════════════════════════
-- ต้องเคยเข้าเกมด้วยอีเมลนี้อย่างน้อยหนึ่งครั้งก่อน บัญชีถึงจะมีอยู่จริง
--
--   insert into public.admins (user_id, note)
--   select id, 'เจ้าของเกม' from auth.users where email = 'you@example.com'
--   on conflict (user_id) do nothing;
--
-- เช็คว่าติดมั้ย:
--   select u.email, a.note from public.admins a join auth.users u on u.id = a.user_id;
--
-- ถอดสิทธิ์:
--   delete from public.admins where user_id = (select id from auth.users where email = 'you@example.com');
