// src/net/cloud.js
// ─────────────────────────────────────────────────────────────
// ห่อ Supabase ไว้ชั้นเดียว ไฟล์นี้ไม่รู้จักกติกาเกมเลย
// รู้แค่ "ต่อฐานข้อมูล เข้าสู่ระบบ อ่านแถว เขียนแถว"
//
// กติกาสำคัญของทั้งไฟล์: ทุกฟังก์ชันห้ามโยน error ออกไป
// เน็ตหลุด คีย์ผิด โดนบล็อก — เกมต้องเล่นต่อได้ด้วยข้อมูลในเครื่องเสมอ
// ระบบคลาวด์เป็น "ของแถมที่ทำให้ข้ามเครื่องได้" ไม่ใช่สิ่งที่เกมขาดไม่ได้
//
// ฝั่งอ่าน/เขียนข้อมูลจึงคืนค่าว่าง ๆ เวลาพัง ส่วนฝั่งเข้าสู่ระบบคืน { ok, error }
// เพราะหน้าจอต้องบอกผู้เล่นให้ได้ว่าพลาดเพราะอะไร ไม่ใช่เงียบไปเฉย ๆ
// ─────────────────────────────────────────────────────────────
const URL = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** ไม่ได้ตั้งคีย์ = ทำงานแบบออฟไลน์ล้วน เหมือนก่อนมี Supabase ทุกประการ */
export const cloudReady = Boolean(URL && ANON);

let sb = null;
let uid = null;
let account = null;   // { id, email } ของ session ปัจจุบัน — null = ยังไม่ได้เข้าสู่ระบบ

/**
 * โหลด SDK แบบไดนามิก ไม่ใช่ import ไว้ด้านบนไฟล์
 *
 * ตัว SDK หนักราว 29KB gzip ซึ่งพอ ๆ กับตัวเกมทั้งเกม ถ้า import ไว้ด้านบน
 * คนที่เปิดเว็บตอนยังไม่ได้ตั้งคีย์ (หรือ build ที่ไม่ได้ตั้ง) ก็ต้องโหลดฟรี ๆ
 * ย้ายมาโหลดตอนใช้จริง Vite จะแยกเป็นไฟล์ต่างหากให้เอง
 *
 * เพราะบรรทัดนี้ ไฟล์อื่นจึง import ไฟล์นี้แบบธรรมดาได้โดยไม่ลาก SDK ตามมาด้วย
 */
async function client() {
  if (!cloudReady) return null;
  if (!sb) {
    const { createClient } = await import('@supabase/supabase-js');
    sb = createClient(URL, ANON, {
      auth: {
        persistSession: true,      // เก็บ session ไว้ กลับมาเปิดใหม่ได้บัญชีเดิม
        autoRefreshToken: true,
        // การเข้าด้วยอีเมลใช้ "รหัส 6 หลัก" ไม่ใช่ลิงก์เวทมนตร์ จึงไม่มี redirect
        // ให้ต้องตรวจ — และรหัสยังเชื่อถือได้กว่าบนมือถือ เพราะลิงก์ในเมลมักเปิด
        // ในเบราว์เซอร์ของแอปเมล ซึ่งเป็นคนละที่กับแท็บที่เปิดเกมค้างไว้
        detectSessionInUrl: false,
      },
    });
  }
  return sb;
}

export function userId() {
  return uid;
}

/** ข้อมูลบัญชีที่กำลังใช้อยู่ ให้หน้าตั้งค่าเอาไปโชว์ — null = ยังไม่ได้เข้าสู่ระบบ */
export function currentAccount() {
  return account;
}

/**
 * จำผู้ใช้ที่เพิ่งได้มา
 *
 * นิยาม "ผู้มาเยือน" ที่นี่คือ "ยังไม่มีอีเมลผูกไว้" ไม่ได้ดูธง is_anonymous
 * เพราะสิ่งที่ผู้เล่นสนใจจริง ๆ คือ "ล้างเบราว์เซอร์แล้วกู้คืนได้ไหม"
 * ซึ่งขึ้นกับว่ามีอีเมลให้ส่งรหัสกลับมาหรือเปล่าเท่านั้น
 */
function remember(user) {
  account = user ? { id: user.id, email: user.email || '' } : null;
  uid = account ? account.id : null;
  return uid;
}

// ── แปลง error ของ Supabase เป็นภาษาคน ───────────────────────
// ข้อความดิบเป็นภาษาอังกฤษล้วนและอ่านแล้วไม่รู้ว่าต้องทำอะไรต่อ
// สามตัวแรกคือ "ลืมเปิดสวิตช์ใน Dashboard" ซึ่งเจอบ่อยที่สุดตอนตั้งระบบครั้งแรก
const AUTH_MSG = {
  anonymous_provider_disabled: 'ยังไม่ได้เปิด Anonymous Sign-Ins ใน Supabase',
  email_provider_disabled: 'ยังไม่ได้เปิดการเข้าสู่ระบบด้วยอีเมลใน Supabase',
  otp_disabled: 'ยังไม่ได้เปิดการส่งรหัสทางอีเมลใน Supabase',
  otp_expired: 'รหัสหมดอายุแล้ว กดขอรหัสใหม่อีกครั้ง',
  over_email_send_rate_limit: 'ขอรหัสถี่เกินไป รออีกสักครู่แล้วค่อยลองใหม่',
  over_request_rate_limit: 'ลองบ่อยเกินไป รอสักครู่แล้วค่อยลองใหม่',
  email_exists: 'อีเมลนี้มีบัญชีอยู่แล้ว ใช้ปุ่ม "เข้าด้วยอีเมล" แทน',
  identity_already_exists: 'อีเมลนี้ผูกกับอีกบัญชีไปแล้ว',
  email_address_invalid: 'รูปแบบอีเมลไม่ถูกต้อง',
  validation_failed: 'กรอกข้อมูลไม่ครบหรือรูปแบบไม่ถูกต้อง',
};

