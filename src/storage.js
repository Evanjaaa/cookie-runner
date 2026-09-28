// src/storage.js
//
// localStorage เป็นแหล่งข้อมูลหลักที่เกมอ่านเขียนตลอดเวลา — เร็ว ไม่ต้องรอเน็ต
// และเล่นได้แม้ออฟไลน์ ส่วนคลาวด์ทำหน้าที่ "สำเนาถาวรที่ข้ามเครื่องได้"
// ซึ่งซิงก์ทีหลังแบบไม่ขวางการเล่น (ดู net/sync.js)
//
// ไฟล์นี้จึงไม่รู้จัก Supabase เลย รู้แค่ว่า "เขียนอะไรไปแล้วต้องบอกใครสักคน"
// ผ่าน onStorageWrite เพื่อไม่ให้เกิดการอ้างอิงวนกันระหว่างสองไฟล์
const KEY = 'cookie-runner:best';          // ของเดิม สมัยยังมีด่านเดียว
const SKIN_KEY = 'cookie-runner:skin';
const STAGE_KEY = 'cookie-runner:stage';
const bestKey = (stageId) => `cookie-runner:best:${stageId}`;
const OUTFIT_KEY = 'cookie-runner:outfit';

// ห่อ try/catch เพราะ localStorage ใช้ไม่ได้ในโหมดส่วนตัวของบางเบราว์เซอร์
// เซฟไม่ได้ก็ควรแค่ "ไม่เซฟ" ไม่ใช่ทำเกมพัง

/**
 * สถิติแยกตามด่าน
 *
 * ตอนมีด่านเดียวเก็บไว้ที่คีย์เดียว พอแยกด่านแล้วถ้าเปลี่ยนคีย์เฉย ๆ
 * สถิติเดิมของผู้เล่นจะหายทันที จึงย้ายค่าเก่าไปเป็นของด่านแรกให้ครั้งเดียว
 * แล้วลบคีย์เก่าทิ้ง เพื่อไม่ให้ย้ายซ้ำทับสถิติใหม่ที่ทำได้ทีหลัง
 */
/**
 * ชื่อคีย์ทั้งหมดอยู่ที่นี่ที่เดียว
 *
 * ชั้นซิงก์ (net/sync.js) ต้องอ่าน/เขียนคีย์พวกนี้ตรง ๆ เพื่อ "เท" ข้อมูลจาก
 * คลาวด์ลงเครื่องโดยไม่ให้ไปกระตุ้น onStorageWrite (ไม่งั้นจะดันกลับขึ้นไปทันที
 * ที่เพิ่งดึงลงมา) จึงต้องรู้จักชื่อคีย์ — ให้รู้จักผ่านที่นี่ ไม่ใช่ประกาศซ้ำ
 * ซึ่งเคยเป็นแบบนั้นแล้วมีโอกาสเพี้ยนจากกันเงียบ ๆ ตอนใครไปแก้ข้างเดียว
 */
const SKINS_OWNED_KEY = 'cookie-runner:skinsOwned';

export const KEYS = {
  skin: SKIN_KEY,
  skinsOwned: SKINS_OWNED_KEY,
  stage: STAGE_KEY,
  outfit: OUTFIT_KEY,
  bestPrefix: 'cookie-runner:best:',
  best: bestKey,
  gold: 'cookie-runner:gold',
  owned: 'cookie-runner:owned',
  gems: 'cookie-runner:gems',
  treasures: 'cookie-runner:treasures',
  equip: 'cookie-runner:equip',
  xp: 'cookie-runner:xp',
  name: 'cookie-runner:name',
  /** ค่าที่เก็บผ่าน loadPref/savePref — stats, questsClaimed, inbox */
  pref: (k) => 'cookie-runner:pref:' + k,
};

