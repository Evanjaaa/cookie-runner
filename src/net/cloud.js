// src/net/cloud.js
// ─────────────────────────────────────────────────────────────
// ห่อ Supabase ไว้ชั้นเดียว ไฟล์นี้ไม่รู้จักกติกาเกมเลย
// รู้แค่ "ต่อฐานข้อมูล เข้าสู่ระบบ อ่านแถว เขียนแถว"
//
// กติกาสำคัญของทั้งไฟล์: ทุกฟังก์ชันห้ามโยน error ออกไป
// เน็ตหลุด คีย์ผิด โดนบล็อก — เกมต้องเล่นต่อได้ด้วยข้อมูลในเครื่องเสมอ
// ระบบคลาวด์เป็น "ของแถมที่ทำให้ข้ามเครื่องได้" ไม่ใช่สิ่งที่เกมขาดไม่ได้
// ─────────────────────────────────────────────────────────────
const URL = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** ไม่ได้ตั้งคีย์ = ทำงานแบบออฟไลน์ล้วน เหมือนก่อนมี Supabase ทุกประการ */
export const cloudReady = Boolean(URL && ANON);

let sb = null;
let uid = null;

/**
 * โหลด SDK แบบไดนามิก ไม่ใช่ import ไว้ด้านบนไฟล์
 *
 * ตัว SDK หนักราว 29KB gzip ซึ่งพอ ๆ กับตัวเกมทั้งเกม ถ้า import ไว้ด้านบน
 * คนที่เปิดเว็บตอนยังไม่ได้ตั้งคีย์ (หรือ build ที่ไม่ได้ตั้ง) ก็ต้องโหลดฟรี ๆ
 * ย้ายมาโหลดตอนใช้จริง Vite จะแยกเป็นไฟล์ต่างหากให้เอง
 */
async function client() {
  if (!cloudReady) return null;
  if (!sb) {
    const { createClient } = await import('@supabase/supabase-js');
    sb = createClient(URL, ANON, {
      auth: {
        persistSession: true,      // เก็บ session ไว้ กลับมาเปิดใหม่ได้บัญชีเดิม
        autoRefreshToken: true,
        detectSessionInUrl: false, // เกมไม่มี OAuth redirect ปิดไว้ลดงานตอนโหลด
      },
    });
  }
  return sb;
}

export function userId() {
  return uid;
}

/**
 * เข้าสู่ระบบแบบไม่ระบุตัวตน
 *
 * ครั้งแรกสร้างบัญชีให้เงียบ ๆ ครั้งต่อไปใช้ session เดิมที่เก็บไว้ในเครื่อง
 * ผู้เล่นไม่ต้องกรอกอะไรเลย แต่ได้ user id จริงที่ RLS เอาไปใช้กันคนอื่นแก้ข้อมูลได้
 *
 * ข้อแลกเปลี่ยน: ล้างข้อมูลเบราว์เซอร์ = เสีย session = กลายเป็นผู้เล่นใหม่
 * ถ้าอยากกู้คืนได้ต้องผูกอีเมลทีหลัง ซึ่ง Supabase รองรับอยู่แล้ว
 */
export async function signIn() {
  const c = await client();
  if (!c) return null;

  try {
    const { data: got } = await c.auth.getSession();
    if (got?.session?.user) {
      uid = got.session.user.id;
      return uid;
    }

    const { data, error } = await c.auth.signInAnonymously();
    if (error) throw error;
    uid = data.user?.id || null;
    return uid;
  } catch (e) {
    console.warn('[cloud] เข้าสู่ระบบไม่ได้ ใช้ข้อมูลในเครื่องต่อ', e.message || e);
    return null;
  }
}

/** อ่านแถวผู้เล่นของตัวเอง — คืน null ถ้าอ่านไม่ได้หรือยังไม่มีแถว */
export async function fetchPlayer() {
  const c = await client();
  if (!c || !uid) return null;
  try {
    const { data, error } = await c
      .from('players')
      .select('gold, owned, outfit, skin, stage, name')
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
