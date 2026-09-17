-- supabase/names.sql
-- ─────────────────────────────────────────────────────────────
-- ชื่อผู้เล่น: ยาวไม่เกิน 10 ตัวอักษร และห้ามซ้ำกับคนอื่น
--
-- วิธีใช้: Supabase Dashboard → SQL Editor → New query → วางทั้งไฟล์ → Run
--          ต้องรัน schema.sql มาก่อน / รันซ้ำได้ ไม่พัง
--
-- ── ตั้งชื่อผ่าน claim_name() ──
-- ฟังก์ชันตรวจ "ยาวเกินไหม / มีคนใช้ไหม" แล้วเปลี่ยนชื่อให้ในคำสั่งเดียว
-- ตอบกลับเป็นคำสั้น ๆ ให้เกมเลือกข้อความเตือนเอง:
--   ok       เปลี่ยนชื่อแล้ว
--   taken    มีผู้เล่นอื่นใช้ชื่อนี้อยู่ (ไม่สนตัวพิมพ์เล็ก/ใหญ่)
--   invalid  ว่าง หรือยาวเกิน 10 ตัว
--   signed_out ยังไม่ได้เข้าสู่ระบบ
--
-- ── ทำไมไม่ใช้ unique index ตรง ๆ ──
-- ผู้เล่นเดิมที่ใช้ชื่อซ้ำกันอยู่ก่อนแล้ว (และทุกคนที่ยังเป็น "แมวนิรนาม")
-- จะทำให้สร้าง unique index ไม่สำเร็จ และถ้าไล่เปลี่ยนชื่อคนเก่าให้เองก็เป็นการแก้ของเขาเงียบ ๆ
-- จึงบังคับ "ตอนเปลี่ยนชื่อ" แทน: ชื่อเดิมที่ซ้ำอยู่แล้วใช้ต่อได้ แต่ตั้งชื่อใหม่ซ้ำใครไม่ได้อีก
-- ทริกเกอร์ข้างล่างกันทางอื่นที่แก้ตาราง players ตรง ๆ ด้วย (ไม่ใช่แค่ผ่านฟังก์ชันนี้)
-- ─────────────────────────────────────────────────────────────

create index if not exists players_name_lower on public.players (lower(name));

create or replace function public.claim_name(p_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  clean text := btrim(coalesce(p_name, ''));
begin
  if auth.uid() is null then
    return 'signed_out';
  end if;
  if char_length(clean) = 0 or char_length(clean) > 10 then
    return 'invalid';
  end if;

  -- สองคนกดตั้งชื่อเดียวกันพร้อมกัน: ล็อกตามชื่อไว้ คนที่สองจะรอแล้วเห็นว่าชื่อถูกใช้ไปแล้ว
  perform pg_advisory_xact_lock(hashtext(lower(clean)));

  if exists (
    select 1 from public.players
    where lower(name) = lower(clean) and id <> auth.uid()
  ) then
    return 'taken';
  end if;

  update public.players set name = clean where id = auth.uid();
  return 'ok';
end;
$$;

grant execute on function public.claim_name(text) to authenticated;

-- ── กันทางลัด: อัปเดตตาราง players ตรง ๆ ด้วยชื่อที่ผิดกติกา = ชื่อไม่เปลี่ยน ──
-- ไม่โยน error เพราะคำสั่งอัปเดตอื่น (เช่นซิงก์ทอง) จะพังตามไปทั้งแถว
-- ค่าเริ่มต้น "แมวนิรนาม" ยกเว้นไว้ ทุกบัญชีใหม่เริ่มด้วยชื่อนี้เหมือนกันหมด
create or replace function public.players_name_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.name is distinct from old.name then
    if new.name is null
       or char_length(btrim(new.name)) = 0
       or char_length(new.name) > 10 then
      new.name := old.name;
    elsif new.name <> 'แมวนิรนาม' and exists (
      select 1 from public.players
      where lower(name) = lower(new.name) and id <> new.id
    ) then
      new.name := old.name;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists players_name_guard on public.players;
create trigger players_name_guard
  before update of name on public.players
  for each row execute function public.players_name_guard();