// ─────────────────────────────────────────────────────────────
// ข้อมูลของบัญชี vs ค่าของเครื่อง — ใช้ตอนออกจากระบบ / สลับบัญชี
//
// ── ทำไมกลับด้าน (ล้างทุกอย่าง เว้นค่าของเครื่อง) ──
// เดิมล้างตาม "รายชื่อของที่ต้องล้าง" แล้วทุกระบบที่เพิ่มทีหลัง (สเตตัส แมวที่ปลดล็อก
// การ์ดพรสวรรค์ สกิล รางวัลเลเวล เช็คอินรายวัน รูปหน้า ฯลฯ) ไม่มีใครมาเติมรายชื่อ
// ออกจากบัญชีแล้วสร้างบัญชีใหม่ ของพวกนั้นเลยติดไปกับบัญชีใหม่ — ผู้เล่นเจอจริง
// ตอนนี้ล้าง "ทุกคีย์ของเกม" แล้วเว้นเฉพาะค่าของเครื่องในรายการข้างล่าง
// ระบบใหม่ที่เพิ่มในอนาคตจึงถูกล้างให้เองโดยไม่ต้องจำ — พลาดแบบนี้ไม่ได้อีก
// (ถ้าระบบใหม่เป็นค่าของเครื่องจริง ๆ ค่อยมาเติมใน DEVICE_KEYS)
// ─────────────────────────────────────────────────────────────
const NS = 'cookie-runner:';
const STASH_PREFIX = NS + 'stash:';

/** ค่าของ "เครื่อง" ไม่ใช่ของบัญชี — ออกจากระบบแล้วคงไว้ */
const DEVICE_KEYS = new Set([
  NS + 'vol', NS + 'vol:music', NS + 'vol:sfx',   // ระดับเสียง
  NS + 'dbg-open',                                // แผงทดสอบเปิดค้างไว้ไหม
  KEYS.pref('gfx'), KEYS.pref('lang'),            // ระดับกราฟิก / ภาษา
  KEYS.pref('introVideo'), KEYS.pref('introSound'),
]);

/**
 * ของที่คลาวด์เก็บให้แล้ว (ดู readLocal ใน net/sync.js) — เข้าบัญชีเดิมอีกครั้งก็ดึงกลับลงมาเอง
 * ไม่ต้องฝากไว้ในเครื่อง และห้ามฝาก: ของที่ฝากไว้อาจเก่ากว่าบนคลาวด์ แล้วไปทับของใหม่
 */
function syncedByCloud(k) {
  return k.startsWith(KEYS.bestPrefix) || [
    KEYS.gold, KEYS.owned, KEYS.outfit, KEYS.skin, KEYS.stage, KEYS.gems, KEYS.treasures,
    KEYS.equip, KEYS.xp, KEYS.name,
    KEYS.pref('stats'), KEYS.pref('questsClaimed'), KEYS.pref('inbox'),
  ].includes(k);
}

/**
 * ของบัญชีที่ตั้งใจไม่ขึ้นคลาวด์
 *   face / faceOn  รูปหน้าน้อง — หน้าเกมบอกผู้เล่นว่า "เก็บในเครื่องนี้เท่านั้น ไม่ส่งขึ้นเซิร์ฟเวอร์"
 *   myCatPaint     ภาพที่ระบายเอง เป็นไฟล์รูป PNG ก้อนใหญ่ ส่งซ้ำทุกครั้งที่ซิงก์ไม่คุ้ม
 * (สองอย่างนี้ยังตามบัญชีอีเมลได้ในเครื่องเดิม ผ่านการฝากตอนออกจากระบบ — ดู wipeAccountData)
 */
const LOCAL_ONLY = new Set([NS + 'face', NS + 'faceOn', KEYS.pref('myCatPaint')]);

/** คีย์ทั้งหมดที่เป็นข้อมูลของบัญชีที่เล่นอยู่ในเครื่องตอนนี้ */
function accountKeys() {
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(NS) || k.startsWith(STASH_PREFIX) || DEVICE_KEYS.has(k)) continue;
    out.push(k);
  }
  return out;
}

