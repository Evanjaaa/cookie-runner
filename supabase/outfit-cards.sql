-- supabase/outfit-cards.sql
-- ─────────────────────────────────────────────────────────────
-- รูปบนการ์ดชุด (หน้าชุดแมวในคลังน้อง + หน้า "สกินในตู้นี้" ของตู้กาช่า) — สกินละหนึ่งรูป
--
-- รันไฟล์นี้ใน Supabase → SQL Editor หลังจาก admin.sql แล้ว (ใช้ is_admin())
-- รันซ้ำได้ ไม่พังของเดิม
--
-- แอดมินอัปโหลด/จัดรูปได้จาก admin.html แท็บ "รูปการ์ดชุด"
-- เกมอ่านเฉพาะรูปที่เปิดอยู่ (active) · สกินที่ไม่มีรูป = เกมใช้ภาพเดิมที่วาดเอง
-- ─────────────────────────────────────────────────────────────

create table if not exists public.outfit_cards (
  -- id ชุดใน src/outfits.js — เป็น primary key = หนึ่งสกินมีได้รูปเดียว
  outfit_id  text        primary key,
  image_url  text        not null,
  -- ครอบตัด { x, y, z } (ดู src/crop.js) — x/y 0..1 ตำแหน่งรูปในกรอบ · z ซูม ≥ 1
  crop       jsonb       not null default '{"x":0.5,"y":0.5,"z":1}'::jsonb,
  active     boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table public.outfit_cards enable row level security;

drop policy if exists "อ่านรูปการ์ดชุดที่เปิดอยู่" on public.outfit_cards;
create policy "อ่านรูปการ์ดชุดที่เปิดอยู่" on public.outfit_cards
  for select using (active or public.is_admin());

drop policy if exists "แอดมินจัดการรูปการ์ดชุด" on public.outfit_cards;
create policy "แอดมินจัดการรูปการ์ดชุด" on public.outfit_cards
  for all using (public.is_admin()) with check (public.is_admin());

grant select on public.outfit_cards to anon, authenticated;
grant insert, update, delete on public.outfit_cards to authenticated;   -- ผ่าน policy ข้างบนเฉพาะแอดมิน

-- ── ที่เก็บรูปการ์ด ─────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('cards', 'cards', true)
on conflict (id) do update set public = true;

drop policy if exists "อ่านรูปการ์ดชุด" on storage.objects;
create policy "อ่านรูปการ์ดชุด" on storage.objects
  for select using (bucket_id = 'cards');

drop policy if exists "แอดมินอัปโหลดรูปการ์ดชุด" on storage.objects;
create policy "แอดมินอัปโหลดรูปการ์ดชุด" on storage.objects
  for insert with check (bucket_id = 'cards' and public.is_admin());

drop policy if exists "แอดมินแก้รูปการ์ดชุด" on storage.objects;
create policy "แอดมินแก้รูปการ์ดชุด" on storage.objects
  for update using (bucket_id = 'cards' and public.is_admin());

drop policy if exists "แอดมินลบรูปการ์ดชุด" on storage.objects;
create policy "แอดมินลบรูปการ์ดชุด" on storage.objects
  for delete using (bucket_id = 'cards' and public.is_admin());
