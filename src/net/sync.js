// src/net/sync.js
// ─────────────────────────────────────────────────────────────
// สะพานระหว่าง localStorage กับคลาวด์
//
// เกมทั้งเกมยังอ่านเขียน localStorage แบบทันที (synchronous) เหมือนเดิมทุกจุด
// ไม่มีตรงไหนต้องรอเน็ต ไม่มีตรงไหนต้องเปลี่ยนเป็น async — ไฟล์นี้ทำสองอย่าง:
//
//   ตอนเปิดเกม  ดึงข้อมูลจากคลาวด์มาเทลง localStorage ก่อนที่โมดูลเกมจะอ่าน
//   ระหว่างเล่น  เห็นว่ามีการเขียนลงเครื่องเมื่อไหร่ ก็ทยอยส่งขึ้นคลาวด์ตามหลัง
//
// ผลคือถ้าเน็ตหลุดหรือยังไม่ได้ตั้งคีย์ Supabase เกมทำงานเหมือนเดิมเป๊ะ
// แค่ไม่มีสำเนาบนคลาวด์เท่านั้น
// ─────────────────────────────────────────────────────────────
import { KEYS, onStorageWrite } from '../storage.js';
import {
  cloudReady, restoreSession, signInGuest,
  fetchPlayer, fetchBests, pushPlayer, pushScore, pushPulls,
} from './cloud.js';

// ชื่อคีย์ทุกตัวมาจาก storage.js ที่เดียว เคยประกาศซ้ำที่นี่แล้วเสี่ยงเพี้ยนจากกัน
const GOLD_KEY = KEYS.gold;
export const NAME_KEY = KEYS.name;
const OWNED_KEY = KEYS.owned;

// ค่าตั้งต้นของสองกระเป๋าเงิน ใช้ตัดสินว่า "แถวนี้ยังไม่เคยถูกแตะ" หรือยัง
const GEM_START = 300;
const GOLD_START = 999999;

const PUSH_DELAY = 900;   // ms รอรวมการเขียนหลาย ๆ ครั้งให้เป็นครั้งเดียว

const get = (k, d = '') => {
  try {
    const v = localStorage.getItem(k);
    return v === null ? d : v;
  } catch {
    return d;
  }
};
const set = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* โหมดส่วนตัวเขียนไม่ได้ ปล่อยผ่าน */
  }
};

/** รวบข้อมูลผู้เล่นทั้งหมดจากเครื่อง ให้อยู่ในรูปเดียวกับคอลัมน์ในตาราง */
/** อ่าน JSON จากเครื่อง — พังเมื่อไหร่ก็คืนค่าตั้งต้น ไม่ปล่อยให้ throw ขึ้นไป */
function readJson(key, fallback) {
  try {
    const raw = JSON.parse(get(key, ''));
    if (raw === null || typeof raw !== 'object') return fallback;
    if (Array.isArray(fallback) !== Array.isArray(raw)) return fallback;
    return raw;
  } catch {
    return fallback;
  }
}

/**
 * รวบทุกอย่างที่ต้องขึ้นคลาวด์จากเครื่อง ให้อยู่ในรูปเดียวกับคอลัมน์ในตาราง
 *
 * เพิ่มระบบใหม่เมื่อไหร่ต้องมาเติมที่นี่ด้วย ไม่งั้นของนั้นจะอยู่แต่ในเครื่อง
 * แล้วหายตอนผู้เล่นล้างข้อมูลเบราว์เซอร์ ทั้งที่ล็อกอินไว้แล้ว
 */
function readLocal() {
  return {
    gold: Number(get(GOLD_KEY, String(GOLD_START))) || 0,
    owned: readJson(OWNED_KEY, []),
    outfit: get(KEYS.outfit, 'none') || 'none',
    skin: get(KEYS.skin, 'orange') || 'orange',
    stage: get(KEYS.stage, 'night') || 'night',

    gems: Number(get(KEYS.gems, String(GEM_START))) || 0,
    treasures: readJson(KEYS.treasures, {}),
    equip: readJson(KEYS.equip, []),
    xp: Number(get(KEYS.xp, '0')) || 0,
    stats: readJson(KEYS.pref('stats'), {}),
    quests_claimed: readJson(KEYS.pref('questsClaimed'), []),
    mail: readJson(KEYS.pref('inbox'), []),
  };
}

