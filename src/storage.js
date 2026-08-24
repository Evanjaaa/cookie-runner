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
export const KEYS = {
  skin: SKIN_KEY,
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