/**
 * ข้อมูลบัญชีที่ยังไม่มีคอลัมน์ของตัวเองบนคลาวด์ — ขึ้นไปเป็นก้อนเดียวในคอลัมน์ players.extra
 * (แมวที่ปลดล็อก รางวัลเลเวลที่รับแล้ว การ์ดที่เลือก สเตตัส เช็คอิน ฯลฯ และระบบใหม่ในอนาคตทุกตัว)
 * คืน { ชื่อคีย์ไม่มีคำนำหน้า: ค่าดิบที่เก็บไว้ } — เก็บค่าดิบ ไม่แปลง เขียนกลับได้ตรงตัว
 */
export function readAccountExtras() {
  const out = {};
  try {
    for (const k of accountKeys()) {
      if (syncedByCloud(k) || LOCAL_ONLY.has(k)) continue;
      out[k.slice(NS.length)] = localStorage.getItem(k);
    }
  } catch { /* อ่านไม่ได้ก็ส่งเท่าที่ได้ */ }
  return out;
}

/**
 * เทก้อน extra จากคลาวด์ลงเครื่อง — คลาวด์เป็นความจริงเหมือนคอลัมน์อื่น
 * ยกเว้นรายการสะสม (array) ที่รวมของสองฝั่ง เช่นแมวที่ปลดล็อก รางวัลเลเวลที่รับแล้ว:
 * เครื่องนี้อาจปลดล็อกเพิ่มตอนออฟไลน์แล้วยังไม่ได้ส่งขึ้น ถ้าให้คลาวด์ทับตรง ๆ ของที่ได้มาจะหาย
 * เขียนด้วย localStorage ตรง ๆ ไม่ผ่าน savePref — ไม่ปลุกการซิงก์ให้ดันของเดิมกลับขึ้นไปฟรี ๆ
 */
export function writeAccountExtras(extra) {
  if (!extra || typeof extra !== 'object') return;
  try {
    for (const [short, raw] of Object.entries(extra)) {
      if (typeof raw !== 'string') continue;
      const k = NS + short;
      if (!k.startsWith(NS) || DEVICE_KEYS.has(k) || LOCAL_ONLY.has(k) || syncedByCloud(k)) continue;
      const mine = localStorage.getItem(k);
      let value = raw;
      if (mine !== null) {
        try {
          const a = JSON.parse(mine);
          const b = JSON.parse(raw);
          if (Array.isArray(a) && Array.isArray(b)) {
            const seen = new Set(b.map((x) => JSON.stringify(x)));
            value = JSON.stringify([...b, ...a.filter((x) => !seen.has(JSON.stringify(x)))]);
          }
        } catch { /* ไม่ใช่ JSON = ค่าธรรมดา ใช้ของคลาวด์ */ }
      }
      localStorage.setItem(k, value);
    }
  } catch { /* เขียนไม่ได้ก็เล่นต่อด้วยของในเครื่อง */ }
}

/**
 * ล้างข้อมูลของบัญชีออกจากเครื่องทั้งหมด (ค่าของเครื่องยังอยู่)
 *
 * @param stashFor user id ของบัญชีที่กำลังออก — ส่งมาเฉพาะบัญชีที่กลับเข้ามาได้อีก (ผูกอีเมลแล้ว)
 *   ของที่มีแต่ในเครื่อง (ยังไม่ขึ้นคลาวด์ เช่นแมวที่ปลดล็อก รางวัลเลเวลที่รับแล้ว สเตตัส)
 *   จะถูกฝากไว้ใต้ id นั้น แล้วคืนให้ตอนเข้าบัญชีเดิมอีกครั้ง (restoreAccountStash)
 *   บัญชีอื่นที่เข้ามาใช้เครื่องนี้มองไม่เห็นของที่ฝากไว้
 *   ผู้มาเยือนไม่ส่งมา — ออกแล้วกลับเข้าบัญชีเดิมไม่ได้อยู่แล้ว ฝากไว้ก็ค้างเปล่า ๆ
 */
