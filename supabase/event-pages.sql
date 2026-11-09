-- supabase/event-pages.sql
-- ─────────────────────────────────────────────────────────────
-- ข้อมูลหน้ากิจกรรมจากหลังบ้าน (แท็บ "รูปกิจกรรม")
--   แถวที่ id ตรงกับกิจกรรมใน src/quests.js = ทับแค่วันที่กับรูปเล็กของภารกิจ (name / quests ว่าง)
--   แถวอื่น = กิจกรรมที่แอดมินสร้างเองทั้งหน้า
--
-- รันไฟล์นี้ใน Supabase → SQL Editor หลังจาก admin.sql แล้ว (ใช้ is_admin()) · รันซ้ำได้ ไม่พังของเดิม
-- ─────────────────────────────────────────────────────────────

create table if not exists public.event_pages (
  id         text        primary key,
  name       text,
  start_date date,
  -- วันสุดท้ายของกิจกรรม (นับรวมวันนี้ด้วย)
  end_date   date,
  -- ภารกิจของกิจกรรมที่สร้างเอง: [{ id, name, note, stat, goal, gems, gold }] · goal เป็นค่าดิบของตัวนับ
  -- กิจกรรมในโค้ด: null = ปกติ · [] = แอดมินกดลบออกจากเกม (กู้คืนได้)
  quests     jsonb,
  -- รูปเล็กของภารกิจ { id ภารกิจ: ลิงก์รูป }
  icons      jsonb       not null default '{}'::jsonb,
  sort       integer     not null default 0,
  active     boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table public.event_pages enable row level security;

drop policy if exists "อ่านหน้ากิจกรรมที่เปิดอยู่" on public.event_pages;
create policy "อ่านหน้ากิจกรรมที่เปิดอยู่" on public.event_pages
  for select using (active or public.is_admin());

drop policy if exists "แอดมินจัดการหน้ากิจกรรม" on public.event_pages;
create policy "แอดมินจัดการหน้ากิจกรรม" on public.event_pages
  for all using (public.is_admin()) with check (public.is_admin());

grant select on public.event_pages to anon, authenticated;
grant insert, update, delete on public.event_pages to authenticated;   -- ผ่าน policy ข้างบนเฉพาะแอดมิน

-- ให้ API เห็นตารางใหม่ทันที
notify pgrst, 'reload schema';
