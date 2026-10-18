-- supabase/gacha-promo.sql
-- ─────────────────────────────────────────────────────────────
-- รูปบนป้ายโปรโมทหน้าสุ่มสกิน (ตู้กาช่า) + เวลาเปลี่ยนรูป + ที่เก็บรูป
--
-- รันไฟล์นี้ใน Supabase → SQL Editor หลังจาก admin.sql แล้ว (ใช้ is_admin())
-- รันซ้ำได้ ไม่พังของเดิม
--
-- แอดมินอัปโหลด/จัดรูป/เรียงลำดับได้จาก admin.html แท็บ "ป้ายตู้กาช่า"
-- เกมอ่านเฉพาะรูปที่เปิดอยู่ (active) · ยังไม่มีรูปเลย = เกมใช้ภาพป้ายเดิมของตัวเอง
-- ─────────────────────────────────────────────────────────────

create table if not exists public.gacha_promos (
  id         uuid        primary key default gen_random_uuid(),
  image_url  text        not null,
  -- ครอบตัด { x, y, z } (ดู src/crop.js) — x/y 0..1 ตำแหน่งรูปในกรอบ · z ซูม ≥ 1
  crop       jsonb       not null default '{"x":0.5,"y":0.5,"z":1}'::jsonb,
  -- ชุดที่ลิงก์ (id ใน src/outfits.js) — แตะรูปในเกม = เปิดหน้ารายละเอียดชุดนี้ · ว่าง = แตะแล้วไม่ไปไหน
  outfit_id  text,
  -- ชื่อบนป้าย · null = ใช้ชื่อชุดที่ลิงก์ · '' (ว่าง) = ไม่โชว์ชื่อ
  title      text,
  sort       integer     not null default 0,
  active     boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists gacha_promos_list_idx on public.gacha_promos (active, sort);

-- ตั้งค่าของป้าย (แถวเดียว id = 1)
create table if not exists public.gacha_promo_settings (
  id           integer     primary key default 1,
  interval_sec integer     not null default 10,
  updated_at   timestamptz,
  constraint gacha_promo_settings_one check (id = 1),
  constraint gacha_promo_interval_range check (interval_sec between 3 and 60)
);
insert into public.gacha_promo_settings (id) values (1) on conflict (id) do nothing;

alter table public.gacha_promos enable row level security;
alter table public.gacha_promo_settings enable row level security;

drop policy if exists "อ่านป้ายกาช่าที่เปิดอยู่" on public.gacha_promos;
create policy "อ่านป้ายกาช่าที่เปิดอยู่" on public.gacha_promos
  for select using (active or public.is_admin());

drop policy if exists "แอดมินจัดการป้ายกาช่า" on public.gacha_promos;
create policy "แอดมินจัดการป้ายกาช่า" on public.gacha_promos
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "อ่านตั้งค่าป้ายกาช่า" on public.gacha_promo_settings;
create policy "อ่านตั้งค่าป้ายกาช่า" on public.gacha_promo_settings
  for select using (true);

drop policy if exists "แอดมินแก้ตั้งค่าป้ายกาช่า" on public.gacha_promo_settings;
create policy "แอดมินแก้ตั้งค่าป้ายกาช่า" on public.gacha_promo_settings
  for all using (public.is_admin()) with check (public.is_admin());

grant select on public.gacha_promos, public.gacha_promo_settings to anon, authenticated;
grant insert, update, delete on public.gacha_promos, public.gacha_promo_settings to authenticated;   -- ผ่าน policy ข้างบนเฉพาะแอดมิน

-- ── ที่เก็บรูปป้าย ─────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('promo', 'promo', true)
on conflict (id) do update set public = true;

drop policy if exists "อ่านรูปป้ายกาช่า" on storage.objects;
create policy "อ่านรูปป้ายกาช่า" on storage.objects
  for select using (bucket_id = 'promo');

drop policy if exists "แอดมินอัปโหลดรูปป้ายกาช่า" on storage.objects;
create policy "แอดมินอัปโหลดรูปป้ายกาช่า" on storage.objects
  for insert with check (bucket_id = 'promo' and public.is_admin());

drop policy if exists "แอดมินแก้รูปป้ายกาช่า" on storage.objects;
create policy "แอดมินแก้รูปป้ายกาช่า" on storage.objects
  for update using (bucket_id = 'promo' and public.is_admin());

drop policy if exists "แอดมินลบรูปป้ายกาช่า" on storage.objects;
create policy "แอดมินลบรูปป้ายกาช่า" on storage.objects
  for delete using (bucket_id = 'promo' and public.is_admin());

-- ── ข่าวสาร: ครอบตัดรูปข่าว (หน้าข่าวสารในหลังบ้านลากจัดรูปได้แล้ว) ──
-- ถ้ายังไม่เคยรัน news.sql ให้รันก่อน บรรทัดนี้จะข้ามไปเองถ้ายังไม่มีตาราง news
do $$ begin
  if to_regclass('public.news') is not null then
    alter table public.news add column if not exists image_crop jsonb;
  end if;
end $$;
