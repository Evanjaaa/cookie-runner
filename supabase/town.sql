-- supabase/town.sql
-- ─────────────────────────────────────────────────────────────
-- เมืองแมวเหมียว (หน้าแยก town.html) — ร้านค้า + กระเป๋า + แลกค่าขนมเป็นทอง "ฝั่งเซิร์ฟเวอร์ตัดสิน"
-- (GAME_PLAN.md ข้อ 11 ขั้น 3 · ผู้ใช้สั่ง 27 ต.ค. 2026 · ยังไม่รวมเข้าเกมจริง)
--
-- วิธีใช้: Supabase → SQL Editor → วางทั้งไฟล์ → Run · รันซ้ำได้ ไม่พัง (if not exists / or replace / on conflict)
--   ยังไม่รัน = หน้าเมืองใช้ "โหมดทดลอง" (ทองปลอมในเครื่อง ไม่แตะบัญชีจริง) และบอกบนจอว่ายังไม่ได้ติดตั้ง
--
-- ── หลักคิด ──
--   ราคา / ของที่ได้ / เพดานรายวัน อยู่ในฐานข้อมูล — ฝั่งผู้เล่นส่งมาแค่ "ซื้อชิ้นไหน" กับ "แลกเท่าไหร่"
--   ฟังก์ชันหักทองจาก players.gold ในคำสั่งเดียว (update ... where gold >= ราคา) จึงไม่มีทางติดลบ/ซื้อซ้อนเกินทอง
--   ตารางใหม่ผู้เล่นอ่านได้เฉพาะแถวตัวเอง ไม่มีสิทธิ์เขียนตรง (ไม่มี policy insert/update) — เขียนได้ทางฟังก์ชันเท่านั้น
--   ใส่ grant ชัดเจนทุกตาราง/ฟังก์ชัน (Supabase เปลี่ยนกติกา 30 ต.ค. 2026: ตารางใหม่ไม่ได้สิทธิ์ให้เองแล้ว)
--
-- ── ที่ยังไม่ปิด (ทำตอนรวมเข้าเกมจริง) ──
--   1) เกมจริงยังเขียน players.gold ตรงได้ (policy "แก้ได้เฉพาะของตัวเอง" ใน schema.sql) — ปิดได้เมื่อทุกที่ที่ได้/ใช้ทอง
--      ในเกม (จบรอบ กาช่า ตีบวก ฯลฯ) ย้ายมาเป็นฟังก์ชันแบบไฟล์นี้แล้ว
--   2) ค่าขนมที่เก็บได้วันนี้ ฝั่งผู้เล่นเป็นคนรายงาน (town_report_treats) — เซิร์ฟเวอร์จำกัดที่เพดานรายวัน
--      และไม่ยอมให้ลดลง แต่ตรวจไม่ได้ว่าวิ่งได้จริงเท่านั้น (คะแนนทั้งเกมก็คำนวณฝั่งผู้เล่นเหมือนกัน)
-- ─────────────────────────────────────────────────────────────

-- ── วันของเกม (เวลาไทย) ───────────────────────────────────────
create or replace function public.town_today()
returns date
language sql
stable
as $fn$ select (now() at time zone 'Asia/Bangkok')::date $fn$;

-- ── รายการสินค้า (ราคาจริงอยู่ที่นี่ — src/shop.js เป็นแค่หน้าตา/ค่าสำรองตอนโหมดทดลอง) ──
create table if not exists public.shop_catalog (
  id       text    primary key,
  tab      text    not null,                          -- หมวด: food · toy · care · home (ตรงกับ SHOP_TABS)
  price    integer not null check (price >= 0),       -- ทอง
  gives    text    not null,                          -- id ของที่เข้ากระเป๋า (แพ็กข้าวเม็ด → kibble)
  qty      integer not null default 1 check (qty > 0),
  max_own  integer,                                   -- null = ไม่จำกัด · 1 = ซื้อครั้งเดียว (ของเล่น/อัปเกรด)
  active   boolean not null default true,
  sort     integer not null default 0
);

alter table public.shop_catalog enable row level security;
drop policy if exists "ใครก็ดูรายการสินค้าได้" on public.shop_catalog;
create policy "ใครก็ดูรายการสินค้าได้" on public.shop_catalog for select using (true);
grant select on public.shop_catalog to anon, authenticated;