/** สถิติทุกด่านที่มีอยู่ในเครื่อง อ่านจากชื่อคีย์ตรง ๆ จะได้ไม่ต้องรู้จักรายชื่อด่าน */
function readLocalBests() {
  const out = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(KEYS.bestPrefix)) {
        out[k.slice(KEYS.bestPrefix.length)] = Number(localStorage.getItem(k)) || 0;
      }
    }
  } catch {
    /* อ่านไม่ได้ก็ถือว่าไม่มี */
  }
  return out;
}

/**
 * เทข้อมูลจากคลาวด์ลงเครื่อง
 *
 * เขียนผ่าน set() ดิบ ๆ ไม่ใช่ผ่าน saveGems/saveTreasures ของ storage.js
 * โดยตั้งใจ — ตัวพวกนั้นจะปลุก onStorageWrite แล้วดันของที่เพิ่งดึงลงมา
 * กลับขึ้นไปทันที กลายเป็นเขียนวนฟรี ๆ ทุกครั้งที่เปิดเกม
 *
 * เขียนเฉพาะคอลัมน์ที่คลาวด์มีจริง (!= null) เผื่อฐานข้อมูลยังไม่ได้รัน
 * ALTER TABLE ตัวใหม่ — จะได้ไม่ล้างของในเครื่องทิ้งด้วยค่าว่างจากคอลัมน์ที่ไม่มี
 */
function writeLocal(row) {
  set(GOLD_KEY, String(Math.max(0, Math.floor(Number(row.gold) || 0))));
  set(OWNED_KEY, JSON.stringify(Array.isArray(row.owned) ? row.owned : []));
  if (row.name) set(NAME_KEY, row.name);
  if (row.outfit) set(KEYS.outfit, row.outfit);
  if (row.skin) set(KEYS.skin, row.skin);
  if (row.stage) set(KEYS.stage, row.stage);

  if (row.gems != null) set(KEYS.gems, String(Math.max(0, Math.floor(Number(row.gems) || 0))));
  if (row.xp != null) set(KEYS.xp, String(Math.max(0, Math.floor(Number(row.xp) || 0))));
  if (row.treasures != null) set(KEYS.treasures, JSON.stringify(row.treasures));
  if (Array.isArray(row.equip)) set(KEYS.equip, JSON.stringify(row.equip));
  if (row.stats != null) set(KEYS.pref('stats'), JSON.stringify(row.stats));
  if (Array.isArray(row.quests_claimed)) {
    set(KEYS.pref('questsClaimed'), JSON.stringify(row.quests_claimed));
  }
  if (Array.isArray(row.mail)) set(KEYS.pref('inbox'), JSON.stringify(row.mail));
}

/**
 * แถวบนคลาวด์ยังเป็นของใหม่เอี่ยมรึเปล่า
 *
 * ใช้ตัดสินตอนเปิดครั้งแรกว่าจะ "ดึงลง" หรือ "ดันขึ้น" — ถ้าดึงลงมั่ว ๆ
 * คนที่เล่นมานานในเครื่องก่อนมีระบบคลาวด์จะโดนล้างความคืบหน้าทิ้งทันที
 */
/**
 * แถวบนคลาวด์ยังเป็นของใหม่เอี่ยมรึเปล่า
 *
 * ต้องนับระบบใหม่ด้วย ไม่งั้นบัญชีที่มีแต่สมบัติ (ยังไม่เคยได้ชุดหรือทำสถิติ)
 * จะถูกตัดสินว่า "ว่าง" แล้วโดนของในเครื่องดันทับจนสมบัติบนคลาวด์หายหมด
 */