function authError(e) {
  const code = e?.code || e?.error_code || '';
  if (AUTH_MSG[code]) return AUTH_MSG[code];

  const msg = String(e?.message || e || '');
  if (/expired|invalid/i.test(msg)) return 'รหัสไม่ถูกต้องหรือหมดอายุแล้ว';
  if (/fetch|network/i.test(msg)) return 'ต่อเน็ตไม่ได้ ลองใหม่อีกครั้ง';
  return msg || 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง';
}

const NO_CLOUD = { ok: false, error: 'ยังไม่ได้ตั้งค่าฐานข้อมูล' };

// ── เข้าสู่ระบบ ──────────────────────────────────────────────

/**
 * กู้ session เดิมที่ค้างอยู่ในเครื่อง — ไม่สร้างบัญชีใหม่ให้เอง
 *
 * แยกจาก signInGuest() เพราะการสร้างบัญชีต้องเกิดตอนผู้เล่นกดปุ่มเท่านั้น
 * ถ้าสร้างให้เงียบ ๆ ตอนเปิดหน้า คนที่แค่เปิดเว็บดูเฉย ๆ ก็จะกลายเป็นแถวขยะ
 * ใน auth.users ทุกครั้งที่เปิด
 */
export async function restoreSession() {
  const c = await client();
  if (!c) return null;
  try {
    const { data } = await c.auth.getSession();
    return remember(data?.session?.user || null);
  } catch (e) {
    console.warn('[cloud] อ่าน session เดิมไม่ได้', e.message || e);
    return null;
  }
}

/**
 * เข้าสู่ระบบแบบผู้มาเยือน (ไม่ระบุตัวตน)
 *
 * ผู้เล่นไม่ต้องกรอกอะไรเลย แต่ได้ user id จริงที่ RLS เอาไปใช้กันคนอื่นแก้ข้อมูลได้
 *
 * ข้อแลกเปลี่ยน: ล้างข้อมูลเบราว์เซอร์ = เสีย session = กลายเป็นผู้เล่นใหม่
 * ทางแก้คือผูกอีเมลทีหลังด้วย sendLinkCode() ซึ่ง user id ไม่เปลี่ยน ของเดิมอยู่ครบ
 */
export async function signInGuest() {
  const c = await client();
  if (!c) return NO_CLOUD;

  try {
    // มี session ค้างอยู่ก็ใช้ตัวเดิม อย่าสร้างซ้อน ไม่งั้นบัญชีเก่าจะกลายเป็นบัญชีลอย
    const { data: got } = await c.auth.getSession();
    if (got?.session?.user) return { ok: true, id: remember(got.session.user) };

    const { data, error } = await c.auth.signInAnonymously();
    if (error) throw error;
    return { ok: true, id: remember(data.user) };
  } catch (e) {
    console.warn('[cloud] เข้าสู่ระบบไม่ได้', e.message || e);
    return { ok: false, error: authError(e) };
  }
}

/** ส่งรหัส 6 หลักไปที่อีเมล เพื่อ "เข้าสู่ระบบด้วยอีเมล" (มีบัญชีอยู่แล้วหรือสร้างใหม่) */
export async function sendLoginCode(email) {
  const c = await client();
  if (!c) return NO_CLOUD;
  try {
    const { error } = await c.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: authError(e) };
  }
}

export async function verifyLoginCode(email, token) {
  const c = await client();
  if (!c) return NO_CLOUD;
  try {
    const { data, error } = await c.auth.verifyOtp({ email, token, type: 'email' });
    if (error) throw error;
    return { ok: true, id: remember(data.user) };
  } catch (e) {
    return { ok: false, error: authError(e) };
  }
}

/**
 * ผูกอีเมลเข้ากับบัญชีที่เล่นอยู่ — ยกระดับผู้มาเยือนเป็นบัญชีถาวร
 * user id ไม่เปลี่ยน ทอง ชุด สถิติ จึงอยู่ครบทุกอย่าง ไม่ต้องย้ายข้อมูลเลยสักนิด
 */
export async function sendLinkCode(email) {
  const c = await client();
  if (!c) return NO_CLOUD;
  try {
    const { error } = await c.auth.updateUser({ email });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: authError(e) };
  }
}

