-- supabase/mail.sql
-- ─────────────────────────────────────────────────────────────
-- จดหมายกับของขวัญที่แอดมินส่งให้ผู้เล่น
--
-- รันไฟล์นี้ใน Supabase → SQL Editor หลังจากรัน schema.sql กับ admin.sql แล้ว
-- รันซ้ำได้ ไม่พังของเดิม
--
-- ── ทำไมต้องเป็นตารางแยก ไม่เขียนลง players.mail ตรง ๆ ──
-- players.mail เป็นก้อน jsonb ของใครของมัน ที่ตัวเกมดันขึ้นมาทับทั้งก้อนทุกครั้ง
-- ที่ซิงก์ ถ้าแอดมินเขียนของขวัญลงไปตอนที่เจ้าของกำลังออนไลน์อยู่
-- การซิงก์ครั้งถัดไปของเขาจะทับของขวัญนั้นหายไปเงียบ ๆ โดยไม่มีใครรู้ตัว
--
-- แยกเป็นตารางของตัวเองแล้วปัญหานี้หมดไป เพราะไคลเอนต์ไม่เคยเขียนตารางนี้เลย
-- มันได้แค่ "อ่าน" กับ "เรียก RPC เพื่อกดรับ" เท่านั้น
--
-- ── ทำไมสถานะกดรับต้องอยู่คนละตาราง ──
-- ถ้าเก็บ claimed ไว้ในเครื่องอย่างเดียว ใครล้าง localStorage ก็กดรับของซ้ำได้เรื่อย ๆ
-- ตาราง mail_claims เป็นตัวชี้ขาดว่าใครรับอะไรไปแล้ว และเป็น primary key คู่
-- (player_id, mail_id) ฝั่งฐานข้อมูลจึงกันการรับซ้ำให้เอง ไม่ต้องเชื่อไคลเอนต์
-- ─────────────────────────────────────────────────────────────

-- ── กล่องส่ง ────────────────────────────────────────────────
--
-- to_player = null หมายถึงส่งทั้งเซิร์ฟ ตอนนี้หน้าแอดมินยังส่งได้ทีละคน
-- แต่ทำคอลัมน์เผื่อไว้ตั้งแต่แรก เพราะการเติมทีหลังแปลว่าต้องย้ายข้อมูลเก่า
-- ส่วนแบบทั้งเซิร์ฟใช้แถวเดียวไม่ว่าจะมีผู้เล่นกี่คน จึงไม่มีต้นทุนอะไรที่จะเผื่อไว้
create table if not exists public.mail_outbox (
  id         uuid        primary key default gen_random_uuid(),
  to_player  uuid        references public.players on delete cascade,
  sender     text        not null default 'ทีมงาน MeowZing',
  title      text        not null,
  body       text        not null default '',
  gold       bigint      not null default 0,
  gems       bigint      not null default 0,
  sent_by    uuid        references auth.users on delete set null,
  sent_at    timestamptz not null default now(),
  constraint mail_gift_not_negative check (gold >= 0 and gems >= 0),
  constraint mail_title_not_blank   check (length(btrim(title)) > 0)
);

-- ผู้เล่นเปิดเกมทีก็ถามว่า "มีอะไรถึงฉันบ้าง" ครั้งหนึ่งเสมอ
create index if not exists mail_outbox_to_player_idx
  on public.mail_outbox (to_player, sent_at desc);

alter table public.mail_outbox enable row level security;

-- ── สถานะกดรับ ─────────────────────────────────────────────
create table if not exists public.mail_claims (
  player_id  uuid        not null references public.players on delete cascade,
  mail_id    uuid        not null references public.mail_outbox on delete cascade,
  claimed_at timestamptz not null default now(),
  primary key (player_id, mail_id)
);

alter table public.mail_claims enable row level security;

-- ── สิทธิ์ ──────────────────────────────────────────────────

-- ผู้เล่นเห็นเฉพาะฉบับที่ถึงตัวเอง กับฉบับที่ส่งทั้งเซิร์ฟ
drop policy if exists "อ่านจดหมายของตัวเอง" on public.mail_outbox;
create policy "อ่านจดหมายของตัวเอง" on public.mail_outbox
  for select using (to_player = auth.uid() or to_player is null);

-- ไคลเอนต์เขียนตารางนี้ไม่ได้เลย แม้แต่แถวของตัวเอง — ส่งได้เฉพาะแอดมิน
drop policy if exists "แอดมินจัดการจดหมายได้ทั้งหมด" on public.mail_outbox;
create policy "แอดมินจัดการจดหมายได้ทั้งหมด" on public.mail_outbox
  for all using (public.is_admin()) with check (public.is_admin());

-- อ่านได้ว่าตัวเองรับอะไรไปแล้ว แต่ "เขียน" ต้องผ่าน claim_mail() เท่านั้น
-- ถ้าปล่อยให้ insert เองได้ ผู้เล่นจะกาว่ารับแล้วโดยไม่ได้ของ ซึ่งไม่มีใครอยากทำ
-- แต่ที่อันตรายกว่าคือ "ลบ" ทิ้งเพื่อกดรับใหม่ จึงไม่เปิดสิทธิ์เขียนไว้เลย
drop policy if exists "อ่านสถานะรับของของตัวเอง" on public.mail_claims;
create policy "อ่านสถานะรับของของตัวเอง" on public.mail_claims
  for select using (player_id = auth.uid());

