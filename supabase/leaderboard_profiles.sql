-- supabase/leaderboard_profiles.sql
-- ─────────────────────────────────────────────────────────────
-- กระดานคะแนนที่ "แตะชื่อแล้วส่องโปรไฟล์ได้" + รูปหน้าน้องหน้าชื่อ
--
-- ต้องรันหลัง schema.sql และ friends.sql (ใช้คอลัมน์ friend_code / last_seen / public_profile)
-- รันซ้ำได้ (create or replace)
--
-- ── ทำไมไม่แก้ view leaderboard เดิม ──
-- leaderboard เดิมอ่านได้แม้ยังไม่เข้าสู่ระบบ (anon) และตั้งใจไม่มี player_id
-- view ใหม่นี้อ่านได้เฉพาะคนที่เข้าสู่ระบบแล้ว (authenticated) — ระดับเดียวกับ public_profiles
-- ซึ่งคนที่เข้าสู่ระบบอ่าน id / ชื่อ / รหัสแมวน้อย / โปรไฟล์สาธารณะของทุกคนได้อยู่แล้ว (ค้นหาเพื่อน)
-- จึงไม่ได้เปิดข้อมูลใหม่ที่ไม่เคยเปิด แค่เอามาต่อกับคะแนน
-- ทอง เพชร อีเมล และของในกระเป๋าไม่อยู่ในนี้
--
-- ยังไม่ได้รันไฟล์นี้ = เกมถอยไปใช้ leaderboard เดิม (ไม่มีรูป แตะชื่อไม่ได้) ไม่พัง
-- ─────────────────────────────────────────────────────────────

create or replace view public.leaderboard_profiles
with (security_invoker = off) as
  select
    b.stage_id,
    b.score,
    b.distance,
    b.updated_at,
    p.id,
    p.name,
    p.friend_code,
    p.last_seen,
    p.public_profile
  from public.best_scores b
  join public.players p on p.id = b.player_id;

revoke all on public.leaderboard_profiles from anon;
grant select on public.leaderboard_profiles to authenticated;
