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
export const KEYS = {
  skin: SKIN_KEY,
  stage: STAGE_KEY,
  outfit: OUTFIT_KEY,
  bestPrefix: 'cookie-runner:best:',
  best: bestKey,
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

const OWNED_KEY = 'cookie-runner:owned';
const GOLD_KEY = 'cookie-runner:gold';
const GOLD_START = 999999;

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