export function wipeAccountData(stashFor = null) {
  try {
    const keys = accountKeys();
    if (stashFor) {
      const kept = {};
      for (const k of keys) if (!syncedByCloud(k)) kept[k] = localStorage.getItem(k);
      if (Object.keys(kept).length) localStorage.setItem(STASH_PREFIX + stashFor, JSON.stringify(kept));
    }
    for (const k of keys) localStorage.removeItem(k);
  } catch {
    /* ลบไม่ได้ก็ปล่อย ไม่ใช่เหตุให้ออกจากระบบไม่สำเร็จ */
  }
}

/**
 * คืนของที่ฝากไว้ตอนออกจากบัญชีนี้ครั้งก่อน — เรียกตอนรู้แล้วว่าเข้าบัญชีไหน ก่อนเกมอ่านค่า
 * ของที่อยู่ในเครื่องแล้วไม่ทับ (เครื่องใหม่กว่าเสมอ) แล้วลบก้อนฝากทิ้ง
 */
export function restoreAccountStash(uid) {
  if (!uid) return;
  try {
    const raw = localStorage.getItem(STASH_PREFIX + uid);
    if (!raw) return;
    const kept = JSON.parse(raw) || {};
    for (const [k, v] of Object.entries(kept)) {
      if (typeof v === 'string' && localStorage.getItem(k) === null) localStorage.setItem(k, v);
    }
    localStorage.removeItem(STASH_PREFIX + uid);
  } catch {
    /* อ่านไม่ได้ก็เล่นต่อแบบไม่มีของฝาก */
  }
}

let writeHook = null;

/** ให้ชั้นซิงก์มาสมัครรับรู้ว่ามีการเขียนอะไรลงเครื่อง */
export function onStorageWrite(fn) {
  writeHook = fn;
}

function wrote(kind, arg) {
  if (writeHook) {
    try {
      writeHook(kind, arg);
    } catch {
      /* ซิงก์พังห้ามลามมาทำให้เซฟในเครื่องพัง */
    }
  }
}

export function loadBest(stageId) {
  try {
    const own = Number(localStorage.getItem(bestKey(stageId))) || 0;
    if (own > 0) return own;

    const legacy = Number(localStorage.getItem(KEY)) || 0;
    if (legacy > 0 && stageId === 'night') {
      localStorage.setItem(bestKey(stageId), String(legacy));
      localStorage.removeItem(KEY);
      return legacy;
    }
    return own;
  } catch {
    return 0;
  }
}

export function saveBest(stageId, value, distance = 0) {
  try {
    localStorage.setItem(bestKey(stageId), String(value));
    wrote('best', { stageId, value, distance });
  } catch {
    /* ไม่ทำอะไร */
  }
}

