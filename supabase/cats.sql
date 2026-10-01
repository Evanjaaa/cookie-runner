-- supabase/cats.sql
-- ─────────────────────────────────────────────────────────────
-- ระบบน้องแมวจากกล่อง (ช่วงที่ 1)
--
-- รันใน Supabase → SQL Editor ครั้งเดียว
--
-- ข้อมูลน้องแมวไม่ต้องมีตารางใหม่ในช่วงนี้ — เก็บในคอลัมน์ players.extra
-- (ก้อน "pref:cats") ซึ่งซิงก์ขึ้นคลาวด์อยู่แล้ว ไฟล์นี้จึงมีแค่สองเรื่อง:
--
--   1) server_now()  นาฬิกาเซิร์ฟเวอร์ — ความหิว/ง่วง/เพดาน EXP รายวันนับจากเวลาจริง
--                    ถ้าเชื่อนาฬิกาเครื่อง แค่เลื่อนวันที่ในมือถือก็เลี้ยงน้องโตได้ทันที
--                    (ยังไม่รันไฟล์นี้ = เกมใช้นาฬิกาเครื่องไปก่อน ไม่พัง)
--
--   2) ดึงสกินสีขนที่เคยซื้อคืนทั้งหมด — ระบบซื้อสีถูกถอดออกแล้ว
--      สีขาวมุก/ดำสนิท/ปลาสลิด/วิเชียรมาศ/เทาหมอก กลายเป็นสายพันธุ์ของน้องในกล่อง
--      ผู้เล่นที่ใช้สีพวกนั้นอยู่กลับเป็นน้องส้ม (น้องที่ระบายสีเองยังใช้ได้เหมือนเดิม)
--      ไม่คืนทองให้ — ตกลงกันไว้แล้ว (ช่วงนี้มีแต่ผู้ทดสอบที่รู้จักกัน)
--
-- ⚠ ส่วนที่ 2 แก้ข้อมูลผู้เล่น "ทุกคน" ถาวร
-- หลังรัน: ผู้เล่นที่เปิดเกมค้างไว้ควรรีโหลดหน้า
-- ─────────────────────────────────────────────────────────────

-- ── 1) นาฬิกาเซิร์ฟเวอร์ ──
create or replace function public.server_now()
returns timestamptz
language sql
stable
as $$
  select now();
$$;

grant execute on function public.server_now() to anon, authenticated;

-- ── 2) ดึงสกินที่ซื้อคืน ──
-- ตัวที่ยังลงวิ่งได้: orange (น้องส้ม) / mine (น้องระบายสีเอง) / cat:… (น้องจากกล่องที่โตแล้ว)
update public.players
   set skin = 'orange'
 where skin is distinct from 'orange'
   and skin is distinct from 'mine'
   and coalesce(skin, '') not like 'cat:%';

-- รายชื่อสีที่เคยซื้อ (คีย์ skinsOwned ในก้อน extra) ไม่มีใครอ่านแล้ว — ลบทิ้ง
update public.players
   set extra = extra - 'skinsOwned'
 where extra ? 'skinsOwned';

-- ── เช็คผล ──
-- ควรเห็นแค่ orange / mine (และ cat:… ถ้ามีคนเลี้ยงน้องจนโตแล้ว)
select skin, count(*) as players from public.players group by skin order by players desc;
select now() as server_time, public.server_now() as from_function;