/** รหัสที่ส่งมาตอนผูกอีเมลเป็นคนละชนิดกับตอนล็อกอิน ต้องใช้ type 'email_change' */
export async function verifyLinkCode(email, token) {
  const c = await client();
  if (!c) return NO_CLOUD;
  try {
    const { data, error } = await c.auth.verifyOtp({ email, token, type: 'email_change' });
    if (error) throw error;

    // บาง flow คืน user ที่ยังไม่มีอีเมลติดมา ถามซ้ำอีกทีให้ชัวร์ก่อนเอาไปโชว์
    let user = data.user;
    if (!user?.email) {
      const { data: fresh } = await c.auth.getUser();
      if (fresh?.user) user = fresh.user;
    }
    remember(user);
    return { ok: true, email: (account && account.email) || email };
  } catch (e) {
    return { ok: false, error: authError(e) };
  }
}

export async function signOut() {
  const c = await client();
  if (!c) return { ok: true };
  try {
    await c.auth.signOut();
  } catch (e) {
    console.warn('[cloud] ออกจากระบบไม่สมบูรณ์', e.message || e);
  }
  remember(null);
  return { ok: true };
}

// ── ข้อมูลผู้เล่น ────────────────────────────────────────────

/** อ่านแถวผู้เล่นของตัวเอง — คืน null ถ้าอ่านไม่ได้หรือยังไม่มีแถว */
export async function fetchPlayer() {
  const c = await client();
  if (!c || !uid) return null;
  try {
    const { data, error } = await c
      .from('players')
      .select(
        'gold, owned, outfit, skin, stage, name, '
        + 'gems, treasures, equip, xp, stats, quests_claimed, mail',
      )
      .eq('id', uid)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn('[cloud] อ่านข้อมูลผู้เล่นไม่ได้', e.message || e);
    return null;
  }
}

/** อ่านสถิติสูงสุดทุกด่านของตัวเอง คืนเป็น { stageId: score } */
export async function fetchBests() {
  const c = await client();
  if (!c || !uid) return {};
  try {
    const { data, error } = await c
      .from('best_scores')
      .select('stage_id, score')
      .eq('player_id', uid);
    if (error) throw error;
    return Object.fromEntries((data || []).map((r) => [r.stage_id, Number(r.score) || 0]));
  } catch (e) {
    console.warn('[cloud] อ่านสถิติไม่ได้', e.message || e);
    return {};
  }
}

/** เขียนทับแถวผู้เล่น — upsert เพราะทริกเกอร์อาจยังสร้างแถวไม่ทัน */
export async function pushPlayer(state) {
  const c = await client();
  if (!c || !uid) return false;
  try {
    const { error } = await c.from('players').upsert({ id: uid, ...state });
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('[cloud] บันทึกข้อมูลผู้เล่นไม่ได้', e.message || e);
    return false;
  }
}

/**
 * ส่งคะแนนผ่านฟังก์ชันฝั่งฐานข้อมูล ไม่ได้เขียนตารางตรง ๆ
 * ฐานข้อมูลเป็นคนเทียบเองว่าสูงกว่าเดิมมั้ย ไคลเอนต์จึงลดสถิติตัวเองไม่ได้
 */
export async function pushScore(stageId, score, distance) {
  const c = await client();
  if (!c || !uid) return false;
  try {
    const { error } = await c.rpc('submit_score', {
      p_stage: stageId,
      p_score: Math.max(0, Math.floor(score)),
      p_distance: Math.max(0, Math.floor(distance)),
    });
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('[cloud] ส่งคะแนนไม่ได้', e.message || e);
    return false;
  }
}

/** บันทึกประวัติการสุ่มกาช่า ส่งทีเดียวทั้งชุดที่สุ่มรอบนั้น */
export async function pushPulls(rows) {
  const c = await client();
  if (!c || !uid || !rows.length) return false;
  try {
    const { error } = await c
      .from('pulls')
      .insert(rows.map((r) => ({ player_id: uid, ...r })));
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('[cloud] บันทึกประวัติการสุ่มไม่ได้', e.message || e);
    return false;
  }
}

/**
 * เปลี่ยนชื่อที่โชว์บนกระดานคะแนน
 * ใช้ update ไม่ใช่ upsert เพราะ upsert ที่ส่งมาแค่ชื่อ ถ้าบังเอิญยังไม่มีแถว
 * จะสร้างแถวใหม่แล้วรีเซ็ตทองกับชุดกลับเป็นค่าเริ่มต้นทั้งหมด
 */
export async function pushName(name) {
  const c = await client();
  if (!c || !uid) return false;
  try {
    const { error } = await c.from('players').update({ name }).eq('id', uid);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('[cloud] เปลี่ยนชื่อไม่ได้', e.message || e);
    return false;
  }
}

/** กระดานคะแนนของด่านหนึ่ง เรียงมากไปน้อย */
export async function fetchLeaderboard(stageId, limit = 20) {
  const c = await client();
  if (!c) return [];
  try {
    const { data, error } = await c
      .from('leaderboard')
      .select('name, score, distance')
      .eq('stage_id', stageId)
      .order('score', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn('[cloud] อ่านกระดานคะแนนไม่ได้', e.message || e);
    return [];
  }
}