export function loadStage() {
  try {
    return localStorage.getItem(STAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function saveStage(id) {
  try {
    localStorage.setItem(STAGE_KEY, id);
    wrote('stage');
  } catch {
    /* ไม่ทำอะไร */
  }
}

/** ชุดเก็บค่าเดียว ใช้ร่วมกันทุกสีขน เพราะเป็นตัวละครเดียวกันแค่เปลี่ยนสี */
export function loadOutfit() {
  try {
    return localStorage.getItem(OUTFIT_KEY) || '';
  } catch {
    return '';
  }
}

const OWNED_KEY = KEYS.owned;
const GOLD_KEY = KEYS.gold;
const GOLD_START = 999999;

// ── ค่าประสบการณ์ ────────────────────────────────────────────
// อยู่ที่นี่ไม่ใช่ใน progress.js เพราะทุกอย่างที่ต้องขึ้นคลาวด์ต้องผ่าน wrote()
// ส่วน progress.js รับผิดชอบ "สูตรคำนวณเลเวล" ซึ่งไม่เกี่ยวกับการเก็บลงเครื่อง

export function loadXp() {
  try {
    return Math.max(0, Number(localStorage.getItem(KEYS.xp)) || 0);
  } catch {
    return 0;
  }
}

export function saveXp(n) {
  try {
    localStorage.setItem(KEYS.xp, String(Math.max(0, Math.floor(n))));
    wrote('xp');
  } catch {
    /* โหมดส่วนตัวเขียนไม่ได้ ปล่อยผ่าน — เลเวลหายดีกว่าเกมพัง */
  }
}

export function loadOwned() {
  try {
    const raw = JSON.parse(localStorage.getItem(OWNED_KEY));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function saveOwned(list) {
  try {
    localStorage.setItem(OWNED_KEY, JSON.stringify(list));
    wrote('owned');
  } catch {
    /* ไม่ทำอะไร */
  }
}

/**
 * ยังไม่มีวิธีหาทองในเกม จึงแจกก้อนตั้งต้นให้ครั้งแรกที่เปิดเท่านั้น
 * เช็คด้วย null ไม่ใช่ค่าความจริง ไม่งั้นคนที่ใช้ทองหมดจะได้ก้อนใหม่ทุกครั้งที่รีเฟรช
 */
export function loadGold() {
  try {
    const raw = localStorage.getItem(GOLD_KEY);
    if (raw === null) {
      localStorage.setItem(GOLD_KEY, String(GOLD_START));
      return GOLD_START;
    }
    return Number(raw) || 0;
  } catch {
    return GOLD_START;
  }
}

export function saveGold(n) {
  try {
    localStorage.setItem(GOLD_KEY, String(Math.max(0, Math.floor(n))));
    wrote('gold');
  } catch {
    /* ไม่ทำอะไร */
  }
}

export function saveOutfit(id) {
  try {
    localStorage.setItem(OUTFIT_KEY, id);
    wrote('outfit');
  } catch {
    /* ไม่ทำอะไร */
  }
}

// ── ระบบสมบัติ ──────────────────────────────────────────────
// เพชรชมพู = เงินของตู้สมบัติ คนละกระเป๋ากับเหรียญทองที่ใช้กับตู้ชุด
// เก็บสมบัติเป็น { id: ขั้นตีบวก } ไม่ใช่แค่รายการ id เพราะขั้นตีบวกเป็นของ
// ติดตัวสมบัติชิ้นนั้น ไม่ใช่ของผู้เล่นรวม ๆ

const GEM_KEY = 'cookie-runner:gems';
const TRE_KEY = 'cookie-runner:treasures';
const EQUIP_KEY = 'cookie-runner:equip';

// ── ค่าตั้งเล็ก ๆ ของหน้าจอ ──────────────────────────────────
// พวกตัวเลือกที่ไม่ใช่ "ความคืบหน้าในเกม" เช่น เรียงการ์ดแบบไหน ติ๊กกรองไว้ไหม
// ใช้ฟังก์ชันกลางคู่เดียวแทนการเขียน load/save แยกทีละอัน เพราะของกลุ่มนี้
// จะงอกเพิ่มเรื่อย ๆ ทุกครั้งที่มีหน้าใหม่ ถ้าแยกทีละคู่ไฟล์นี้จะบวมโดยไม่ได้อะไร
//
// พังแล้วไม่ต้องกู้ — เสียอย่างมากคือกลับไปเรียงแบบตั้งต้น ไม่ใช่ของหาย
export function loadPref(key, fallback) {
  try {
    const raw = localStorage.getItem(KEYS.pref(key));
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function savePref(key, value) {
  try {
    localStorage.setItem(KEYS.pref(key), JSON.stringify(value));
    // ของกลุ่มนี้ไม่ได้มีแต่ค่าตั้งหน้าจอแล้ว — stats/questsClaimed/inbox
    // คือความคืบหน้าจริงที่ต้องขึ้นคลาวด์ จึงต้องปลุกชั้นซิงก์ด้วย
    // ตัวที่เป็นค่าตั้งจอจริง ๆ ก็แค่ถูกดันขึ้นไปฟรี ๆ ซึ่งไม่เสียหายอะไร
    wrote('pref', key);
  } catch {
    /* เซฟไม่ได้ก็แค่ไม่จำข้ามรอบ ไม่ใช่เหตุให้กดไม่ได้ */
  }
}

// เพชรตั้งต้น พอสุ่มได้สองครั้งพอดี ให้ได้ลองระบบก่อนโดยไม่ต้องรอกิจกรรม
// (ยังไม่มีทางหาเพชรในเกม — จะมาพร้อมระบบเควสทีหลัง)
const GEM_START = 300;

export function loadGems() {
  try {
    const raw = localStorage.getItem(GEM_KEY);
    if (raw === null) {
      localStorage.setItem(GEM_KEY, String(GEM_START));
      return GEM_START;
    }
    return Math.max(0, Number(raw) || 0);
  } catch {
    return GEM_START;
  }
}

export function saveGems(n) {
  try {
    localStorage.setItem(GEM_KEY, String(Math.max(0, Math.floor(n))));
    wrote('gems');
  } catch {
    /* ไม่ทำอะไร */
  }
}

/** คืน { id: level } — level 0 คือมีแล้วแต่ยังไม่ได้ตีบวก */
export function loadTreasures() {
  try {
    const raw = JSON.parse(localStorage.getItem(TRE_KEY));
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out = {};
    for (const [k, v] of Object.entries(raw)) out[k] = Math.max(0, Number(v) || 0);
    return out;
  } catch {
    return {};
  }
}

export function saveTreasures(map) {
  try {
    localStorage.setItem(TRE_KEY, JSON.stringify(map));
    wrote('treasures');
  } catch {
    /* ไม่ทำอะไร */
  }
}

/** รายการ id ที่ติดตั้งอยู่ เรียงตามช่อง — ช่องว่างเก็บเป็น null */
export function loadEquip() {
  try {
    const raw = JSON.parse(localStorage.getItem(EQUIP_KEY));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function saveEquip(list) {
  try {
    localStorage.setItem(EQUIP_KEY, JSON.stringify(list));
    wrote('equip');
  } catch {
    /* ไม่ทำอะไร */
  }
}

/** คืนค่าว่าง ๆ ถ้าไม่เคยเลือก ให้ฝั่ง skins.js ตัดสินใจว่าตัวไหนคือค่าเริ่มต้น */
export function loadSkin() {
  try {
    return localStorage.getItem(SKIN_KEY) || '';
  } catch {
    return '';
  }
}

export function saveSkin(id) {
  try {
    localStorage.setItem(SKIN_KEY, id);
    wrote('skin');
  } catch {
    /* ไม่ทำอะไร */
  }
}

/**
 * รายชื่อแมวที่ปลดล็อกแล้ว — เก็บเฉพาะตัวที่ต้องซื้อ
 *
 * ตัวที่แจกฟรีตั้งแต่แรกไม่ต้องอยู่ในนี้ ฝั่ง skins.js ดูจาก cost เอาเอง
 * เก็บแบบนี้เพื่อให้เพิ่มแมวฟรีตัวใหม่ได้โดยไม่ต้องไปแก้ข้อมูลเก่าของผู้เล่น
 */
export function loadSkinsOwned() {
  try {
    const raw = JSON.parse(localStorage.getItem(SKINS_OWNED_KEY));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function saveSkinsOwned(list) {
  try {
    localStorage.setItem(SKINS_OWNED_KEY, JSON.stringify(list));
    wrote('skinsOwned');
  } catch {
    /* ไม่ทำอะไร */
  }
}
