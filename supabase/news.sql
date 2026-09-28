-- supabase/news.sql
-- ─────────────────────────────────────────────────────────────
-- ข่าวสาร / ประกาศ (ปุ่มโทรโข่งหน้าแรก) + ที่เก็บรูปของข่าว
--
-- รันไฟล์นี้ใน Supabase → SQL Editor หลังจาก admin.sql แล้ว (ใช้ is_admin())
-- รันซ้ำได้ ไม่พังของเดิม
--
-- ผู้เล่นอ่านได้เฉพาะข่าวที่เปิดอยู่ (active) · แอดมินเพิ่ม/แก้/ซ่อน/ลบได้จากหน้า admin.html แท็บ "ข่าวสาร"
-- รูปอัปโหลดขึ้น bucket "news" (สาธารณะ อ่านได้ทุกคน อัปโหลดได้เฉพาะแอดมิน)
-- ─────────────────────────────────────────────────────────────

create table if not exists public.news (
  id         uuid        primary key default gen_random_uuid(),
  title      text        not null,
  body       text        not null default '',
  image_url  text,
  -- ป้ายสั้น ๆ บนหัวข่าว เช่น ประกาศ / กิจกรรม / อัปเดต / ของขวัญ
  tag        text        not null default 'ประกาศ',
  -- วันที่ที่โชว์บนข่าว (ตั้งเองได้ ไม่จำเป็นต้องเท่าวันที่สร้าง)
  news_date  date        not null default current_date,
  -- ปักหมุด = ขึ้นบนสุดของรายการเสมอ
  pinned     boolean     not null default false,
  active     boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint news_title_not_blank check (length(btrim(title)) > 0)
);

create index if not exists news_list_idx on public.news (active, pinned desc, news_date desc);

alter table public.news enable row level security;

drop policy if exists "อ่านข่าวที่เปิดอยู่" on public.news;
create policy "อ่านข่าวที่เปิดอยู่" on public.news
  for select using (active or public.is_admin());

drop policy if exists "แอดมินจัดการข่าว" on public.news;
create policy "แอดมินจัดการข่าว" on public.news
  for all using (public.is_admin()) with check (public.is_admin());

grant select on public.news to anon, authenticated;
grant insert, update, delete on public.news to authenticated;   -- ผ่าน policy ข้างบนเฉพาะแอดมิน

-- ── ที่เก็บรูปข่าว ─────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('news', 'news', true)
on conflict (id) do update set public = true;

drop policy if exists "อ่านรูปข่าว" on storage.objects;
create policy "อ่านรูปข่าว" on storage.objects
  for select using (bucket_id = 'news');

drop policy if exists "แอดมินอัปโหลดรูปข่าว" on storage.objects;
create policy "แอดมินอัปโหลดรูปข่าว" on storage.objects
  for insert with check (bucket_id = 'news' and public.is_admin());

drop policy if exists "แอดมินแก้รูปข่าว" on storage.objects;
create policy "แอดมินแก้รูปข่าว" on storage.objects
  for update using (bucket_id = 'news' and public.is_admin());

drop policy if exists "แอดมินลบรูปข่าว" on storage.objects;
create policy "แอดมินลบรูปข่าว" on storage.objects
  for delete using (bucket_id = 'news' and public.is_admin());
