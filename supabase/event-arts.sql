-- supabase/event-arts.sql
-- ─────────────────────────────────────────────────────────────
-- รูปประกอบหน้ากิจกรรม — กิจกรรมละหนึ่งรูป (ใช้ทั้งรูปใหญ่และรูปบนแถบเลือกกิจกรรม)
--
-- รันไฟล์นี้ใน Supabase → SQL Editor หลังจาก admin.sql และ gacha-promo.sql แล้ว (ใช้ is_admin() และที่เก็บรูป promo)
-- รันซ้ำได้ ไม่พังของเดิม
--
-- แอดมินอัปโหลด/จัดรูปได้จาก admin.html แท็บ "รูปกิจกรรม"
-- เกมอ่านเฉพาะรูปที่เปิดอยู่ (active) · กิจกรรมที่ไม่มีรูป = เกมวาดน้องแมวแทน
-- ─────────────────────────────────────────────────────────────

create table if not exists public.event_arts (
  -- id กิจกรรมใน src/quests.js (QUEST_EVENTS) — เป็น primary key = หนึ่งกิจกรรมมีได้รูปเดียว
  event_id   text        primary key,
  image_url  text        not null,
  -- ครอบตัด { x, y, z } (ดู src/crop.js)
  crop       jsonb       not null default '{"x":0.5,"y":0.5,"z":1}'::jsonb,
  active     boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table public.event_arts enable row level security;

drop policy if exists "อ่านรูปกิจกรรมที่เปิดอยู่" on public.event_arts;
create policy "อ่านรูปกิจกรรมที่เปิดอยู่" on public.event_arts
  for select using (active or public.is_admin());

drop policy if exists "แอดมินจัดการรูปกิจกรรม" on public.event_arts;
create policy "แอดมินจัดการรูปกิจกรรม" on public.event_arts
  for all using (public.is_admin()) with check (public.is_admin());

grant select on public.event_arts to anon, authenticated;
grant insert, update, delete on public.event_arts to authenticated;   -- ผ่าน policy ข้างบนเฉพาะแอดมิน
