-- supabase/reports.sql
-- ─────────────────────────────────────────────────────────────
-- แจ้งปัญหา (ตั้งค่า → ช่วยเหลือ → แจ้งปัญหา) + ที่เก็บรูปแนบ
--
-- รันไฟล์นี้ใน Supabase → SQL Editor หลังจาก admin.sql แล้ว (ใช้ is_admin())
-- รันซ้ำได้ ไม่พังของเดิม
--
-- ผู้เล่น: ส่งได้ / อ่านได้เฉพาะของตัวเอง · แนบรูปได้ไม่เกิน 2 รูปต่อเรื่อง · ส่งได้ไม่เกิน 5 เรื่องต่อวัน
-- แอดมิน: อ่านทุกเรื่อง เปลี่ยนสถานะ ลบ ได้จาก admin.html แท็บ "แจ้งปัญหา"
-- รูปอยู่ใน bucket "reports" แบบส่วนตัว (ไม่มีลิงก์สาธารณะ) — แอดมินเปิดดูผ่านลิงก์ชั่วคราว
-- ─────────────────────────────────────────────────────────────

create table if not exists public.bug_reports (
  id         uuid        primary key default gen_random_uuid(),
  player_id  uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  category   text        not null default 'อื่น ๆ',
  body       text        not null,
  -- path ใน bucket "reports" (ไม่ใช่ลิงก์เต็ม — bucket เป็นส่วนตัว ต้องขอลิงก์ชั่วคราวตอนเปิดดู)
  images     text[]      not null default '{}',
  -- เครื่อง/เบราว์เซอร์/ขนาดจอ ตอนส่ง ช่วยตามหาบั๊กที่เกิดเฉพาะบางเครื่อง
  device     text        not null default '',
  status     text        not null default 'new',       -- new | seen | done
  admin_note text,
  created_at timestamptz not null default now(),
  constraint bug_reports_body_len   check (length(btrim(body)) between 1 and 1000),
  constraint bug_reports_img_max    check (coalesce(array_length(images, 1), 0) <= 2),
  constraint bug_reports_status_ok  check (status in ('new', 'seen', 'done'))
);

create index if not exists bug_reports_created_idx on public.bug_reports (created_at desc);
create index if not exists bug_reports_player_idx  on public.bug_reports (player_id, created_at desc);

alter table public.bug_reports enable row level security;

drop policy if exists "ส่งเรื่องของตัวเอง" on public.bug_reports;
create policy "ส่งเรื่องของตัวเอง" on public.bug_reports
  for insert with check (player_id = auth.uid() and status = 'new' and admin_note is null);

drop policy if exists "อ่านเรื่องของตัวเอง" on public.bug_reports;
create policy "อ่านเรื่องของตัวเอง" on public.bug_reports
  for select using (player_id = auth.uid() or public.is_admin());

drop policy if exists "แอดมินแก้เรื่อง" on public.bug_reports;
create policy "แอดมินแก้เรื่อง" on public.bug_reports
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "แอดมินลบเรื่อง" on public.bug_reports;
create policy "แอดมินลบเรื่อง" on public.bug_reports
  for delete using (public.is_admin());

grant select, insert on public.bug_reports to authenticated;
grant update, delete on public.bug_reports to authenticated;   -- ผ่าน policy เฉพาะแอดมิน

-- กันส่งรัว: ไม่เกิน 5 เรื่องใน 24 ชั่วโมงต่อคน
create or replace function public.bug_reports_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.bug_reports
      where player_id = new.player_id and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'report_rate_limit' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists bug_reports_rate_limit on public.bug_reports;
create trigger bug_reports_rate_limit
  before insert on public.bug_reports
  for each row execute function public.bug_reports_rate_limit();

-- ── ที่เก็บรูปแนบ (ส่วนตัว) ─────────────────────────────────────
-- ไฟล์ต้องอยู่ในโฟลเดอร์ชื่อ uid ของคนส่งเท่านั้น: reports/<uid>/<ไฟล์>
-- จำกัด 3 MB ต่อไฟล์ และรับเฉพาะรูป (เกมย่อรูปเป็น jpg ก่อนส่งอยู่แล้ว)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reports', 'reports', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = 3145728,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "ผู้เล่นอัปรูปแจ้งปัญหา" on storage.objects;
create policy "ผู้เล่นอัปรูปแจ้งปัญหา" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "อ่านรูปแจ้งปัญหา" on storage.objects;
create policy "อ่านรูปแจ้งปัญหา" on storage.objects
  for select using (
    bucket_id = 'reports'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- เจ้าของลบรูปตัวเองได้ด้วย: ถ้ารูปขึ้นแล้วแต่บันทึกเรื่องไม่ผ่าน (เช่นส่งเกินวันละ 5)
-- เกมจะลบรูปที่เพิ่งอัปทิ้งเอง ไม่ปล่อยไฟล์ค้างในที่เก็บ
drop policy if exists "แอดมินลบรูปแจ้งปัญหา" on storage.objects;
create policy "แอดมินลบรูปแจ้งปัญหา" on storage.objects
  for delete using (
    bucket_id = 'reports'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