drop policy if exists "แอดมินดูสถานะรับของได้ทั้งหมด" on public.mail_claims;
create policy "แอดมินดูสถานะรับของได้ทั้งหมด" on public.mail_claims
  for select using (public.is_admin());

-- ── กดรับของขวัญ ───────────────────────────────────────────
--
-- ฟังก์ชันนี้ "ไม่บวกทองกับเพชรให้" โดยตั้งใจ — มันบันทึกแค่ว่าใครรับฉบับไหนแล้ว
-- แล้วคืนจำนวนกลับไปให้ไคลเอนต์เป็นคนเติมเอง
--
-- ── ทำไมไม่บวกให้ตรงนี้ ทั้งที่ดูปลอดภัยกว่า ──
-- ทั้งเกมใช้รูปแบบเดียวกันหมดคือแก้ค่าในเครื่องก่อนแล้วค่อยซิงก์ขึ้นมาทับ
-- (กาช่า ตีบวกสมบัติ เก็บของในด่าน ทุกอย่างเป็นแบบนี้)
-- ถ้าจดหมายเป็นข้อยกเว้นที่บวกให้ฝั่งฐานข้อมูล จะกลายเป็นบวกสองรอบทันที:
-- ฐานข้อมูลบวกให้หนึ่งครั้ง แล้วไคลเอนต์ที่ต้องอัปเดตตัวเลขบนจอก็บวกอีกครั้ง
-- พอซิงก์รอบถัดไปดึงค่าจากคลาวด์ลงมา ยอดจะเพี้ยนไปเรื่อย ๆ แก้ทีหลังยากมาก
--
-- ส่วนเรื่องความปลอดภัย การบวกฝั่งฐานข้อมูลไม่ได้ช่วยอะไรเพิ่มอยู่แล้ว
-- เพราะทองกับเพชรเป็นค่าที่ไคลเอนต์เขียนเองได้ตั้งแต่ต้น (RLS ให้แก้แถวตัวเองได้)
-- สิ่งที่ต้องกันจริง ๆ คือ "กดรับซ้ำ" ซึ่งตาราง mail_claims กันให้แล้ว
--
-- ตัวกันรับซ้ำคือ on conflict do nothing บน primary key คู่ ถ้าไม่มีแถวใหม่เกิดขึ้น
-- แปลว่าเคยรับไปแล้ว จึงคืน claimed=false โดยไม่คืนจำนวนอะไรเลย
-- วิธีนี้ปลอดภัยแม้จะมีคำขอสองอันวิ่งเข้ามาพร้อมกัน เพราะฐานข้อมูลตัดสินให้เอง
create or replace function public.claim_mail(p_mail_id uuid)
returns table (claimed boolean, gold bigint, gems bigint)
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid  uuid := auth.uid();
  v_mail public.mail_outbox%rowtype;
  v_new  integer;
begin
  if v_uid is null then
    raise exception 'ต้องเข้าสู่ระบบก่อน';
  end if;

  -- อ่านด้วยสิทธิ์เจ้าของฟังก์ชัน จึงต้องเช็คเองว่าฉบับนี้ถึงคนนี้จริง
  -- (RLS ไม่ทำงานข้างใน security definer)
  select * into v_mail
  from public.mail_outbox m
  where m.id = p_mail_id
    and (m.to_player = v_uid or m.to_player is null);

  if not found then
    raise exception 'ไม่พบจดหมายฉบับนี้';
  end if;

  insert into public.mail_claims (player_id, mail_id)
  values (v_uid, p_mail_id)
  on conflict do nothing;

  get diagnostics v_new = row_count;

  if v_new = 0 then
    return query select false, 0::bigint, 0::bigint;
  else
    return query select true, v_mail.gold, v_mail.gems;
  end if;
end;
$fn$;

revoke all on function public.claim_mail(uuid) from public;
grant execute on function public.claim_mail(uuid) to authenticated;

-- ── มุมมองสำหรับหน้าแอดมิน ─────────────────────────────────
--
-- แนบชื่อผู้รับกับจำนวนคนที่กดรับแล้วมาให้เลย หน้าเว็บจะได้ไม่ต้องยิงตามทีละฉบับ
create or replace view public.admin_mail
with (security_invoker = true)
as
select
  m.id,
  m.to_player,
  coalesce(p.name, case when m.to_player is null then 'ทั้งเซิร์ฟ' else '(ถูกลบแล้ว)' end) as to_name,
  m.sender,
  m.title,
  m.body,
  m.gold,
  m.gems,
  m.sent_at,
  (select count(*) from public.mail_claims c where c.mail_id = m.id) as claims
from public.mail_outbox m
left join public.players p on p.id = m.to_player
order by m.sent_at desc;

grant select on public.admin_mail to authenticated;
