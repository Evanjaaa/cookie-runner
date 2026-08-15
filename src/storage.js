// src/storage.js
const KEY = 'cookie-runner:best';
const SKIN_KEY = 'cookie-runner:skin';

// ห่อ try/catch เพราะ localStorage ใช้ไม่ได้ในโหมดส่วนตัวของบางเบราว์เซอร์
// เซฟไม่ได้ก็ควรแค่ "ไม่เซฟ" ไม่ใช่ทำเกมพัง

export function loadBest() {
  try {
    return Number(localStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(value) {
  try {
    localStorage.setItem(KEY, String(value));
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
  } catch {
    /* ไม่ทำอะไร */
  }
}