function cloudUntouched(row, bests) {
  const empty = (v) => !v || (Array.isArray(v) ? v.length : Object.keys(v).length) === 0;
  return empty(row.owned)
    && Number(row.gold) === GOLD_START
    && Object.keys(bests).length === 0
    && (row.gems == null || Number(row.gems) === GEM_START)
    && empty(row.treasures)
    && empty(row.quests_claimed)
    && !Number(row.xp);
}

/**
 * เครื่องนี้มีความคืบหน้าที่ยังไม่ได้ขึ้นคลาวด์ไหม
 *
 * ต้องนับระบบใหม่ด้วยเหมือนกัน ไม่งั้นคนที่เล่นแบบไม่ล็อกอินจนได้สมบัติมาเพียบ
 * (แต่ทองยังเป็นค่าตั้งต้นเพราะไม่ได้สุ่มชุด) พอล็อกอินครั้งแรกจะถูกมองว่า
 * "ไม่มีอะไร" แล้วโดนคลาวด์เทค่าว่างลงมาทับ ของหายทั้งหมด
 */
function localHasProgress(local, bests) {
  return local.owned.length > 0
    || local.gold !== GOLD_START
    || Object.values(bests).some((v) => v > 0)
    || local.gems !== GEM_START
    || Object.keys(local.treasures).length > 0
    || local.quests_claimed.length > 0
    || local.xp > 0
    || Object.values(local.stats).some((v) => Number(v) > 0);
}

// ── ดันข้อมูลขึ้น แบบหน่วงรวบ ────────────────────────────────

let timer = null;
let online = false;

function flush() {
  clearTimeout(timer);
  timer = null;
  if (online) pushPlayer(readLocal());
}

function schedule() {
  if (!online) return;
  clearTimeout(timer);
  timer = setTimeout(flush, PUSH_DELAY);
}

/** ให้ฝั่งกาช่าเรียกบันทึกประวัติได้ ไม่บังคับ ล้มเหลวก็ไม่กระทบอะไร */
export function recordPulls(results) {
  if (!online || !results?.length) return;
  pushPulls(results.map((r) => ({
    outfit_id: r.kind === 'gold' ? null : r.outfit.id,
    rarity: r.kind === 'gold' ? 'gold' : r.outfit.rarity,
    gold_won: r.gold || 0,
    is_new: Boolean(r.isNew),
  })));
}

/**
 * ล้างความคืบหน้าในเครื่องทิ้งทั้งหมด
 *
 * ใช้ตอนสลับบัญชี (เข้าด้วยอีเมล / ออกจากระบบ) เท่านั้น — คีย์ในเครื่องมีชุดเดียว
 * ใช้ร่วมกันทุกบัญชี ถ้าไม่ล้างก่อน ของบัญชีเก่าจะค้างปนกับของบัญชีใหม่
 * แล้วถูกดันขึ้นคลาวด์ตามหลังจนข้อมูลสองบัญชีปนกัน
 */
export function clearLocalProgress() {
  // ปิดการดันขึ้นคลาวด์ก่อนล้าง ไม่งั้นคิวที่ค้างอยู่ (หรือตัว pagehide ตอนโหลด
  // หน้าใหม่) จะดันของว่าง ๆ ขึ้นไปทับข้อมูลของบัญชีที่เพิ่งเข้ามาจนหายเกลี้ยง
  online = false;
  clearTimeout(timer);
  timer = null;

  try {
    // ต้องล้างของใหม่ด้วย ไม่งั้นสมบัติกับเพชรของบัญชีก่อนหน้าจะค้างอยู่
    // แล้วถูกดันขึ้นไปทับบัญชีที่เพิ่งเข้ามา
    const doomed = [
      GOLD_KEY, OWNED_KEY, NAME_KEY, KEYS.outfit, KEYS.skin, KEYS.stage,
      KEYS.gems, KEYS.treasures, KEYS.equip, KEYS.xp,
      KEYS.pref('stats'), KEYS.pref('questsClaimed'), KEYS.pref('inbox'),
    ];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(KEYS.bestPrefix)) doomed.push(k);
    }
    doomed.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ลบไม่ได้ก็ปล่อย ไม่ใช่เหตุให้เข้าสู่ระบบไม่สำเร็จ */
  }
}

