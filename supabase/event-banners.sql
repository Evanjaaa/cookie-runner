-- supabase/event-banners.sql
-- ─────────────────────────────────────────────────────────────
-- กรอบทางเข้ากิจกรรมบนหน้าแรกของเกม — หน้าตาเป็นเทมเพลตตายตัว แอดมินเปลี่ยนได้แค่ข้อความ รูป และวันสิ้นสุด
--
-- รันไฟล์นี้ใน Supabase → SQL Editor หลังจาก admin.sql และ gacha-promo.sql แล้ว (ใช้ is_admin() และที่เก็บรูป promo)
-- รันซ้ำได้ ไม่พังของเดิม
--
-- แอดมินจัดการได้จาก admin.html แท็บ "กรอบกิจกรรม"
-- เกมอ่านเฉพาะกรอบที่เปิดอยู่ · เลยวันสิ้นสุดแล้วเกมเลิกโชว์เอง · ไม่มีกรอบเลย = เกมโชว์กิจกรรมในโค้ดแทน
-- ─────────────────────────────────────────────────────────────

create table if not exists public.event_banners (
  id         uuid        primary key default gen_random_uuid(),
  kicker     text        not null default 'อีเวนต์พิเศษ',
  title      text        not null,
  -- วันสุดท้ายของกิจกรรม (นับรวมวันนี้ด้วย)
  end_date   date        not null,
  -- id กิจกรรมใน src/quests.js ที่เปิดเมื่อแตะกรอบ · ว่าง = เปิดแท็บแรก
  event_id   text,
  sort       integer     not null default 0,
  active     boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- รูปในกรอบแทนน้องส้ม (ว่าง = น้องส้มกอดปลา) · ไฟล์อยู่ใน bucket "promo" (สร้างโดย gacha-promo.sql — รันไฟล์นั้นก่อน)
alter table public.event_banners add column if not exists image_url text;
-- ครอบตัด { x, y, z } (ดู src/crop.js)
alter table public.event_banners add column if not exists crop jsonb;

-- พื้นหลัง: id ลายสำเร็จรูป (BANNER_BGS ใน src/render/event-banner.js) · bg_image = รูปที่อัปโหลดเอง (มีแล้วใช้รูปนี้แทนลาย)
alter table public.event_banners add column if not exists bg text;
alter table public.event_banners add column if not exists bg_image text;

create index if not exists event_banners_list_idx on public.event_banners (active, sort);

alter table public.event_banners enable row level security;

drop policy if exists "อ่านกรอบกิจกรรมที่เปิดอยู่" on public.event_banners;
create policy "อ่านกรอบกิจกรรมที่เปิดอยู่" on public.event_banners
  for select using (active or public.is_admin());

drop policy if exists "แอดมินจัดการกรอบกิจกรรม" on public.event_banners;
create policy "แอดมินจัดการกรอบกิจกรรม" on public.event_banners
  for all using (public.is_admin()) with check (public.is_admin());

grant select on public.event_banners to anon, authenticated;
grant insert, update, delete on public.event_banners to authenticated;   -- ผ่าน policy ข้างบนเฉพาะแอดมิน

-- ให้ API เห็นคอลัมน์ใหม่ทันที
notify pgrst, 'reload schema';