insert into public.shop_catalog (id, tab, price, gives, qty, max_own, sort) values
  ('kibble',   'food',   100, 'kibble',  1, null, 10),
  ('kibble10', 'food',   900, 'kibble', 10, null, 11),
  ('fish',     'food',   400, 'fish',    1, null, 20),
  ('fish5',    'food',  1800, 'fish',    5, null, 21),
  ('salmon',   'food',   900, 'salmon',  1, null, 30),
  ('feather',  'toy',   1500, 'feather', 1, 1,    10),
  ('ball',     'toy',   2500, 'ball',    1, 1,    20),
  ('mouse',    'toy',   4000, 'mouse',   1, 1,    30),
  ('grow',     'care',  3000, 'grow',    1, null, 10),
  ('shampoo',  'care',   500, 'shampoo', 1, null, 20),
  ('vitamin',  'care',   800, 'vitamin', 1, null, 30),
  ('tub',      'home',  8000, 'tub',     1, 1,    10),
  ('bed',      'home',  6000, 'bed',     1, 1,    20),
  ('tree',     'home', 10000, 'tree',    1, 1,    30)
on conflict (id) do update set
  tab = excluded.tab, price = excluded.price, gives = excluded.gives, qty = excluded.qty,
  max_own = excluded.max_own, sort = excluded.sort;

-- ── กระเป๋า (ของที่ซื้อแล้ว) ─────────────────────────────────
create table if not exists public.inventory (
  player_id  uuid        not null references public.players on delete cascade,
  item_id    text        not null,
  qty        integer     not null default 0 check (qty >= 0),
  updated_at timestamptz not null default now(),
  primary key (player_id, item_id)
);

alter table public.inventory enable row level security;
drop policy if exists "ดูกระเป๋าตัวเอง" on public.inventory;
create policy "ดูกระเป๋าตัวเอง" on public.inventory for select using (auth.uid() = player_id);
grant select on public.inventory to authenticated;

-- ── ค่าขนมรายวัน (เก็บได้ / แลกไปแล้ว) ────────────────────────
create table if not exists public.treat_days (
  player_id  uuid    not null references public.players on delete cascade,
  day        date    not null,
  got        bigint  not null default 0 check (got >= 0),
  used       bigint  not null default 0 check (used >= 0),
  primary key (player_id, day)
);

alter table public.treat_days enable row level security;
drop policy if exists "ดูยอดค่าขนมตัวเอง" on public.treat_days;
create policy "ดูยอดค่าขนมตัวเอง" on public.treat_days for select using (auth.uid() = player_id);
grant select on public.treat_days to authenticated;

-- ── สถานะทั้งหมดที่หน้าเมืองต้องใช้ (ทอง · กระเป๋า · ยอดวันนี้ · รายการสินค้า) ──
create or replace function public.town_state()
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid  uuid := auth.uid();
  v_gold bigint;
  v_bag  jsonb;
  v_got  bigint := 0;
  v_used bigint := 0;
  v_cat  jsonb;
begin
  if v_uid is null then raise exception 'ต้องเข้าสู่ระบบก่อน'; end if;

  select p.gold into v_gold from public.players p where p.id = v_uid;
  if not found then raise exception 'ไม่พบข้อมูลผู้เล่น'; end if;

  select coalesce(jsonb_object_agg(i.item_id, i.qty), '{}'::jsonb) into v_bag
  from public.inventory i where i.player_id = v_uid and i.qty > 0;

  select t.got, t.used into v_got, v_used
  from public.treat_days t where t.player_id = v_uid and t.day = public.town_today();

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', c.id, 'tab', c.tab, 'price', c.price, 'gives', c.gives, 'qty', c.qty, 'max_own', c.max_own
         ) order by c.tab, c.sort), '[]'::jsonb) into v_cat
  from public.shop_catalog c where c.active;

  return jsonb_build_object(
    'gold', v_gold,
    'bag', v_bag,
    'today', jsonb_build_object('got', coalesce(v_got, 0), 'used', coalesce(v_used, 0), 'cap', 5000000),
    'catalog', v_cat
  );