// เข้าได้ทางเดียวเท่านั้นต่อการเปิดหน้าหนึ่งครั้ง — resume() ล้มเหลวแล้วผู้เล่น
// ค่อยกด startGuest() ทีหลังได้ แต่ห้ามผูก onStorageWrite ซ้ำสองรอบ
let hydrated = false;

/** งานหลังรู้แล้วว่าเข้าสู่ระบบสำเร็จ — เหมือนกันทั้งกู้ session เดิมและเพิ่งล็อกอิน */
async function hydrate() {
  if (hydrated) return true;
  hydrated = true;

  const [row, bests] = await Promise.all([fetchPlayer(), fetchBests()]);
  const local = readLocal();
  const localBests = readLocalBests();

  if (!row) {
    // ทริกเกอร์ยังสร้างแถวไม่ทัน หรือสร้างไม่สำเร็จ — ดันของในเครื่องขึ้นไปตั้งต้น
    online = true;
    await pushPlayer(local);
  } else if (cloudUntouched(row, bests) && localHasProgress(local, localBests)) {
    // ครั้งแรกของบัญชีนี้ แต่เครื่องมีความคืบหน้าอยู่ก่อนแล้ว → ย้ายขึ้นไป
    online = true;
    await pushPlayer(local);
    for (const [stageId, score] of Object.entries(localBests)) {
      if (score > 0) await pushScore(stageId, score, 0);
    }
  } else {
    // กรณีปกติ: คลาวด์คือความจริง เทลงเครื่องก่อนเกมจะเริ่มอ่าน
    writeLocal(row);
    for (const [stageId, score] of Object.entries(bests)) {
      set(KEYS.best(stageId), String(score));
    }
    online = true;
  }

  onStorageWrite((kind, arg) => {
    if (kind === 'best') {
      // สถิติส่งทันที ไม่ต้องรอรวบ เพราะเกิดตอนจบรอบซึ่งนาน ๆ ที
      pushScore(arg.stageId, arg.value, arg.distance);
      return;
    }
    schedule();
  });

  // ปิดแท็บหรือสลับแอปตอนยังรวบไม่ครบ ต้องรีบส่งก่อน ไม่งั้นตกหล่น
  for (const ev of ['pagehide', 'visibilitychange']) {
    window.addEventListener(ev, () => {
      if (ev === 'visibilitychange' && !document.hidden) return;
      if (timer) flush();
    });
  }

  return true;
}

/**
 * เรียกครั้งเดียวตอนเปิดหน้า ก่อนโหลดตัวเกม
 *
 * กู้เฉพาะ session ที่มีอยู่แล้ว ไม่สร้างบัญชีใหม่ให้ — คนที่ยังไม่เคยเข้าสู่ระบบ
 * จะได้ false แล้วไปเจอหน้าเข้าสู่ระบบใน main.js
 * คืน true เมื่อดึงข้อมูลจากคลาวด์ลงเครื่องเรียบร้อยแล้ว
 */
export async function resume() {
  if (!cloudReady) return false;
  const id = await restoreSession();
  if (!id) return false;
  return hydrate();
}

/**
 * ผู้เล่นกดปุ่ม "เล่นแบบผู้มาเยือน" — สร้างบัญชีแล้วซิงก์ให้เลย
 *
 * บัญชีที่เพิ่งสร้างยังไม่มีข้อมูลอะไรบนคลาวด์ hydrate() จึงเข้าทาง "ดันของ
 * ในเครื่องขึ้นไป" ไม่ใช่ "เทลงมาทับ" — โมดูลเกมที่อ่าน localStorage ไปแล้ว
 * ตั้งแต่ตอนโหลดจึงไม่มีทางถือค่าเก่าค้าง ไม่ต้องโหลดหน้าใหม่
 */
export async function startGuest() {
  if (!cloudReady) return { ok: false, error: 'ยังไม่ได้ตั้งค่าฐานข้อมูล' };
  const r = await signInGuest();
  if (!r.ok) return r;
  await hydrate();
  return { ok: true };
}
