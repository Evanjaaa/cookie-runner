-- supabase/mail_welcome.sql
-- ─────────────────────────────────────────────────────────────
-- จดหมายพิเศษ "ต้อนรับบัญชีใหม่" + ปิด/เปิดจดหมายได้
--
-- รันไฟล์นี้ใน Supabase → SQL Editor หลังจาก mail.sql (และ friends.sql) แล้ว
-- รันซ้ำได้ ไม่พังของเดิม
--
-- ── จดหมายมีสามแบบ ──
--   ทีละคน       to_player = ผู้รับ,  kind = 'normal'
--   ทั้งเซิร์ฟ    to_player = null,    kind = 'normal'   ทุกคนเห็น รวมคนที่สมัครทีหลัง
--   ต้อนรับ      to_player = null,    kind = 'welcome'  เห็นเฉพาะบัญชีที่ "สร้างหลังจาก"
--                                                        ตั้งจดหมายฉบับนี้ (sent_at)
--
-- ── ทำไมจดหมายต้อนรับไม่สร้างแถวใหม่ให้ทุกคนที่สมัคร ──
-- ใช้แถวเดียวแล้วเทียบวันสร้างบัญชีกับ sent_at แทน ผลคือ:
--   • แก้ข้อความ/ของขวัญที่แถวเดียว คนที่สมัครต่อจากนี้ได้ฉบับใหม่ทันที
--   • ไม่ต้องมี trigger ตอนสมัคร ซึ่งถ้าพังจะทำให้สมัครไม่ได้ทั้งเกม
--   • ผู้เล่นเก่าไม่ได้ของซ้ำ เพราะบัญชีเขาสร้างก่อนวันที่ตั้งจดหมาย
--
-- ── active ──
-- false = ยกเลิก: ซ่อนจากทุกคนที่ยังไม่ได้รับ และกดรับไม่ได้อีก
-- (คนที่กดรับไปแล้วได้ของไปแล้ว ถอนคืนไม่ได้) เปิดกลับได้ด้วยการตั้งเป็น true
-- ─────────────────────────────────────────────────────────────

alter table public.mail_outbox
  add column if not exists kind       text        not null default 'normal',
  add column if not exists active     boolean     not null default true,
  add column if not exists updated_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'mail_kind_valid') then
    alter table public.mail_outbox
      add constraint mail_kind_valid check (kind in ('normal', 'welcome'));
  end if;
  -- จดหมายต้อนรับต้องไม่ระบุผู้รับ (ส่งให้ "บัญชีใหม่ทุกบัญชี" ไม่ใช่คนใดคนหนึ่ง)
  if not exists (select 1 from pg_constraint where conname = 'mail_welcome_no_player') then
    alter table public.mail_outbox
      add constraint mail_welcome_no_player check (kind <> 'welcome' or to_player is null);
  end if;
end $$;

-- ── ใครเห็นฉบับไหน ──────────────────────────────────────────
-- เงื่อนไขเดียวกันใช้สองที่ (policy กับ claim_mail) จึงรวมเป็นฟังก์ชันเดียว
-- ถ้าเขียนแยก วันหนึ่งจะแก้ที่เดียวแล้วเห็นจดหมายแต่กดรับไม่ได้ (หรือกลับกัน)
create or replace function public.mail_visible_to(
  p_uid uuid, p_to uuid, p_kind text, p_active boolean, p_sent timestamptz
)
returns boolean
language sql
security definer
stable
set search_path = public
as $fn$
  select p_uid is not null and p_active and (
    p_to = p_uid
    or (p_to is null and p_kind = 'normal')
    or (p_to is null and p_kind = 'welcome' and exists (
      select 1 from public.players pl where pl.id = p_uid and pl.created_at >= p_sent
    ))
  );
$fn$;

revoke all on function public.mail_visible_to(uuid, uuid, text, boolean, timestamptz) from public;
grant execute on function public.mail_visible_to(uuid, uuid, text, boolean, timestamptz) to authenticated;

drop policy if exists "อ่านจดหมายของตัวเอง" on public.mail_outbox;
create policy "อ่านจดหมายของตัวเอง" on public.mail_outbox
  for select using (public.mail_visible_to(auth.uid(), to_player, kind, active, sent_at));

-- ── กดรับ: เงื่อนไขเดียวกับที่มองเห็น ────────────────────────
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

  select * into v_mail
  from public.mail_outbox m
  where m.id = p_mail_id
    and public.mail_visible_to(v_uid, m.to_player, m.kind, m.active, m.sent_at);

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

-- ── มุมมองหน้าแอดมิน: เติมชนิด สถานะ วันแก้ล่าสุด และจำนวนบัญชีที่มีสิทธิ์ ──
-- คอลัมน์ใหม่ต่อท้ายเท่านั้น (create or replace view เพิ่มคอลัมน์ได้แค่ท้ายสุด)
create or replace view public.admin_mail
with (security_invoker = true)
as
select
  m.id,
  m.to_player,
  coalesce(p.name, case
    when m.kind = 'welcome'  then 'บัญชีใหม่ทุกบัญชี'
    when m.to_player is null then 'ทั้งเซิร์ฟ'
    else '(ถูกลบแล้ว)' end) as to_name,
  m.sender,
  m.title,
  m.body,
  m.gold,
  m.gems,
  m.sent_at,
  (select count(*) from public.mail_claims c where c.mail_id = m.id) as claims,
  m.kind,
  m.active,
  m.updated_at,
  p.friend_code as to_code,
  -- จดหมายต้อนรับ: มีบัญชีที่สร้างหลังวันตั้งจดหมายกี่บัญชี (= ส่งถึงไปแล้วกี่คน)
  case when m.kind = 'welcome'
    then (select count(*) from public.players np where np.created_at >= m.sent_at)
  end as eligible
from public.mail_outbox m
left join public.players p on p.id = m.to_player
order by m.sent_at desc;

grant select on public.admin_mail to authenticated;