end;
$fn$;

-- ── รายงานค่าขนมที่เก็บได้วันนี้ (ยอดรวมทั้งวัน ไม่ใช่ยอดเพิ่ม) ──
-- เก็บค่าที่มากกว่าเสมอ (ลดไม่ได้) และไม่เกินเพดาน 5,000,000 ต่อวัน — ตรงกับ EXCHANGE.dailyCap ใน src/shop.js
create or replace function public.town_report_treats(p_total bigint)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid uuid := auth.uid();
  v_val bigint := least(greatest(coalesce(p_total, 0), 0), 5000000);
begin
  if v_uid is null then raise exception 'ต้องเข้าสู่ระบบก่อน'; end if;
  insert into public.treat_days (player_id, day, got)
  values (v_uid, public.town_today(), v_val)
  on conflict (player_id, day) do update set got = greatest(public.treat_days.got, excluded.got);
end;
$fn$;

-- ── ซื้อของหนึ่งรายการ ────────────────────────────────────────
create or replace function public.town_buy(p_item text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid   uuid := auth.uid();
  v_c     public.shop_catalog%rowtype;
  v_have  integer := 0;
begin
  if v_uid is null then raise exception 'ต้องเข้าสู่ระบบก่อน'; end if;

  select * into v_c from public.shop_catalog c where c.id = p_item and c.active;
  if not found then raise exception 'ไม่มีสินค้านี้'; end if;

  if v_c.max_own is not null then
    select coalesce(i.qty, 0) into v_have
    from public.inventory i where i.player_id = v_uid and i.item_id = v_c.gives;
    if coalesce(v_have, 0) >= v_c.max_own then raise exception 'มีของชิ้นนี้แล้ว'; end if;
  end if;

  -- หักทองในคำสั่งเดียว: ทองไม่พอ = ไม่มีแถวถูกแก้
  update public.players p set gold = p.gold - v_c.price
  where p.id = v_uid and p.gold >= v_c.price;
  if not found then raise exception 'ทองไม่พอ'; end if;

  insert into public.inventory (player_id, item_id, qty)
  values (v_uid, v_c.gives, v_c.qty)
  on conflict (player_id, item_id) do update
    set qty = public.inventory.qty + excluded.qty, updated_at = now();

  return public.town_state();
end;
$fn$;

-- ── แลกค่าขนมเป็นทอง (100 ค่าขนม = 1 ทอง · 1,000,000 → 10,000 ตาม src/shop.js) ──
create or replace function public.town_exchange(p_treats bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid   uuid := auth.uid();
  v_per   constant bigint := 100;
  v_got   bigint;
  v_used  bigint;
  v_gold  bigint;
begin
  if v_uid is null then raise exception 'ต้องเข้าสู่ระบบก่อน'; end if;

  select t.got, t.used into v_got, v_used
  from public.treat_days t
  where t.player_id = v_uid and t.day = public.town_today()
  for update;
  if not found then raise exception 'ค่าขนมยังไม่พอแลก'; end if;

  v_gold := least(greatest(coalesce(p_treats, 0), 0), v_got - v_used) / v_per;
  if v_gold <= 0 then raise exception 'ค่าขนมยังไม่พอแลก'; end if;

  update public.treat_days set used = used + v_gold * v_per
  where player_id = v_uid and day = public.town_today();
  update public.players set gold = gold + v_gold where id = v_uid;

  return public.town_state() || jsonb_build_object('got_gold', v_gold);
end;
$fn$;

revoke all on function public.town_today() from public;
revoke all on function public.town_state() from public;
revoke all on function public.town_report_treats(bigint) from public;
revoke all on function public.town_buy(text) from public;
revoke all on function public.town_exchange(bigint) from public;
grant execute on function public.town_today() to authenticated;
grant execute on function public.town_state() to authenticated;
grant execute on function public.town_report_treats(bigint) to authenticated;
grant execute on function public.town_buy(text) to authenticated;
grant execute on function public.town_exchange(bigint) to authenticated;

-- ── เช็คผล (ควรเห็นสินค้า 14 แถว) ──
select tab, count(*) as items from public.shop_catalog group by tab order by tab;
